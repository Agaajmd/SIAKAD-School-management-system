import "server-only"

import { google } from "googleapis"
import type { Parent } from "@/lib/data-model"

const PARENT_CHILDREN_SHEET_PRIMARY_NAME = "parent_children"
const PARENT_CHILDREN_SHEET_CANDIDATES = ["parent_children", "parent_child", "parentchildren", "orang_tua_anak"]
const PARENT_CHILDREN_COLUMNS = ["id", "parent_id", "parent_email", "children_ids", "updated_at"]

const PARENT_CHILDREN_READY_TTL_MS = 5 * 60_000
const PARENT_CHILDREN_CACHE_TTL_MS = 60_000

let parentChildrenSheetReadyAt = 0
let parentChildrenSheetName = PARENT_CHILDREN_SHEET_PRIMARY_NAME
let parentChildrenCache: { expiresAt: number; data: ParentChildLink[] } | null = null

type ServiceAccount = {
  client_email: string
  private_key: string
}

export interface ParentChildLink {
  id: string
  parentId: string
  parentEmail: string
  childrenIds: string[]
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

const normalizeId = (value: unknown) => String(value || "").trim().toLowerCase()

function resolveExistingSheetName(existingTitles: Set<string>, candidates: string[], fallback: string) {
  return candidates.find((title) => existingTitles.has(title)) || fallback
}

function normalizeChildrenIds(value: unknown): string[] {
  const rawValues = (() => {
    if (Array.isArray(value)) {
      return value
    }

    const raw = String(value || "").trim()
    if (!raw) return []

    if (raw.startsWith("[")) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          return parsed
        }
      } catch {
        // Fallback to split parser below.
      }
    }

    return raw
      .replace(/\r/g, "\n")
      .split(/[;,\n|/]+|\s+dan\s+|\s*&\s*/gi)
  })()

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const item of rawValues) {
    const childId = String(item || "").trim()
    if (!childId) continue
    const key = normalizeId(childId)
    if (!key || seen.has(key)) continue
    seen.add(key)
    normalized.push(childId)
  }

  return normalized
}

function normalizeParentChildLink(input: {
  id?: unknown
  parentId?: unknown
  parentEmail?: unknown
  childrenIds?: unknown
}): ParentChildLink {
  return {
    id: String(input.id || `parent-child-${crypto.randomUUID()}`).trim(),
    parentId: String(input.parentId || "").trim(),
    parentEmail: String(input.parentEmail || "").trim().toLowerCase(),
    childrenIds: normalizeChildrenIds(input.childrenIds),
  }
}

function normalizeParentChildLinkRow(row: string[]): ParentChildLink {
  return normalizeParentChildLink({
    id: row[0],
    parentId: row[1],
    parentEmail: row[2],
    childrenIds: row[3],
  })
}

function toParentChildSheetRow(link: ParentChildLink, updatedAt: string) {
  return [
    link.id,
    link.parentId,
    link.parentEmail,
    JSON.stringify(link.childrenIds || []),
    updatedAt,
  ]
}

function invalidateParentChildrenCache() {
  parentChildrenCache = null
}

function findLinkIndexByIdentity(links: ParentChildLink[], parentId?: string, parentEmail?: string) {
  const normalizedParentId = normalizeId(parentId)
  const normalizedParentEmail = normalizeId(parentEmail)

  return links.findIndex((item) => {
    const sameParentId = normalizedParentId && normalizeId(item.parentId) === normalizedParentId
    const sameParentEmail = normalizedParentEmail && normalizeId(item.parentEmail) === normalizedParentEmail
    return Boolean(sameParentId || sameParentEmail)
  })
}

export async function ensureParentChildrenSheetReady() {
  if (Date.now() - parentChildrenSheetReadyAt < PARENT_CHILDREN_READY_TTL_MS) {
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

  parentChildrenSheetName = resolveExistingSheetName(
    existingTitles,
    PARENT_CHILDREN_SHEET_CANDIDATES,
    PARENT_CHILDREN_SHEET_PRIMARY_NAME,
  )

  if (!existingTitles.has(parentChildrenSheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: parentChildrenSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${parentChildrenSheetName}!A1:E1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length !== PARENT_CHILDREN_COLUMNS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${parentChildrenSheetName}!A1:E1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [PARENT_CHILDREN_COLUMNS],
      },
    })
  }

  parentChildrenSheetReadyAt = Date.now()
}

async function replaceAllDbParentChildLinksInSheet(links: ParentChildLink[]) {
  await ensureParentChildrenSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${parentChildrenSheetName}!A2:E`,
  })

  if (links.length > 0) {
    const updatedAt = new Date().toISOString()
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${parentChildrenSheetName}!A2:E${links.length + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: links.map((item) => toParentChildSheetRow(item, updatedAt)),
      },
    })
  }

  invalidateParentChildrenCache()
}

export async function getAllDbParentChildLinksFromSheet(): Promise<ParentChildLink[]> {
  if (parentChildrenCache && parentChildrenCache.expiresAt > Date.now()) {
    return parentChildrenCache.data
  }

  await ensureParentChildrenSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${parentChildrenSheetName}!A2:E`,
  })

  const rows = rowsRes.data.values || []
  const data = rows
    .map((row) => normalizeParentChildLinkRow(row as string[]))
    .filter((item) => Boolean(item.id && (item.parentId || item.parentEmail)))

  parentChildrenCache = {
    expiresAt: Date.now() + PARENT_CHILDREN_CACHE_TTL_MS,
    data,
  }

  return data
}

export async function upsertDbParentChildLink(input: {
  parentId: string
  parentEmail?: string
  childrenIds: string[]
}): Promise<ParentChildLink> {
  const parentId = String(input.parentId || "").trim()
  const parentEmail = String(input.parentEmail || "").trim().toLowerCase()
  if (!parentId && !parentEmail) {
    throw new Error("parentId atau parentEmail wajib diisi")
  }

  const links = await getAllDbParentChildLinksFromSheet()
  const index = findLinkIndexByIdentity(links, parentId, parentEmail)
  const existing = index >= 0 ? links[index] : null

  const next = normalizeParentChildLink({
    id: existing?.id,
    parentId: parentId || existing?.parentId,
    parentEmail: parentEmail || existing?.parentEmail,
    childrenIds: input.childrenIds,
  })

  if (!next.parentId && !next.parentEmail) {
    throw new Error("Relasi parent tidak valid")
  }

  const nextLinks = index >= 0 ? links.map((item, itemIndex) => (itemIndex === index ? next : item)) : [...links, next]
  await replaceAllDbParentChildLinksInSheet(nextLinks)
  return next
}

export async function deleteDbParentChildLinkByParentIdentity(input: { parentId?: string; parentEmail?: string }) {
  const parentId = String(input.parentId || "").trim()
  const parentEmail = String(input.parentEmail || "").trim().toLowerCase()
  if (!parentId && !parentEmail) {
    throw new Error("parentId atau parentEmail wajib diisi")
  }

  const links = await getAllDbParentChildLinksFromSheet()
  const index = findLinkIndexByIdentity(links, parentId, parentEmail)
  if (index < 0) {
    return
  }

  const nextLinks = links.filter((_, itemIndex) => itemIndex !== index)
  await replaceAllDbParentChildLinksInSheet(nextLinks)
}

export async function removeChildFromAllDbParentChildLinks(childId: string) {
  const normalizedChildId = normalizeId(childId)
  if (!normalizedChildId) {
    throw new Error("childId wajib diisi")
  }

  const links = await getAllDbParentChildLinksFromSheet()
  let changed = false

  const nextLinks = links.map((item) => {
    const nextChildrenIds = (item.childrenIds || []).filter((candidate) => normalizeId(candidate) !== normalizedChildId)
    if (nextChildrenIds.length === item.childrenIds.length) {
      return item
    }

    changed = true
    return {
      ...item,
      childrenIds: nextChildrenIds,
    }
  })

  if (!changed) {
    return
  }

  const withoutEmptyLinks = nextLinks.filter((item) => item.childrenIds.length > 0)
  await replaceAllDbParentChildLinksInSheet(withoutEmptyLinks)
}

export async function migrateDbParentChildLinksToSheet(sourceParents: Parent[]) {
  const candidates = (Array.isArray(sourceParents) ? sourceParents : [])
    .map((parent) =>
      normalizeParentChildLink({
        id: `parent-child-${parent.id}`,
        parentId: parent.id,
        parentEmail: parent.email,
        childrenIds: parent.childrenIds,
      }),
    )
    .filter((item) => Boolean(item.parentId || item.parentEmail))
    .filter((item) => item.childrenIds.length > 0)

  const existing = await getAllDbParentChildLinksFromSheet()
  if (candidates.length === 0) {
    return existing
  }

  const missing = candidates.filter(
    (item) => findLinkIndexByIdentity(existing, item.parentId, item.parentEmail) < 0,
  )

  if (missing.length === 0) {
    return existing
  }

  await replaceAllDbParentChildLinksInSheet([...existing, ...missing])
  return getAllDbParentChildLinksFromSheet()
}

export async function loadDbParentChildLinksWithMigration(localParents: Parent[]) {
  try {
    const fromSheet = await getAllDbParentChildLinksFromSheet()
    if (!Array.isArray(localParents) || localParents.length === 0) {
      return fromSheet
    }

    return await migrateDbParentChildLinksToSheet(localParents)
  } catch {
    return (Array.isArray(localParents) ? localParents : [])
      .map((parent) =>
        normalizeParentChildLink({
          id: `parent-child-${parent.id}`,
          parentId: parent.id,
          parentEmail: parent.email,
          childrenIds: parent.childrenIds,
        }),
      )
      .filter((item) => item.childrenIds.length > 0)
  }
}
