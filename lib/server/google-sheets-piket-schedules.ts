import "server-only"

import { google } from "googleapis"
import type { PiketSchedule } from "@/lib/data-model"

const PIKET_SCHEDULE_SHEET_PRIMARY_NAME = "piket_schedule"
const PIKET_SCHEDULE_SHEET_CANDIDATES = ["piket_schedule", "piket_schedules", "piketschedule"]
const PIKET_SCHEDULE_COLUMNS = ["id", "class_id", "day", "student_ids", "created_by", "updated_at"]

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
    range: `${piketScheduleSheetName}!A1:F1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length !== PIKET_SCHEDULE_COLUMNS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${piketScheduleSheetName}!A1:F1`,
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
    range: `${piketScheduleSheetName}!A2:F`,
  })

  if (schedules.length > 0) {
    const updatedAt = new Date().toISOString()
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${piketScheduleSheetName}!A2:F${schedules.length + 1}`,
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
    range: `${piketScheduleSheetName}!A2:F`,
  })

  const rows = rowsRes.data.values || []
  const data = rows
    .map((row) => normalizePiketScheduleRow(row as string[]))
    .filter((item) => Boolean(item.id && item.classId && item.day))

  piketSchedulesCache = {
    expiresAt: Date.now() + PIKET_SCHEDULE_CACHE_TTL_MS,
    data,
  }

  return data
}

export async function createDbPiketSchedule(input: PiketSchedule): Promise<PiketSchedule> {
  const next = normalizePiketSchedule(input)
  if (!next.classId || !next.day || next.studentIds.length === 0) {
    throw new Error("Data jadwal piket belum lengkap")
  }

  await ensurePiketSchedulesSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${piketScheduleSheetName}!A:F`,
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

  if (next.studentIds.length === 0) {
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
    .filter((item) => Boolean(item.id && item.classId && item.day && item.studentIds.length > 0 && !existingIds.has(item.id)))

  if (missing.length === 0) {
    return existing
  }

  await ensurePiketSchedulesSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const updatedAt = new Date().toISOString()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${piketScheduleSheetName}!A:F`,
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
