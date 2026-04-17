import "server-only"

import { google } from "googleapis"
import type { PiketSchedule } from "@/lib/data-model"

const PIKET_SCHEDULE_SHEET_PRIMARY_NAME = "piket_schedule"
const PIKET_SCHEDULE_SHEET_CANDIDATES = ["piket_schedule", "piket_schedules", "piketschedule"]
const PIKET_SCHEDULE_COLUMNS = ["id", "class_id", "day", "student_ids", "created_by", "updated_at", "teacher_id"]

const PIKET_SCHEDULE_READY_TTL_MS = 5 * 60_000
const PIKET_SCHEDULE_CACHE_TTL_MS = 60_000

let piketScheduleSheetReadyAt = 0
let piketScheduleSheetName = PIKET_SCHEDULE_SHEET_PRIMARY_NAME
let piketSchedulesCache: { expiresAt: number; data: PiketSchedule[] } | null = null

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
  const rawSpreadsheetId = String(process.env.GOOGLE_SHEETS_ID || "").trim()
  if (!rawSpreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID belum di-set.")
  }

  const normalized = rawSpreadsheetId.replace(/^['\"]|['\"]$/g, "").trim()
  const directMatch = normalized.match(/^[A-Za-z0-9_-]{15,}$/)
  if (directMatch) {
    return directMatch[0]
  }

  const pathMatch = normalized.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{15,})/i)
  if (pathMatch?.[1]) {
    return pathMatch[1]
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsedUrl = new URL(normalized)
      const queryId = String(parsedUrl.searchParams.get("id") || "").trim()
      if (/^[A-Za-z0-9_-]{15,}$/.test(queryId)) {
        return queryId
      }

      const pathnameMatch = String(parsedUrl.pathname || "").match(/\/d\/([A-Za-z0-9_-]{15,})/i)
      if (pathnameMatch?.[1]) {
        return pathnameMatch[1]
      }
    } catch {
      // Continue to explicit validation error below.
    }
  }

  throw new Error("GOOGLE_SHEETS_ID tidak valid. Gunakan Spreadsheet ID atau URL Google Sheets yang benar.")
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

function parseStudentIds(value: unknown): string[] {
  const raw = String(value || "").trim()
  if (!raw) return []

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean)
      }
    } catch {
      // Fallback to comma-separated parser.
    }
  }

  return raw
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean)
}

function normalizeStudentIds(input: unknown[]) {
  return [...new Set(input.map((item) => String(item || "").trim()).filter(Boolean))]
}

function normalizePiketSchedule(input: PiketSchedule): PiketSchedule {
  return {
    id: String(input.id || `pk-${Date.now()}`).trim(),
    classId: String(input.classId || "").trim(),
    day: String(input.day || "").trim(),
    studentIds: normalizeStudentIds(Array.isArray(input.studentIds) ? input.studentIds : []),
    teacherId: String(input.teacherId || "").trim() || undefined,
    createdBy: String(input.createdBy || "system").trim() || "system",
  }
}

function normalizePiketScheduleRow(row: string[]): PiketSchedule {
  return normalizePiketSchedule({
    id: String(row[0] || "").trim(),
    classId: String(row[1] || "").trim(),
    day: String(row[2] || "").trim(),
    studentIds: parseStudentIds(row[3]),
    createdBy: String(row[4] || "").trim(),
    teacherId: String(row[6] || "").trim() || undefined,
  })
}

function toPiketScheduleSheetRow(schedule: PiketSchedule, updatedAt: string) {
  return [
    schedule.id,
    schedule.classId,
    schedule.day,
    JSON.stringify(schedule.studentIds || []),
    schedule.createdBy,
    updatedAt,
    schedule.teacherId || "",
  ]
}

function invalidatePiketSchedulesCache() {
  piketSchedulesCache = null
}

export async function ensurePiketSchedulesSheetReady() {
  if (Date.now() - piketScheduleSheetReadyAt < PIKET_SCHEDULE_READY_TTL_MS) {
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

  piketScheduleSheetName = resolveExistingSheetName(
    existingTitles,
    PIKET_SCHEDULE_SHEET_CANDIDATES,
    PIKET_SCHEDULE_SHEET_PRIMARY_NAME,
  )

  if (!existingTitles.has(piketScheduleSheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: piketScheduleSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${piketScheduleSheetName}!A1:G1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length !== PIKET_SCHEDULE_COLUMNS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${piketScheduleSheetName}!A1:G1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [PIKET_SCHEDULE_COLUMNS],
      },
    })
  }

  piketScheduleSheetReadyAt = Date.now()
}

async function replaceAllDbPiketSchedulesInSheet(schedules: PiketSchedule[]) {
  await ensurePiketSchedulesSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${piketScheduleSheetName}!A2:G`,
  })

  if (schedules.length > 0) {
    const updatedAt = new Date().toISOString()
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${piketScheduleSheetName}!A2:G${schedules.length + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: schedules.map((item) => toPiketScheduleSheetRow(item, updatedAt)),
      },
    })
  }

  invalidatePiketSchedulesCache()
}

export async function getAllDbPiketSchedulesFromSheet(): Promise<PiketSchedule[]> {
  if (piketSchedulesCache && piketSchedulesCache.expiresAt > Date.now()) {
    return piketSchedulesCache.data
  }

  await ensurePiketSchedulesSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${piketScheduleSheetName}!A2:G`,
  })

  const rows = rowsRes.data.values || []
  const data = rows
    .map((row) => normalizePiketScheduleRow(row as string[]))
    .filter((item) => Boolean(item.id && item.day && (item.classId || item.teacherId)))

  piketSchedulesCache = {
    expiresAt: Date.now() + PIKET_SCHEDULE_CACHE_TTL_MS,
    data,
  }

  return data
}

export async function createDbPiketSchedule(input: PiketSchedule): Promise<PiketSchedule> {
  const next = normalizePiketSchedule(input)
  const isTeacherDuty = Boolean(next.teacherId)
  if (!next.day || (!isTeacherDuty && (!next.classId || next.studentIds.length === 0))) {
    throw new Error("Data jadwal piket belum lengkap")
  }

  await ensurePiketSchedulesSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${piketScheduleSheetName}!A1:G1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toPiketScheduleSheetRow(next, new Date().toISOString())],
    },
  })

  invalidatePiketSchedulesCache()
  return next
}

export async function updateDbPiketScheduleById(input: Partial<PiketSchedule> & { id: string }) {
  const id = String(input.id || "").trim()
  if (!id) {
    throw new Error("ID jadwal piket wajib diisi")
  }

  const schedules = await getAllDbPiketSchedulesFromSheet()
  const existing = schedules.find((item) => item.id === id)
  if (!existing) {
    throw new Error("Jadwal piket tidak ditemukan")
  }

  const next = normalizePiketSchedule({
    ...existing,
    ...input,
    id: existing.id,
    studentIds: input.studentIds ? normalizeStudentIds(input.studentIds) : existing.studentIds,
  })

  const isTeacherDuty = Boolean(next.teacherId)
  if (!isTeacherDuty && next.studentIds.length === 0) {
    throw new Error("Pilih minimal 1 siswa")
  }

  await replaceAllDbPiketSchedulesInSheet(schedules.map((item) => (item.id === existing.id ? next : item)))
  return next
}

export async function deleteDbPiketScheduleById(id: string) {
  const normalizedId = String(id || "").trim()
  if (!normalizedId) {
    throw new Error("ID jadwal piket wajib diisi")
  }

  const schedules = await getAllDbPiketSchedulesFromSheet()
  const existing = schedules.find((item) => item.id === normalizedId)
  if (!existing) {
    throw new Error("Jadwal piket tidak ditemukan")
  }

  await replaceAllDbPiketSchedulesInSheet(schedules.filter((item) => item.id !== normalizedId))
}

export async function migrateDbPiketSchedulesToSheet(sourceSchedules: PiketSchedule[]) {
  const candidates = Array.isArray(sourceSchedules) ? sourceSchedules : []
  if (candidates.length === 0) {
    return getAllDbPiketSchedulesFromSheet()
  }

  const existing = await getAllDbPiketSchedulesFromSheet()
  const existingIds = new Set(existing.map((item) => item.id))
  const missing = candidates
    .map((item) => normalizePiketSchedule(item))
    .filter((item) =>
      Boolean(
        item.id &&
          item.day &&
          ((item.classId && item.studentIds.length > 0) || item.teacherId) &&
          !existingIds.has(item.id),
      ),
    )

  if (missing.length === 0) {
    return existing
  }

  await ensurePiketSchedulesSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const updatedAt = new Date().toISOString()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${piketScheduleSheetName}!A1:G1`,
    valueInputOption: "RAW",
    requestBody: {
      values: missing.map((item) => toPiketScheduleSheetRow(item, updatedAt)),
    },
  })

  invalidatePiketSchedulesCache()
  return getAllDbPiketSchedulesFromSheet()
}

export async function loadDbPiketSchedulesWithMigration(localSchedules: PiketSchedule[]) {
  try {
    const fromSheet = await getAllDbPiketSchedulesFromSheet()
    if (fromSheet.length > 0) {
      return fromSheet
    }

    if (!Array.isArray(localSchedules) || localSchedules.length === 0) {
      return fromSheet
    }

    return await migrateDbPiketSchedulesToSheet(localSchedules)
  } catch {
    return Array.isArray(localSchedules) ? localSchedules : []
  }
}
