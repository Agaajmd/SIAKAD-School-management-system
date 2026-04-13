import "server-only"

import { Readable } from "node:stream"
import { google } from "googleapis"

const MEDIA_SHEET_NAME = "media_assets"
const MEDIA_COLUMNS = ["id", "owner_type", "owner_id", "usage", "file_id", "url", "mime_type", "file_name", "created_at"]

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

async function getGoogleClients() {
  const serviceAccount = await getServiceAccount()
  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  })

  return {
    sheets: google.sheets({ version: "v4", auth }),
    drive: google.drive({ version: "v3", auth }),
  }
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    throw new Error("Format data URL tidak valid")
  }

  return {
    mimeType: match[1] || "application/octet-stream",
    buffer: Buffer.from(match[2], "base64"),
  }
}

async function ensureMediaSheetReady() {
  const { sheets } = await getGoogleClients()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const hasSheet =
    spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === MEDIA_SHEET_NAME) ?? false

  if (!hasSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: MEDIA_SHEET_NAME,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${MEDIA_SHEET_NAME}!A1:I1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === MEDIA_COLUMNS.length) {
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${MEDIA_SHEET_NAME}!A1:I1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [MEDIA_COLUMNS],
    },
  })
}

async function appendMediaAssetRow(input: {
  ownerType: string
  ownerId: string
  usage: string
  fileId: string
  url: string
  mimeType: string
  fileName: string
}) {
  await ensureMediaSheetReady()
  const { sheets } = await getGoogleClients()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${MEDIA_SHEET_NAME}!A:I`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        `media-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        input.ownerType,
        input.ownerId,
        input.usage,
        input.fileId,
        input.url,
        input.mimeType,
        input.fileName,
        new Date().toISOString(),
      ]],
    },
  })
}

export async function uploadMediaDataUrlToDrive(input: {
  dataUrl: string
  fileName: string
  ownerType: string
  ownerId: string
  usage: string
}): Promise<{ fileId: string; url: string }> {
  const { drive } = await getGoogleClients()
  const { mimeType, buffer } = parseDataUrl(input.dataUrl)

  const created = await drive.files.create({
    requestBody: {
      name: input.fileName,
      mimeType,
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id",
  })

  const fileId = String(created.data.id || "")
  if (!fileId) {
    throw new Error("Gagal upload file ke Google Drive")
  }

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  })

  const publicUrl = `https://drive.google.com/uc?id=${fileId}`

  await appendMediaAssetRow({
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    usage: input.usage,
    fileId,
    url: publicUrl,
    mimeType,
    fileName: input.fileName,
  })

  return {
    fileId,
    url: publicUrl,
  }
}