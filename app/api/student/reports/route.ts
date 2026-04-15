import { NextResponse } from "next/server"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import crypto from "crypto"
import {
  createDbAssetReport,
  getAllDbAssetReports,
} from "@/lib/server/google-sheets-asset-reports"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbStudentReports,
  setDbStudentReports,
  type StudentReport,
} from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
}

function normalizeMaybeString(value: unknown) {
  const next = String(value || "").trim()
  return next || undefined
}

async function normalizeReportImageUrl(input: unknown, reportKey: string) {
  const source = normalizeMaybeString(input)
  if (!source) return undefined

  if (!source.startsWith("data:")) {
    return source
  }

  const commaIndex = source.indexOf(",")
  if (commaIndex < 0) {
    throw new Error("Format gambar tidak valid")
  }

  const header = source.slice(5, commaIndex)
  if (!header.includes(";base64")) {
    throw new Error("Format gambar harus base64")
  }

  const mimeType = header.split(";")[0]?.toLowerCase() || ""
  const extension = IMAGE_EXTENSION_BY_MIME[mimeType]
  if (!extension) {
    throw new Error("Format gambar belum didukung")
  }

  const payload = source.slice(commaIndex + 1)
  const buffer = Buffer.from(payload, "base64")
  if (!buffer.length) {
    throw new Error("Gambar tidak boleh kosong")
  }
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Ukuran gambar maksimal 5MB")
  }

  const safeKey = String(reportKey || "report")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  const fileName = `${safeKey || "report"}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extension}`
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "asset-reports")
  await mkdir(uploadsDir, { recursive: true })
  await writeFile(path.join(uploadsDir, fileName), buffer)

  return `/uploads/asset-reports/${fileName}`
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const requestedStudentId = String(url.searchParams.get("studentId") || "").trim()
  const sessionUser = await getSessionUser()

  const studentId =
    (sessionUser?.role === "STUDENT" ? sessionUser.id : "") ||
    requestedStudentId

  if (
    sessionUser?.role === "STUDENT" &&
    requestedStudentId &&
    requestedStudentId !== sessionUser.id
  ) {
    return NextResponse.json({ error: "Akses laporan siswa ditolak" }, { status: 403 })
  }

  if (!studentId) {
    return NextResponse.json({ error: "studentId wajib diisi" }, { status: 400 })
  }

  let reports = [] as StudentReport[]
  try {
    reports = (await getAllDbAssetReports()).map((report) => ({
      id: report.id,
      studentId: report.studentId,
      assetId: report.assetId,
      assetName: report.assetName,
      damageType: report.damageType,
      description: report.description,
      imageUrl: report.imageUrl,
      status: report.status,
      createdAt: report.createdAt,
      location: report.location,
      assignedTo: report.handledBy,
      resolvedAt: report.resolvedAt,
      resolution: report.resolution,
    }))
  } catch {
    reports = getDbStudentReports()
  }

  const filteredReports = reports
    .filter((report) => report.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return NextResponse.json({ reports: filteredReports })
}

export async function POST(request: Request) {
  const body = await request.json()
  const sessionUser = await getSessionUser()
  const studentId = String(
    (sessionUser?.role === "STUDENT" ? sessionUser.id : body.studentId) || "",
  ).trim()
  const assetId = String(body.assetId || "").trim()
  const damageType = String(body.damageType || "").trim()
  const description = String(body.description || "").trim()
  const location = String(body.location || "").trim()
  let imageUrl: string | undefined

  try {
    imageUrl = await normalizeReportImageUrl(body.imageUrl, `report-${studentId || "student"}`)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses gambar" },
      { status: 400 },
    )
  }

  if (!studentId || !assetId || !damageType || !description || !location) {
    return NextResponse.json({ error: "Data laporan belum lengkap" }, { status: 400 })
  }

  let next: StudentReport
  try {
    const created = await createDbAssetReport({
      studentId,
      assetId,
      assetName: String(body.assetName || assetId),
      damageType,
      description,
      location,
      imageUrl,
      status: "pending",
    })

    next = {
      id: created.id,
      studentId: created.studentId,
      assetId: created.assetId,
      assetName: created.assetName,
      damageType: created.damageType,
      description: created.description,
      imageUrl: created.imageUrl,
      status: created.status,
      createdAt: created.createdAt,
      location: created.location,
      assignedTo: created.handledBy,
      resolvedAt: created.resolvedAt,
      resolution: created.resolution,
    }
  } catch {
    next = {
      id: `RPT${Date.now()}`,
      studentId,
      assetId,
      assetName: String(body.assetName || assetId),
      damageType,
      description,
      imageUrl,
      status: "pending",
      createdAt: new Date().toISOString(),
      location,
    }
  }

  setDbStudentReports([
    next,
    ...getDbStudentReports().filter((report) => report.id !== next.id),
  ])

  logAudit({
    actorId: studentId,
    action: "CREATE",
    entityName: "ASSET_REPORT",
    entityId: next.id,
    oldValue: null,
    newValue: next,
  })

  return NextResponse.json({ success: true, report: next })
}
