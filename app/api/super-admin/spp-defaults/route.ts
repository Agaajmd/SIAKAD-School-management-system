import { NextResponse } from "next/server"
import type { SppDefault } from "@/lib/data-model"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import {
  createDbSppDefault,
  deleteDbSppDefaultById,
  loadDbSppDefaultsWithMigration,
  updateDbSppDefaultById,
} from "@/lib/server/google-sheets-spp-defaults"
import { getSessionUser } from "@/lib/server/session-user"
import { logAudit } from "@/lib/server/audit-log"
import { getDbClasses, getDbSppDefaults, setDbSppDefaults } from "@/lib/server/persistent-store"

function normalizeGrade(value: unknown) {
  return String(value || "").trim().toUpperCase()
}

function normalizeAmount(value: unknown) {
  const next = Number(value)
  if (!Number.isFinite(next)) return 0
  return Math.max(0, Math.round(next))
}

function normalizeDueDay(value: unknown) {
  const next = Number(value)
  if (!Number.isFinite(next)) return 10
  const rounded = Math.round(next)
  if (rounded < 1) return 1
  if (rounded > 31) return 31
  return rounded
}

function normalizeIsActive(value: unknown) {
  if (value == null) return true
  const next = String(value).trim().toLowerCase()
  return !(next === "false" || next === "0" || next === "no")
}

async function authorizeSuperAdmin() {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "SUPER_ADMIN") {
    return null
  }
  return sessionUser
}

async function loadSppDefaultsFromSource() {
  const defaults = await loadDbSppDefaultsWithMigration(getDbSppDefaults())
  setDbSppDefaults(defaults)
  return defaults
}

async function loadGradesFromSource() {
  try {
    const classes = await getAllDbClasses()
    return classes.map((item) => normalizeGrade(item.grade)).filter(Boolean)
  } catch {
    return getDbClasses().map((item) => normalizeGrade(item.grade)).filter(Boolean)
  }
}

function sortByGrade(left: string, right: string) {
  const leftNumeric = Number(left)
  const rightNumeric = Number(right)
  if (Number.isFinite(leftNumeric) && Number.isFinite(rightNumeric)) {
    return leftNumeric - rightNumeric
  }
  return left.localeCompare(right)
}

export async function GET() {
  const sessionUser = await authorizeSuperAdmin()
  if (!sessionUser) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const [defaults, grades] = await Promise.all([
    loadSppDefaultsFromSource(),
    loadGradesFromSource(),
  ])

  return NextResponse.json({
    defaults: defaults.sort((a, b) => sortByGrade(a.grade, b.grade)),
    grades: [...new Set(grades)].sort(sortByGrade),
  })
}

export async function POST(request: Request) {
  const sessionUser = await authorizeSuperAdmin()
  if (!sessionUser) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = (await request.json()) as Partial<SppDefault>
  const grade = normalizeGrade(body.grade)
  const amount = normalizeAmount(body.amount)
  const dueDay = normalizeDueDay(body.dueDay)
  const isActive = normalizeIsActive(body.isActive)

  if (!grade) {
    return NextResponse.json({ error: "Grade wajib diisi" }, { status: 400 })
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Nominal SPP harus lebih dari 0" }, { status: 400 })
  }

  try {
    const created = await createDbSppDefault({
      id: body.id || `spp-${Date.now()}`,
      grade,
      amount,
      dueDay,
      isActive,
    })

    const current = await loadSppDefaultsFromSource()
    setDbSppDefaults([...current.filter((item) => item.id !== created.id), created])

    logAudit({
      actorId: sessionUser.id,
      action: "CREATE",
      entityName: "spp_defaults",
      entityId: created.id,
      oldValue: null,
      newValue: created,
    })

    return NextResponse.json({ sppDefault: created }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat default SPP"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  const sessionUser = await authorizeSuperAdmin()
  if (!sessionUser) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = (await request.json()) as Partial<SppDefault> & { id?: string }
  const id = String(body.id || "").trim()
  if (!id) {
    return NextResponse.json({ error: "ID default SPP wajib diisi" }, { status: 400 })
  }

  try {
    const current = await loadSppDefaultsFromSource()
    const existing = current.find((item) => item.id === id)
    if (!existing) {
      return NextResponse.json({ error: "Default SPP tidak ditemukan" }, { status: 404 })
    }

    const updated = await updateDbSppDefaultById({
      id,
      grade: body.grade != null ? normalizeGrade(body.grade) : undefined,
      amount: body.amount != null ? normalizeAmount(body.amount) : undefined,
      dueDay: body.dueDay != null ? normalizeDueDay(body.dueDay) : undefined,
      isActive: body.isActive != null ? normalizeIsActive(body.isActive) : undefined,
    })

    setDbSppDefaults(current.map((item) => (item.id === id ? updated : item)))

    logAudit({
      actorId: sessionUser.id,
      action: "UPDATE",
      entityName: "spp_defaults",
      entityId: updated.id,
      oldValue: existing,
      newValue: updated,
    })

    return NextResponse.json({ sppDefault: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui default SPP"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await authorizeSuperAdmin()
  if (!sessionUser) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(request.url)
  let id = String(url.searchParams.get("id") || "").trim()
  if (!id) {
    const body = (await request.json().catch(() => ({}))) as { id?: string }
    id = String(body.id || "").trim()
  }

  if (!id) {
    return NextResponse.json({ error: "ID default SPP wajib diisi" }, { status: 400 })
  }

  try {
    const current = await loadSppDefaultsFromSource()
    const existing = current.find((item) => item.id === id)
    if (!existing) {
      return NextResponse.json({ error: "Default SPP tidak ditemukan" }, { status: 404 })
    }

    await deleteDbSppDefaultById(id)
    setDbSppDefaults(current.filter((item) => item.id !== id))

    logAudit({
      actorId: sessionUser.id,
      action: "DELETE",
      entityName: "spp_defaults",
      entityId: id,
      oldValue: existing,
      newValue: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus default SPP"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
