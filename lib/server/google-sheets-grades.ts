import "server-only"

import { google } from "googleapis"
import type { StudentGrade } from "@/lib/data-model"

const GRADES_SHEET_NAME = "student_grades"
const GRADES_COLUMNS = [
  "id",
  "student_id",
  "subject",
  "teacher_id",
  "semester",
  "assignment_score",
  "practice_score",
  "uts_score",
  "uas_score",
  "school_exam_score",
  "knowledge",
  "skill",
  "attitude",
  "notes",
  "created_at",
  "updated_at",
]

const GRADES_CACHE_TTL_MS = 60_000
const GRADES_READY_TTL_MS = 5 * 60_000

let gradesCache: { expiresAt: number; data: StudentGrade[] } | null = null
let gradesSheetReadyAt = 0

function invalidateGradesCache() {
  gradesCache = null
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

function toScore(value: string, fallback = 0) {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.max(0, Math.min(100, next))
}

function normalizeAttitude(raw: string): "A" | "B" | "C" | "D" {
  if (raw === "A" || raw === "B" || raw === "C" || raw === "D") return raw
  return "C"
}

function normalizeOptionalScore(value: string): number | undefined {
  if (value == null || String(value).trim() === "") return undefined
  return toScore(value, 0)
}

function normalizeGradeRow(row: string[]): StudentGrade {
  // Backward compatibility for legacy 11-column grade rows.
  if (row.length < 16) {
    const knowledge = toScore(row[5] || "0")
    const skill = toScore(row[6] || "0")
    return {
      id: row[0] || "",
      studentId: row[1] || "",
      subject: row[2] || "",
      teacherId: row[3] || "",
      semester: row[4] || "",
      assignmentScore: knowledge,
      practiceScore: skill,
      utsScore: undefined,
      uasScore: knowledge,
      schoolExamScore: knowledge,
      knowledge,
      skill,
      attitude: normalizeAttitude(row[7] || "C"),
      notes: row[8] || "",
    }
  }

  return {
    id: row[0] || "",
    studentId: row[1] || "",
    subject: row[2] || "",
    teacherId: row[3] || "",
    semester: row[4] || "",
    assignmentScore: toScore(row[5] || "0"),
    practiceScore: toScore(row[6] || "0"),
    utsScore: normalizeOptionalScore(row[7] || ""),
    uasScore: toScore(row[8] || "0"),
    schoolExamScore: toScore(row[9] || "0"),
    knowledge: toScore(row[10] || "0"),
    skill: toScore(row[11] || "0"),
    attitude: normalizeAttitude(row[12] || "C"),
    notes: row[13] || "",
  }
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

function toGradeSheetRow(grade: StudentGrade, updatedAt: string) {
  const assignmentScore = toScore(String(grade.assignmentScore ?? grade.knowledge ?? 0))
  const practiceScore = toScore(String(grade.practiceScore ?? grade.skill ?? 0))
  const utsScore = grade.utsScore == null ? "" : String(toScore(String(grade.utsScore), 0))
  const uasScore = toScore(String(grade.uasScore ?? grade.knowledge ?? 0))
  const schoolExamScore = toScore(String(grade.schoolExamScore ?? grade.knowledge ?? 0))

  return [
    grade.id,
    grade.studentId,
    grade.subject,
    grade.teacherId,
    grade.semester,
    String(assignmentScore),
    String(practiceScore),
    utsScore,
    String(uasScore),
    String(schoolExamScore),
    String(grade.knowledge),
    String(grade.skill),
    grade.attitude,
    grade.notes || "",
    "",
    updatedAt,
  ]
}

export async function ensureGradesSheetReady() {
  if (Date.now() - gradesSheetReadyAt < GRADES_READY_TTL_MS) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const hasSheet =
    spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === GRADES_SHEET_NAME) ?? false

  if (!hasSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: GRADES_SHEET_NAME,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${GRADES_SHEET_NAME}!A1:P1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === GRADES_COLUMNS.length) {
    gradesSheetReadyAt = Date.now()
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${GRADES_SHEET_NAME}!A1:P1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [GRADES_COLUMNS],
    },
  })

  gradesSheetReadyAt = Date.now()
}

export async function getAllDbGradesFromSheet(): Promise<StudentGrade[]> {
  if (gradesCache && gradesCache.expiresAt > Date.now()) {
    return gradesCache.data
  }

  try {
    await ensureGradesSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${GRADES_SHEET_NAME}!A2:P`,
    })

    const rows = rowsRes.data.values || []
    const data = rows
      .filter((row) => row[0] && row[1] && row[2] && row[3])
      .map((row) => normalizeGradeRow(row as string[]))

    gradesCache = {
      expiresAt: Date.now() + GRADES_CACHE_TTL_MS,
      data,
    }

    return data
  } catch (error) {
    if (gradesCache?.data?.length && isQuotaExceededError(error)) {
      return gradesCache.data
    }
    throw error
  }
}

export async function replaceAllDbGradesToSheet(grades: StudentGrade[]): Promise<void> {
  await ensureGradesSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${GRADES_SHEET_NAME}!A2:P`,
  })

  if (grades.length === 0) {
    invalidateGradesCache()
    return
  }

  const now = new Date().toISOString()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${GRADES_SHEET_NAME}!A2:P${grades.length + 1}`,
    valueInputOption: "RAW",
    requestBody: {
      values: grades.map((grade) => toGradeSheetRow(grade, now)),
    },
  })

  invalidateGradesCache()
}
