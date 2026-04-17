import { NextResponse } from "next/server"
import type { PiketSchedule } from "@/lib/data-model"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import {
  createDbPiketSchedule,
  deleteDbPiketScheduleById,
  loadDbPiketSchedulesWithMigration,
  updateDbPiketScheduleById,
} from "@/lib/server/google-sheets-piket-schedules"
import { getSessionUser } from "@/lib/server/session-user"
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

export async function GET() {
  const [users, schedules] = await Promise.all([
    getAllDbUsers(),
    loadPiketSchedulesFromSource(),
  ])

  const teachers = users
    .filter((user) => user.role === "EMPLOYEE" && user.isActive)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }))

  const teacherPiketSchedules = schedules.filter((item) => Boolean(item.teacherId))

  return NextResponse.json({ teachers, teacherPiketSchedules })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<PiketSchedule>
  const teacherId = String(payload.teacherId || "").trim()
  const day = String(payload.day || "").trim()

  if (!teacherId || !day) {
    return NextResponse.json({ error: "Guru dan hari wajib diisi" }, { status: 400 })
  }

  const schedule: PiketSchedule = {
    id: payload.id || `pkt-${Date.now()}`,
    classId: "",
    day,
    studentIds: [],
    teacherId,
    createdBy: payload.createdBy || (await resolveActorId()),
  }

  try {
    const schedules = await loadPiketSchedulesFromSource()
    const duplicate = schedules.find((item) => item.day === day && item.teacherId === teacherId)
    if (duplicate) {
      return NextResponse.json({ error: "Guru ini sudah dijadwalkan piket di hari tersebut" }, { status: 409 })
    }

    const persisted = await createDbPiketSchedule(schedule)
    setDbPiketSchedules([...schedules.filter((item) => item.id !== persisted.id), persisted])

    logAudit({
      actorId: await resolveActorId(),
      action: "CREATE",
      entityName: "piket_teacher_schedules",
      entityId: persisted.id,
      oldValue: null,
      newValue: persisted,
    })

    return NextResponse.json({ schedule: persisted }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menambah jadwal piket guru"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as Partial<PiketSchedule> & { id?: string }
  const id = String(payload.id || "").trim()
  if (!id) {
    return NextResponse.json({ error: "ID jadwal piket guru wajib diisi" }, { status: 400 })
  }

  const teacherId = payload.teacherId != null ? String(payload.teacherId).trim() : undefined
  const day = payload.day != null ? String(payload.day).trim() : undefined

  try {
    const schedules = await loadPiketSchedulesFromSource()
    const existing = schedules.find((item) => item.id === id && item.teacherId)
    if (!existing) {
      return NextResponse.json({ error: "Jadwal piket guru tidak ditemukan" }, { status: 404 })
    }

    const nextTeacherId = teacherId || existing.teacherId || ""
    const nextDay = day || existing.day
    const duplicate = schedules.find(
      (item) => item.id !== id && item.teacherId === nextTeacherId && item.day === nextDay,
    )
    if (duplicate) {
      return NextResponse.json({ error: "Guru ini sudah dijadwalkan piket di hari tersebut" }, { status: 409 })
    }

    const updated = await updateDbPiketScheduleById({
      id,
      teacherId: nextTeacherId,
      day: nextDay,
      classId: existing.classId || "",
      studentIds: existing.studentIds,
    })

    setDbPiketSchedules(schedules.map((item) => (item.id === id ? updated : item)))

    logAudit({
      actorId: await resolveActorId(),
      action: "UPDATE",
      entityName: "piket_teacher_schedules",
      entityId: updated.id,
      oldValue: existing,
      newValue: updated,
    })

    return NextResponse.json({ schedule: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui jadwal piket guru"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  let id = String(url.searchParams.get("id") || "").trim()
  if (!id) {
    const body = (await request.json().catch(() => ({}))) as { id?: string }
    id = String(body.id || "").trim()
  }

  if (!id) {
    return NextResponse.json({ error: "ID jadwal piket guru wajib diisi" }, { status: 400 })
  }

  try {
    const schedules = await loadPiketSchedulesFromSource()
    const existing = schedules.find((item) => item.id === id && item.teacherId)
    if (!existing) {
      return NextResponse.json({ error: "Jadwal piket guru tidak ditemukan" }, { status: 404 })
    }

    await deleteDbPiketScheduleById(id)
    setDbPiketSchedules(schedules.filter((item) => item.id !== id))

    logAudit({
      actorId: await resolveActorId(),
      action: "DELETE",
      entityName: "piket_teacher_schedules",
      entityId: existing.id,
      oldValue: existing,
      newValue: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus jadwal piket guru"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
