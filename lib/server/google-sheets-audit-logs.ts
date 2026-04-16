import "server-only"

import { google } from "googleapis"
import type { AuditLog } from "@/lib/server/persistent-store"

const AUDIT_LOGS_SHEET_PRIMARY_NAME = "audit_logs"
const AUDIT_LOGS_SHEET_CANDIDATES = ["audit_logs", "audit_log", "auditlogs"]
const AUDIT_LOGS_COLUMNS = [
  "id",
  "actor_id",
  "action",
  "entity_name",
  "entity_id",
  "old_value_json",
  "new_value_json",
  "created_at",
  "updated_at",
]

const AUDIT_LOGS_READY_TTL_MS = 5 * 60_000
const AUDIT_LOGS_CACHE_TTL_MS = 60_000

let auditLogsSheetReadyAt = 0
let auditLogsSheetName = AUDIT_LOGS_SHEET_PRIMARY_NAME
let auditLogsCache: { expiresAt: number; data: AuditLog[] } | null = null

type ServiceAccount = {
  client_email: string
  private_key: string
}

function parseServiceAccount(raw: string): ServiceAccount {
  const parsed = JSON.parse(raw)
  const clientEmail = String(parsed.client_email || "")
  const privateKey = String(parsed.private_key || "").replace(/\\n/g, "\n")

  if (!clientEmail || !privateKey) {
    throw new Error("Service account tidak valid. Pastikan client_email dan private_key tersedia.")
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
  }
}

async function getServiceAccount(): Promise<ServiceAccount> {
  const fromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!fromEnv) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON belum di-set.")
  }

  return parseServiceAccount(fromEnv)
}

function getSpreadsheetId() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID belum di-set.")
  }

  return spreadsheetId
}

async function getSheetsClient() {
  const serviceAccount = await getServiceAccount()
  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  return google.sheets({ version: "v4", auth })
}

function resolveExistingSheetName(existingTitles: Set<string>, candidates: string[], fallback: string) {
  return candidates.find((title) => existingTitles.has(title)) || fallback
}

function normalizeMaybeString(value: unknown) {
  const next = String(value || "")
  return next.trim()
}

function normalizeAuditAction(value: unknown): AuditLog["action"] {
  const next = String(value || "").trim().toUpperCase()
  if (next === "UPDATE" || next === "DELETE" || next === "LOGIN" || next === "LOGOUT") {
    return next
  }
  return "CREATE"
}

function normalizeAuditLog(input: AuditLog): AuditLog {
  const now = new Date().toISOString()

  return {
    id: String(input.id || `audit-${Date.now()}`).trim(),
    actorId: String(input.actorId || "system").trim() || "system",
    action: normalizeAuditAction(input.action),
    entityName: String(input.entityName || "-").trim() || "-",
    entityId: String(input.entityId || "-").trim() || "-",
    oldValueJson: normalizeMaybeString(input.oldValueJson),
    newValueJson: normalizeMaybeString(input.newValueJson),
    createdAt: String(input.createdAt || now).trim() || now,
  }
}

function normalizeAuditLogRow(row: string[]): AuditLog {
  return normalizeAuditLog({
    id: String(row[0] || "").trim(),
    actorId: String(row[1] || "").trim(),
    action: normalizeAuditAction(row[2]),
    entityName: String(row[3] || "").trim(),
    entityId: String(row[4] || "").trim(),
    oldValueJson: String(row[5] || ""),
    newValueJson: String(row[6] || ""),
    createdAt: String(row[7] || "").trim(),
  })
}

function toAuditLogSheetRow(log: AuditLog, updatedAt: string) {
  return [
    log.id,
    log.actorId,
    log.action,
    log.entityName,
    log.entityId,
    log.oldValueJson,
    log.newValueJson,
    log.createdAt,
    updatedAt,
  ]
}

function invalidateAuditLogsCache() {
  auditLogsCache = null
}

export async function ensureAuditLogsSheetReady() {
  if (Date.now() - auditLogsSheetReadyAt < AUDIT_LOGS_READY_TTL_MS) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const existingTitles = new Set(
    (spreadsheet.data.sheets || [])
      .map((sheet) => String(sheet.properties?.title || ""))
      .filter(Boolean),
  )

  auditLogsSheetName = resolveExistingSheetName(existingTitles, AUDIT_LOGS_SHEET_CANDIDATES, AUDIT_LOGS_SHEET_PRIMARY_NAME)
  if (!existingTitles.has(auditLogsSheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: auditLogsSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${auditLogsSheetName}!A1:I1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length !== AUDIT_LOGS_COLUMNS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${auditLogsSheetName}!A1:I1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [AUDIT_LOGS_COLUMNS],
      },
    })
  }

  auditLogsSheetReadyAt = Date.now()
}

export async function getAllDbAuditLogsFromSheet(): Promise<AuditLog[]> {
  if (auditLogsCache && auditLogsCache.expiresAt > Date.now()) {
    return auditLogsCache.data
  }

  await ensureAuditLogsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${auditLogsSheetName}!A2:I`,
  })

  const rows = rowsRes.data.values || []
  const data = rows
    .map((row) => normalizeAuditLogRow(row as string[]))
    .filter((item) => Boolean(item.id))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))

  auditLogsCache = {
    expiresAt: Date.now() + AUDIT_LOGS_CACHE_TTL_MS,
    data,
  }

  return data
}

export async function appendDbAuditLogToSheet(input: AuditLog): Promise<AuditLog> {
  const next = normalizeAuditLog(input)

  await ensureAuditLogsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const updatedAt = new Date().toISOString()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${auditLogsSheetName}!A:I`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toAuditLogSheetRow(next, updatedAt)],
    },
  })

  invalidateAuditLogsCache()
  return next
}

export async function migrateDbAuditLogsToSheet(sourceLogs: AuditLog[]) {
  const candidates = Array.isArray(sourceLogs) ? sourceLogs : []
  if (candidates.length === 0) {
    return getAllDbAuditLogsFromSheet()
  }

  const existing = await getAllDbAuditLogsFromSheet()
  const existingIds = new Set(existing.map((item) => item.id))
  const missing = candidates
    .map((item) => normalizeAuditLog(item))
    .filter((item) => Boolean(item.id && !existingIds.has(item.id)))

  if (missing.length === 0) {
    return existing
  }

  await ensureAuditLogsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const updatedAt = new Date().toISOString()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${auditLogsSheetName}!A:I`,
    valueInputOption: "RAW",
    requestBody: {
      values: missing.map((item) => toAuditLogSheetRow(item, updatedAt)),
    },
  })

  invalidateAuditLogsCache()
  return getAllDbAuditLogsFromSheet()
}

export async function loadDbAuditLogsWithMigration(localLogs: AuditLog[]) {
  try {
    const fromSheet = await getAllDbAuditLogsFromSheet()
    if (fromSheet.length > 0) {
      return fromSheet
    }

    if (!Array.isArray(localLogs) || localLogs.length === 0) {
      return fromSheet
    }

    return await migrateDbAuditLogsToSheet(localLogs)
  } catch {
    return Array.isArray(localLogs) ? localLogs : []
  }
}
