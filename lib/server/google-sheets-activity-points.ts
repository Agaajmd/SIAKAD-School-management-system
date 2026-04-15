import "server-only"

import { google } from "googleapis"
import type { ActivityPoint } from "@/lib/data-model"

const ACTIVITY_POINTS_SHEET_PRIMARY_NAME = "activity_points"
const ACTIVITY_POINTS_SHEET_CANDIDATES = ["activity_points", "activity_point", "activity point"]
const ACTIVITY_POINTS_COLUMNS = [
  "id",
  "student_id",
  "type",
  "category",
  "points",
  "description",
  "date",
  "given_by",
  "created_at",
  "updated_at",
]

const ACTIVITY_POINTS_CACHE_TTL_MS = 60_000
const ACTIVITY_POINTS_READY_TTL_MS = 5 * 60_000

let activityPointsCache: { expiresAt: number; data: ActivityPoint[] } | null = null
let activityPointsSheetReadyAt = 0
let activityPointsSheetName = ACTIVITY_POINTS_SHEET_PRIMARY_NAME

function invalidateActivityPointsCache() {
  activityPointsCache = null
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

function normalizePointType(raw: string): "POSITIVE" | "NEGATIVE" {
  return raw === "NEGATIVE" ? "NEGATIVE" : "POSITIVE"
}

function normalizeActivityPointRow(row: string[]): ActivityPoint {
  const points = Number(row[4] || 0)
  return {
    id: row[0] || "",
    studentId: row[1] || "",
    type: normalizePointType(row[2] || "POSITIVE"),
    category: row[3] || "",
    points: Number.isFinite(points) ? points : 0,
    description: row[5] || "",
    date: row[6] || new Date().toISOString().slice(0, 10),
    givenBy: row[7] || "",
  }
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

function toActivityPointSheetRow(point: ActivityPoint, updatedAt: string) {
  return [
    point.id,
    point.studentId,
    point.type,
    point.category,
    String(point.points),
    point.description,
    point.date,
    point.givenBy,
    "",
    updatedAt,
  ]
}

export async function ensureActivityPointsSheetReady() {
  if (Date.now() - activityPointsSheetReadyAt < ACTIVITY_POINTS_READY_TTL_MS) {
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
  const matched = ACTIVITY_POINTS_SHEET_CANDIDATES.find((title) => existingTitles.has(title))

  if (matched) {
    activityPointsSheetName = matched
  }

  if (!matched) {
    activityPointsSheetName = ACTIVITY_POINTS_SHEET_PRIMARY_NAME
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: activityPointsSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${activityPointsSheetName}!A1:J1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === ACTIVITY_POINTS_COLUMNS.length) {
    activityPointsSheetReadyAt = Date.now()
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${activityPointsSheetName}!A1:J1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [ACTIVITY_POINTS_COLUMNS],
    },
  })

  activityPointsSheetReadyAt = Date.now()
}

export async function getAllDbActivityPointsFromSheet(): Promise<ActivityPoint[]> {
  if (activityPointsCache && activityPointsCache.expiresAt > Date.now()) {
    return activityPointsCache.data
  }

  try {
    await ensureActivityPointsSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${activityPointsSheetName}!A2:J`,
    })

    const rows = rowsRes.data.values || []
    const data = rows
      .filter((row) => row[0] && row[1])
      .map((row) => normalizeActivityPointRow(row as string[]))

    activityPointsCache = {
      expiresAt: Date.now() + ACTIVITY_POINTS_CACHE_TTL_MS,
      data,
    }

    return data
  } catch (error) {
    if (activityPointsCache?.data?.length && isQuotaExceededError(error)) {
      return activityPointsCache.data
    }
    throw error
  }
}

export async function createDbActivityPoint(point: ActivityPoint): Promise<ActivityPoint> {
  const next: ActivityPoint = {
    ...point,
    id: point.id || `ap-${Date.now()}`,
    date: point.date || new Date().toISOString().slice(0, 10),
  }
  const now = new Date().toISOString()

  await ensureActivityPointsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${activityPointsSheetName}!A:J`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          next.id,
          next.studentId,
          next.type,
          next.category,
          String(next.points),
          next.description,
          next.date,
          next.givenBy,
          now,
          now,
        ],
      ],
    },
  })

  invalidateActivityPointsCache()
  return next
}
