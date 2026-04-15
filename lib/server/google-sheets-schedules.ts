import "server-only"

import { google } from "googleapis"
import type { Schedule } from "@/lib/data-model"

const SCHEDULES_SHEET_NAME = "schedules"
const SCHEDULES_COLUMNS = [
  "id",
  "class_id",
  "subject",
  "teacher_id",
  "day",
  "start_time",
  "end_time",
  "room",
  "created_at",
  "updated_at",
]

const SCHEDULES_CACHE_TTL_MS = 60_000
const SCHEDULES_READY_TTL_MS = 5 * 60_000

let schedulesCache: { expiresAt: number; data: Schedule[] } | null = null
let schedulesSheetReadyAt = 0

function invalidateSchedulesCache() {
  schedulesCache = null
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

function normalizeScheduleRow(row: string[]): Schedule {
  return {
    id: row[0] || "",
    classId: row[1] || "",
    subject: row[2] || "",
    teacherId: row[3] || "",
    day: row[4] || "",
    startTime: row[5] || "",
    endTime: row[6] || "",
    room: row[7] || "",
  }
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

export async function ensureSchedulesSheetReady() {
  if (Date.now() - schedulesSheetReadyAt < SCHEDULES_READY_TTL_MS) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const hasSchedulesSheet =
    spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === SCHEDULES_SHEET_NAME) ?? false

  if (!hasSchedulesSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: SCHEDULES_SHEET_NAME,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SCHEDULES_SHEET_NAME}!A1:J1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === SCHEDULES_COLUMNS.length) {
    schedulesSheetReadyAt = Date.now()
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SCHEDULES_SHEET_NAME}!A1:J1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [SCHEDULES_COLUMNS],
    },
  })

  schedulesSheetReadyAt = Date.now()
}

export async function getAllDbSchedules(): Promise<Schedule[]> {
  if (schedulesCache && schedulesCache.expiresAt > Date.now()) {
    return schedulesCache.data
  }

  try {
    await ensureSchedulesSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SCHEDULES_SHEET_NAME}!A2:J`,
    })

    const rows = rowsRes.data.values || []
    const data = rows
      .filter((row) => row[0] && row[1] && row[2] && row[3])
      .map((row) => normalizeScheduleRow(row as string[]))
    schedulesCache = {
      expiresAt: Date.now() + SCHEDULES_CACHE_TTL_MS,
      data,
    }
    return data
  } catch (error) {
    if (schedulesCache?.data?.length && isQuotaExceededError(error)) {
      return schedulesCache.data
    }
    throw error
  }
}

async function getDbScheduleRowById(id: string): Promise<{ schedule: Schedule; rowNumber: number } | null> {
  await ensureSchedulesSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SCHEDULES_SHEET_NAME}!A2:J`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    if ((row[0] || "") === id) {
      return {
        schedule: normalizeScheduleRow(row),
        rowNumber: index + 2,
      }
    }
  }

  return null
}

export async function createDbSchedule(input: {
  classId: string
  subject: string
  teacherId: string
  day: string
  startTime: string
  endTime: string
  room?: string
}): Promise<Schedule> {
  const now = new Date().toISOString()
  const next: Schedule = {
    id: `sch-${Date.now()}`,
    classId: input.classId,
    subject: input.subject.trim(),
    teacherId: input.teacherId,
    day: input.day,
    startTime: input.startTime,
    endTime: input.endTime,
    room: input.room || "",
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SCHEDULES_SHEET_NAME}!A:J`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        next.id,
        next.classId,
        next.subject,
        next.teacherId,
        next.day,
        next.startTime,
        next.endTime,
        next.room,
        now,
        now,
      ]],
    },
  })

  invalidateSchedulesCache()

  return next
}

export async function updateDbScheduleById(input: {
  id: string
  classId?: string
  subject?: string
  teacherId?: string
  day?: string
  startTime?: string
  endTime?: string
  room?: string
}): Promise<Schedule> {
  const target = await getDbScheduleRowById(input.id)
  if (!target) {
    throw new Error("Jadwal tidak ditemukan")
  }

  const current = target.schedule
  const now = new Date().toISOString()
  const next: Schedule = {
    id: current.id,
    classId: input.classId || current.classId,
    subject: input.subject != null ? input.subject.trim() : current.subject,
    teacherId: input.teacherId || current.teacherId,
    day: input.day || current.day,
    startTime: input.startTime || current.startTime,
    endTime: input.endTime || current.endTime,
    room: input.room != null ? input.room : current.room,
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SCHEDULES_SHEET_NAME}!A${target.rowNumber}:J${target.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        next.id,
        next.classId,
        next.subject,
        next.teacherId,
        next.day,
        next.startTime,
        next.endTime,
        next.room,
        "",
        now,
      ]],
    },
  })

  invalidateSchedulesCache()

  return next
}

export async function deleteDbScheduleById(id: string): Promise<void> {
  const target = await getDbScheduleRowById(id)
  if (!target) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const sheetRes = await sheets.spreadsheets.get({ spreadsheetId })
  const schedulesSheet = sheetRes.data.sheets?.find((sheet) => sheet.properties?.title === SCHEDULES_SHEET_NAME)
  const sheetId = schedulesSheet?.properties?.sheetId

  if (typeof sheetId !== "number") {
    throw new Error("Sheet schedules tidak ditemukan")
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: target.rowNumber - 1,
              endIndex: target.rowNumber,
            },
          },
        },
      ],
    },
  })

  invalidateSchedulesCache()
}