import { NextResponse } from "next/server"
import type { PiketSchedule } from "@/lib/data-model"
import { getSessionUser } from "@/lib/server/session-user"
import {
  createDbPiketSchedule,
  deleteDbPiketScheduleById,
  loadDbPiketSchedulesWithMigration,
  updateDbPiketScheduleById,
} from "@/lib/server/google-sheets-piket-schedules"
import { getDbPiketSchedules, setDbPiketSchedules } from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"

async function resolveActorId() {
  const user = await getSessionUser()
  return user?.id || "system"
}

async function loadPiketSchedulesFromSource() {
  const schedules = await loadDbPiketSchedulesWithMigration(getDbPiketSchedules())
  setDbPiketSchedules(schedules)
  return schedules
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const classId = String(url.searchParams.get("classId") || "").trim()
  const schedules = (await loadPiketSchedulesFromSource()).filter((item) => (classId ? item.classId === classId : true))
  return NextResponse.json({ schedules })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<PiketSchedule>
  if (!payload.classId || !payload.day || !Array.isArray(payload.studentIds) || payload.studentIds.length === 0) {
    return NextResponse.json({ error: "Data jadwal piket belum lengkap" }, { status: 400 })
  }

  const schedule: PiketSchedule = {
    id: payload.id || `pk-${Date.now()}`,
    classId: payload.classId,
    day: payload.day,
    studentIds: payload.studentIds,
    createdBy: payload.createdBy || (await resolveActorId()),
  }

  let persisted = schedule
  try {
    await loadPiketSchedulesFromSource()
    persisted = await createDbPiketSchedule(schedule)
  } catch {
    persisted = schedule
  }

  setDbPiketSchedules([...getDbPiketSchedules().filter((item) => item.id !== persisted.id), persisted])
  logAudit({
    actorId: await resolveActorId(),
    action: "CREATE",
    entityName: "piket_schedules",
    entityId: persisted.id,
    newValue: persisted,
  })

  return NextResponse.json({ schedule: persisted }, { status: 201 })
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as Partial<PiketSchedule> & { id?: string }
  if (!payload.id) {
    return NextResponse.json({ error: "ID jadwal piket wajib diisi" }, { status: 400 })
  }

  const schedules = await loadPiketSchedulesFromSource()
  const existing = schedules.find((item) => item.id === payload.id)
  if (!existing) {
    return NextResponse.json({ error: "Jadwal piket tidak ditemukan" }, { status: 404 })
  }

  if (payload.studentIds && payload.studentIds.length === 0) {
    return NextResponse.json({ error: "Pilih minimal 1 siswa" }, { status: 400 })
  }

  const updated: PiketSchedule = {
    ...existing,
    ...payload,
    id: existing.id,
  }

  let persisted = updated
  try {
    persisted = await updateDbPiketScheduleById(updated)
  } catch {
    persisted = updated
  }

  setDbPiketSchedules(schedules.map((item) => (item.id === existing.id ? persisted : item)))
  logAudit({
    actorId: await resolveActorId(),
    action: "UPDATE",
    entityName: "piket_schedules",
    entityId: persisted.id,
    oldValue: existing,
    newValue: persisted,
  })

  return NextResponse.json({ schedule: persisted })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  let id = String(url.searchParams.get("id") || "").trim()
  if (!id) {
    const body = (await request.json().catch(() => ({}))) as { id?: string }
    id = String(body.id || "").trim()
  }

  if (!id) {
    return NextResponse.json({ error: "ID jadwal piket wajib diisi" }, { status: 400 })
  }

  const schedules = await loadPiketSchedulesFromSource()
  const existing = schedules.find((item) => item.id === id)
  if (!existing) {
    return NextResponse.json({ error: "Jadwal piket tidak ditemukan" }, { status: 404 })
  }

  try {
    await deleteDbPiketScheduleById(id)
  } catch {
    // Fallback to local deletion if Sheets is unavailable.
  }

  setDbPiketSchedules(schedules.filter((item) => item.id !== id))
  logAudit({
    actorId: await resolveActorId(),
    action: "DELETE",
    entityName: "piket_schedules",
    entityId: existing.id,
    oldValue: existing,
  })

  return NextResponse.json({ success: true })
}