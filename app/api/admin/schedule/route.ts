import { NextResponse } from "next/server"
import type { Schedule } from "@/lib/data-model"
import {
  getDbAdmins,
  getDbClasses,
  getDbPiketSchedules,
  getDbSchedules,
  getDbStudents,
  getDbTeachers,
  setDbSchedules,
} from "@/lib/server/mock-db"
import { logAudit } from "@/lib/server/audit-log"

export async function GET() {
  return NextResponse.json({
    admin: getDbAdmins()[0] || null,
    schedules: getDbSchedules(),
    classes: getDbClasses(),
    teachers: getDbTeachers(),
    students: getDbStudents(),
    piketSchedules: getDbPiketSchedules(),
  })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<Schedule>

  if (!payload.classId || !payload.subject || !payload.teacherId || !payload.day || !payload.startTime || !payload.endTime || !payload.room) {
    return NextResponse.json({ error: "Data jadwal belum lengkap" }, { status: 400 })
  }

  const schedules = getDbSchedules()
  const schedule: Schedule = {
    id: `sch-${Date.now()}`,
    classId: payload.classId,
    subject: payload.subject,
    teacherId: payload.teacherId,
    day: payload.day,
    startTime: payload.startTime,
    endTime: payload.endTime,
    room: payload.room,
  }

  setDbSchedules([...schedules, schedule])
  logAudit({
    actorId: getDbAdmins()[0]?.id || "admin",
    action: "CREATE",
    entityName: "schedules",
    entityId: schedule.id,
    newValue: schedule,
  })

  return NextResponse.json({ schedule }, { status: 201 })
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as Partial<Schedule> & { id?: string }
  if (!payload.id) {
    return NextResponse.json({ error: "ID jadwal wajib diisi" }, { status: 400 })
  }

  const schedules = getDbSchedules()
  const existing = schedules.find((item) => item.id === payload.id)
  if (!existing) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 })
  }

  const updated: Schedule = {
    ...existing,
    ...payload,
    id: existing.id,
  }

  setDbSchedules(schedules.map((item) => (item.id === existing.id ? updated : item)))
  logAudit({
    actorId: getDbAdmins()[0]?.id || "admin",
    action: "UPDATE",
    entityName: "schedules",
    entityId: updated.id,
    oldValue: existing,
    newValue: updated,
  })

  return NextResponse.json({ schedule: updated })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "ID jadwal wajib diisi" }, { status: 400 })
  }

  const schedules = getDbSchedules()
  const existing = schedules.find((item) => item.id === id)
  if (!existing) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 })
  }

  setDbSchedules(schedules.filter((item) => item.id !== id))
  logAudit({
    actorId: getDbAdmins()[0]?.id || "admin",
    action: "DELETE",
    entityName: "schedules",
    entityId: existing.id,
    oldValue: existing,
  })

  return NextResponse.json({ success: true })
}
