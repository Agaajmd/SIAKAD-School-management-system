import "server-only"

import { google } from "googleapis"
import type { AttendanceRecord, AttendanceStatus } from "@/lib/data-model"

const ATTENDANCE_SHEET_PRIMARY_NAME = "attendance_record"
const ATTENDANCE_SHEET_CANDIDATES = [
  "attendance_record",
  "attendence_record",
  "atttendence_record",
  "attendance_records",
]
const ATTENDANCE_COLUMNS = ["id", "student_id", "date", "status", "notes", "created_at", "updated_at"]

const ATTENDANCE_CACHE_TTL_MS = 60_000
const ATTENDANCE_READY_TTL_MS = 5 * 60_000

let attendanceCache: { expiresAt: number; data: AttendanceRecord[] } | null = null
let attendanceSheetReadyAt = 0
let attendanceSheetName = ATTENDANCE_SHEET_PRIMARY_NAME

function invalidateAttendanceCache() {
  attendanceCache = null
}

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

function getSpreadsheetId(): string {
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

function normalizeStatus(raw: string): AttendanceStatus {
  if (raw === "PRESENT" || raw === "SICK" || raw === "ALPHA") {
    return raw
  }
  return "PRESENT"
}

function normalizeAttendanceRow(row: string[]): AttendanceRecord {
  return {
    id: row[0] || "",
    studentId: row[1] || "",
    date: row[2] || new Date().toISOString().slice(0, 10),
    status: normalizeStatus(row[3] || "PRESENT"),
    notes: row[4] || undefined,
  }
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

function toAttendanceSheetRow(record: AttendanceRecord, updatedAt: string) {
  return [
    record.id,
    record.studentId,
    record.date,
    record.status,
    record.notes || "",
    "",
    updatedAt,
  ]
}

export async function ensureAttendanceSheetReady() {
  if (Date.now() - attendanceSheetReadyAt < ATTENDANCE_READY_TTL_MS) {
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
  const matched = ATTENDANCE_SHEET_CANDIDATES.find((title) => existingTitles.has(title))

  if (matched) {
    attendanceSheetName = matched
  }

  if (!matched) {
    attendanceSheetName = ATTENDANCE_SHEET_PRIMARY_NAME
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: attendanceSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${attendanceSheetName}!A1:G1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === ATTENDANCE_COLUMNS.length) {
    attendanceSheetReadyAt = Date.now()
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${attendanceSheetName}!A1:G1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [ATTENDANCE_COLUMNS],
    },
  })

  attendanceSheetReadyAt = Date.now()
}

export async function getAllDbAttendanceRecords(): Promise<AttendanceRecord[]> {
  if (attendanceCache && attendanceCache.expiresAt > Date.now()) {
    return attendanceCache.data
  }

  try {
    await ensureAttendanceSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${attendanceSheetName}!A2:G`,
    })

    const rows = rowsRes.data.values || []
    const data = rows
      .filter((row) => row[0] && row[1])
      .map((row) => normalizeAttendanceRow(row as string[]))

    attendanceCache = {
      expiresAt: Date.now() + ATTENDANCE_CACHE_TTL_MS,
      data,
    }

    return data
  } catch (error) {
    if (attendanceCache?.data?.length && isQuotaExceededError(error)) {
      return attendanceCache.data
    }
    throw error
  }
}

async function getDbAttendanceRowById(id: string): Promise<{ record: AttendanceRecord; rowNumber: number } | null> {
  await ensureAttendanceSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${attendanceSheetName}!A2:G`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    if ((row[0] || "") === id) {
      return {
        record: normalizeAttendanceRow(row),
        rowNumber: index + 2,
      }
    }
  }

  return null
}

export async function upsertDbAttendanceRecord(input: {
  id?: string
  studentId: string
  date: string
  status: AttendanceStatus
  notes?: string
}): Promise<AttendanceRecord> {
  const now = new Date().toISOString()
  const nextRecord: AttendanceRecord = {
    id: input.id || `att-${input.studentId}-${input.date}`,
    studentId: input.studentId,
    date: input.date,
    status: input.status,
    notes: input.notes,
  }

  const target = await getDbAttendanceRowById(nextRecord.id)

  await ensureAttendanceSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  if (target) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${attendanceSheetName}!A${target.rowNumber}:G${target.rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [toAttendanceSheetRow(nextRecord, now)],
      },
    })
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${attendanceSheetName}!A:G`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            nextRecord.id,
            nextRecord.studentId,
            nextRecord.date,
            nextRecord.status,
            nextRecord.notes || "",
            now,
            now,
          ],
        ],
      },
    })
  }

  invalidateAttendanceCache()
  return nextRecord
}
