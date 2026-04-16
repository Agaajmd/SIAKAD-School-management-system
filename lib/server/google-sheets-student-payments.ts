import "server-only"

import { google } from "googleapis"
import type { PaymentStatus, StudentPayment } from "@/lib/data-model"

const STUDENT_PAYMENTS_SHEET_PRIMARY_NAME = "student_payment"
const STUDENT_PAYMENTS_SHEET_CANDIDATES = ["student_payment", "student_payments", "payments"]
const STUDENT_PAYMENTS_COLUMNS = [
  "id",
  "student_id",
  "type",
  "description",
  "amount",
  "due_date",
  "paid_date",
  "status",
  "semester",
  "updated_at",
]

const STUDENT_PAYMENTS_READY_TTL_MS = 5 * 60_000
const STUDENT_PAYMENTS_CACHE_TTL_MS = 60_000

let studentPaymentsSheetReadyAt = 0
let studentPaymentsSheetName = STUDENT_PAYMENTS_SHEET_PRIMARY_NAME
let studentPaymentsCache: { expiresAt: number; data: StudentPayment[] } | null = null

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
  const next = String(value || "").trim()
  return next || undefined
}

function normalizeAmount(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? Math.max(0, next) : 0
}

function normalizePaymentType(value: unknown): StudentPayment["type"] {
  const next = String(value || "").trim().toUpperCase()
  if (next === "SPP" || next === "DSP") {
    return next
  }
  return "LAINNYA"
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const next = String(value || "").trim().toUpperCase()
  if (next === "PAID" || next === "PARTIAL") {
    return next
  }
  return "UNPAID"
}

function normalizeStudentPayment(input: StudentPayment): StudentPayment {
  const now = new Date().toISOString()

  return {
    id: String(input.id || `pay-${Date.now()}`).trim(),
    studentId: String(input.studentId || "").trim(),
    type: normalizePaymentType(input.type),
    description: String(input.description || "").trim(),
    amount: normalizeAmount(input.amount),
    dueDate: String(input.dueDate || now).trim() || now,
    paidDate: normalizeMaybeString(input.paidDate),
    status: normalizePaymentStatus(input.status),
    semester: String(input.semester || "").trim() || "-",
  }
}

function normalizeStudentPaymentRow(row: string[]): StudentPayment {
  return normalizeStudentPayment({
    id: String(row[0] || "").trim(),
    studentId: String(row[1] || "").trim(),
    type: normalizePaymentType(row[2]),
    description: String(row[3] || "").trim(),
    amount: normalizeAmount(row[4]),
    dueDate: String(row[5] || "").trim(),
    paidDate: normalizeMaybeString(row[6]),
    status: normalizePaymentStatus(row[7]),
    semester: String(row[8] || "").trim(),
  })
}

function toStudentPaymentSheetRow(payment: StudentPayment, updatedAt: string) {
  return [
    payment.id,
    payment.studentId,
    payment.type,
    payment.description,
    String(payment.amount),
    payment.dueDate,
    payment.paidDate || "",
    payment.status,
    payment.semester,
    updatedAt,
  ]
}

function invalidateStudentPaymentsCache() {
  studentPaymentsCache = null
}

export async function ensureStudentPaymentsSheetReady() {
  if (Date.now() - studentPaymentsSheetReadyAt < STUDENT_PAYMENTS_READY_TTL_MS) {
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

  studentPaymentsSheetName = resolveExistingSheetName(
    existingTitles,
    STUDENT_PAYMENTS_SHEET_CANDIDATES,
    STUDENT_PAYMENTS_SHEET_PRIMARY_NAME,
  )

  if (!existingTitles.has(studentPaymentsSheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: studentPaymentsSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${studentPaymentsSheetName}!A1:J1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length !== STUDENT_PAYMENTS_COLUMNS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${studentPaymentsSheetName}!A1:J1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [STUDENT_PAYMENTS_COLUMNS],
      },
    })
  }

  studentPaymentsSheetReadyAt = Date.now()
}

export async function getAllDbStudentPaymentsFromSheet(): Promise<StudentPayment[]> {
  if (studentPaymentsCache && studentPaymentsCache.expiresAt > Date.now()) {
    return studentPaymentsCache.data
  }

  await ensureStudentPaymentsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${studentPaymentsSheetName}!A2:J`,
  })

  const rows = rowsRes.data.values || []
  const data = rows
    .map((row) => normalizeStudentPaymentRow(row as string[]))
    .filter((payment) => Boolean(payment.id && payment.studentId))

  studentPaymentsCache = {
    expiresAt: Date.now() + STUDENT_PAYMENTS_CACHE_TTL_MS,
    data,
  }

  return data
}

export async function migrateDbStudentPaymentsToSheet(sourcePayments: StudentPayment[]) {
  const candidates = Array.isArray(sourcePayments) ? sourcePayments : []
  if (candidates.length === 0) {
    return getAllDbStudentPaymentsFromSheet()
  }

  const existing = await getAllDbStudentPaymentsFromSheet()
  const existingIds = new Set(existing.map((payment) => payment.id))
  const missing = candidates
    .map((payment) => normalizeStudentPayment(payment))
    .filter((payment) => Boolean(payment.id && payment.studentId && !existingIds.has(payment.id)))

  if (missing.length === 0) {
    return existing
  }

  await ensureStudentPaymentsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const updatedAt = new Date().toISOString()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${studentPaymentsSheetName}!A:J`,
    valueInputOption: "RAW",
    requestBody: {
      values: missing.map((payment) => toStudentPaymentSheetRow(payment, updatedAt)),
    },
  })

  invalidateStudentPaymentsCache()
  return getAllDbStudentPaymentsFromSheet()
}

export async function loadDbStudentPaymentsWithMigration(localPayments: StudentPayment[]) {
  try {
    const fromSheet = await getAllDbStudentPaymentsFromSheet()
    if (fromSheet.length > 0) {
      return fromSheet
    }

    if (!Array.isArray(localPayments) || localPayments.length === 0) {
      return fromSheet
    }

    return await migrateDbStudentPaymentsToSheet(localPayments)
  } catch {
    return Array.isArray(localPayments) ? localPayments : []
  }
}
