import "server-only"

import { google } from "googleapis"
import type { ClassRoom } from "@/lib/data-model"

const CLASSES_SHEET_NAME = "classes"
const CLASSES_COLUMNS = ["id", "name", "grade", "rows", "cols", "teacher_id", "created_at", "updated_at"]

const CLASSES_CACHE_TTL_MS = 60_000
const CLASSES_READY_TTL_MS = 5 * 60_000

let classesCache: { expiresAt: number; data: ClassRoom[] } | null = null
let classesSheetReadyAt = 0

function invalidateClassesCache() {
  classesCache = null
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

function normalizeClassRow(row: string[]): ClassRoom {
  return {
    id: row[0] || "",
    name: row[1] || "",
    grade: row[2] || "",
    rows: Number(row[3] || 0),
    cols: Number(row[4] || 0),
    teacherId: row[5] || "",
  }
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

export async function ensureClassesSheetReady() {
  if (Date.now() - classesSheetReadyAt < CLASSES_READY_TTL_MS) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const hasClassesSheet =
    spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === CLASSES_SHEET_NAME) ?? false

  if (!hasClassesSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: CLASSES_SHEET_NAME,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CLASSES_SHEET_NAME}!A1:H1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === CLASSES_COLUMNS.length) {
    classesSheetReadyAt = Date.now()
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${CLASSES_SHEET_NAME}!A1:H1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [CLASSES_COLUMNS],
    },
  })

  classesSheetReadyAt = Date.now()
}

export async function getAllDbClasses(): Promise<ClassRoom[]> {
  if (classesCache && classesCache.expiresAt > Date.now()) {
    return classesCache.data
  }

  try {
    await ensureClassesSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CLASSES_SHEET_NAME}!A2:H`,
    })

    const rows = rowsRes.data.values || []
    const data = rows
      .filter((row) => row[0] && row[1])
      .map((row) => normalizeClassRow(row as string[]))
    classesCache = {
      expiresAt: Date.now() + CLASSES_CACHE_TTL_MS,
      data,
    }
    return data
  } catch (error) {
    if (classesCache?.data?.length && isQuotaExceededError(error)) {
      return classesCache.data
    }
    throw error
  }
}

async function getDbClassRowById(id: string): Promise<{ classRoom: ClassRoom; rowNumber: number } | null> {
  await ensureClassesSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CLASSES_SHEET_NAME}!A2:H`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    if ((row[0] || "") === id) {
      return {
        classRoom: normalizeClassRow(row),
        rowNumber: index + 2,
      }
    }
  }

  return null
}

export async function createDbClass(input: {
  name: string
  grade: string
  rows: number
  cols: number
  teacherId?: string
}): Promise<ClassRoom> {
  const now = new Date().toISOString()
  const next: ClassRoom = {
    id: `c-${Date.now()}`,
    name: input.name.trim(),
    grade: input.grade.trim(),
    rows: Number(input.rows),
    cols: Number(input.cols),
    teacherId: input.teacherId || "",
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${CLASSES_SHEET_NAME}!A:H`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[next.id, next.name, next.grade, String(next.rows), String(next.cols), next.teacherId, now, now]],
    },
  })

  invalidateClassesCache()

  return next
}

export async function updateDbClassById(input: {
  id: string
  name?: string
  grade?: string
  rows?: number
  cols?: number
  teacherId?: string
}): Promise<ClassRoom> {
  const target = await getDbClassRowById(input.id)
  if (!target) {
    throw new Error("Kelas tidak ditemukan")
  }

  const current = target.classRoom
  const now = new Date().toISOString()
  const next: ClassRoom = {
    id: current.id,
    name: input.name?.trim() || current.name,
    grade: input.grade?.trim() || current.grade,
    rows: input.rows != null ? Number(input.rows) : current.rows,
    cols: input.cols != null ? Number(input.cols) : current.cols,
    teacherId: input.teacherId != null ? String(input.teacherId) : current.teacherId,
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${CLASSES_SHEET_NAME}!A${target.rowNumber}:H${target.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[next.id, next.name, next.grade, String(next.rows), String(next.cols), next.teacherId, "", now]],
    },
  })

  invalidateClassesCache()

  return next
}

export async function deleteDbClassById(id: string): Promise<void> {
  const target = await getDbClassRowById(id)
  if (!target) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const sheetRes = await sheets.spreadsheets.get({ spreadsheetId })
  const classesSheet = sheetRes.data.sheets?.find((sheet) => sheet.properties?.title === CLASSES_SHEET_NAME)
  const sheetId = classesSheet?.properties?.sheetId

  if (typeof sheetId !== "number") {
    throw new Error("Sheet classes tidak ditemukan")
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

  invalidateClassesCache()
}
