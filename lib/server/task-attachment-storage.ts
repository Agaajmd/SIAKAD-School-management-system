import "server-only"

import { mkdir, writeFile } from "fs/promises"
import path from "path"
import crypto from "crypto"

type MediaKind = "attachment" | "image"

type NormalizeTaskMediaInput = {
  attachmentUrl?: string
  attachmentUrls?: string[]
  imageUrl?: string
  imageUrls?: string[]
  attachmentName?: string
}

type NormalizeTaskMediaOptions = {
  taskId: string
}

type PersistedMedia = {
  publicUrl: string
  fileName: string
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const DATA_URL_PREFIX = "data:"

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
}

const sanitizeBaseName = (value: string) => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return cleaned || "file"
}

const normalizeMaybeString = (value: unknown) => {
  if (value == null) return undefined
  return String(value).trim()
}

const toNormalizedUrlList = (primary?: string, list?: string[]) => {
  const values = [primary, ...(Array.isArray(list) ? list : [])]
  const normalized = values
    .map((value) => normalizeMaybeString(value))
    .filter((value): value is string => Boolean(value))

  return [...new Set(normalized)]
}

const isDataUrl = (value: string) => value.startsWith(DATA_URL_PREFIX) && value.includes(";base64,")

const getExtensionFromMime = (mimeType: string) => MIME_EXTENSIONS[mimeType.toLowerCase()] || ""

const getExtensionFromName = (fileName?: string) => {
  if (!fileName) return ""
  const ext = path.extname(fileName).toLowerCase()
  if (!ext) return ""
  return /^[a-z0-9.]+$/.test(ext.replace(".", "")) ? ext : ""
}

const parseDataUrl = (dataUrl: string) => {
  const commaIndex = dataUrl.indexOf(",")
  if (commaIndex < 0) {
    throw new Error("Format lampiran tidak valid")
  }

  const header = dataUrl.slice(DATA_URL_PREFIX.length, commaIndex)
  if (!header.includes(";base64")) {
    throw new Error("Lampiran harus berformat base64")
  }

  const mimeType = header.split(";")[0] || "application/octet-stream"
  const payload = dataUrl.slice(commaIndex + 1)
  const buffer = Buffer.from(payload, "base64")

  if (!buffer.length) {
    throw new Error("Lampiran kosong")
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error("Ukuran lampiran maksimal 10MB")
  }

  return { mimeType, buffer }
}

const buildFileName = (
  taskId: string,
  kind: MediaKind,
  mimeType: string,
  originalName?: string,
) => {
  const normalizedTaskId = sanitizeBaseName(taskId)
  const originalBaseName = originalName ? path.basename(originalName, path.extname(originalName)) : kind
  const baseName = sanitizeBaseName(originalBaseName)
  const randomSuffix = crypto.randomUUID().slice(0, 8)
  const preferredExtension = getExtensionFromName(originalName) || getExtensionFromMime(mimeType) || ".bin"

  return `${normalizedTaskId}-${kind}-${baseName}-${Date.now()}-${randomSuffix}${preferredExtension}`
}

const persistDataUrlAsFile = async (
  dataUrl: string,
  options: { taskId: string; kind: MediaKind; originalName?: string },
): Promise<PersistedMedia> => {
  const { mimeType, buffer } = parseDataUrl(dataUrl)
  const fileName = buildFileName(options.taskId, options.kind, mimeType, options.originalName)

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "tasks")
  await mkdir(uploadsDir, { recursive: true })

  const absolutePath = path.join(uploadsDir, fileName)
  await writeFile(absolutePath, buffer)

  return {
    publicUrl: `/uploads/tasks/${fileName}`,
    fileName,
  }
}

export async function normalizeTaskMedia(
  input: NormalizeTaskMediaInput,
  options: NormalizeTaskMediaOptions,
): Promise<NormalizeTaskMediaInput> {
  const attachmentUrls = toNormalizedUrlList(input.attachmentUrl, input.attachmentUrls)
  const imageUrls = toNormalizedUrlList(input.imageUrl, input.imageUrls)
  let attachmentName = normalizeMaybeString(input.attachmentName)

  const normalizedAttachmentUrls: string[] = []
  for (const url of attachmentUrls) {
    if (isDataUrl(url)) {
      const persisted = await persistDataUrlAsFile(url, {
        taskId: options.taskId,
        kind: "attachment",
        originalName: attachmentName,
      })
      normalizedAttachmentUrls.push(persisted.publicUrl)
      attachmentName = attachmentName || persisted.fileName
      continue
    }
    normalizedAttachmentUrls.push(url)
  }

  const normalizedImageUrls: string[] = []
  for (const url of imageUrls) {
    if (isDataUrl(url)) {
      const persisted = await persistDataUrlAsFile(url, {
        taskId: options.taskId,
        kind: "image",
      })
      normalizedImageUrls.push(persisted.publicUrl)
      continue
    }
    normalizedImageUrls.push(url)
  }

  const nextAttachmentUrls = [...new Set(normalizedAttachmentUrls)]
  const nextImageUrls = [...new Set(normalizedImageUrls)]
  const attachmentUrl = nextAttachmentUrls[0]
  const imageUrl = nextImageUrls[0]

  return {
    attachmentUrl,
    attachmentUrls: nextAttachmentUrls,
    imageUrl,
    imageUrls: nextImageUrls,
    attachmentName,
  }
}
