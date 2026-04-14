import { NextResponse } from "next/server"
import type { Schedule } from "@/lib/data-model"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import {
  createDbSchedule,
  deleteDbScheduleById,
  getAllDbSchedules,
  updateDbScheduleById,
} from "@/lib/server/google-sheets-schedules"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbAdmins,
  getDbClasses,
  getDbPiketSchedules,
  getDbSchedules,
  getDbStudents,
  getDbTeachers,
  setDbSchedules,
} from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function GET() {
  const users = await getAllDbUsers()
  const schedulesFromSheet = await getAllDbSchedules()
  setDbSchedules(schedulesFromSheet)
  const sessionUser = await getSessionUser()
  const adminFromSession =
    sessionUser?.role === "ADMIN" && sessionUser.isActive
      ? {
          id: sessionUser.id,
          name: sessionUser.name,
          email: sessionUser.email,
          avatar: sessionUser.avatar,
          role: "ADMIN" as const,
        }
      : null
  const adminFromUsers =
    users.find((user) => user.role === "ADMIN" && user.isActive) ||
    users.find((user) => user.role === "SUPER_ADMIN" && user.isActive) ||
    null
  const admin =
    adminFromSession ||
    (adminFromUsers
      ? {
          id: adminFromUsers.id,
          name: adminFromUsers.name,
          email: adminFromUsers.email,
          avatar: adminFromUsers.avatar,
          role: adminFromUsers.role,
        }
      : null) ||
    getDbAdmins()[0] ||
    null

  const classesFromSheet = await getAllDbClasses()
  const classesMap = new Map<string, { id: string; name: string }>()
  for (const classItem of classesFromSheet) {
    classesMap.set(classItem.id, { id: classItem.id, name: classItem.name })
  }
  for (const classItem of getDbClasses()) {
    classesMap.set(classItem.id, { id: classItem.id, name: classItem.name })
  }
  const classes = [...classesMap.values()]

  const teachersFromUsers = users
    .filter((user) => user.role === "EMPLOYEE" && user.isActive)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: "EMPLOYEE" as const,
      subject: user.subject || "",
      rating: 0,
      classesCount: 0,
      phone: user.phone,
    }))
  const teacherMap = new Map<string, { id: string; name: string }>()
  for (const teacher of teachersFromUsers) {
    teacherMap.set(teacher.id, { id: teacher.id, name: teacher.name })
  }
  for (const teacher of getDbTeachers()) {
    teacherMap.set(teacher.id, { id: teacher.id, name: teacher.name })
  }
  const teachers = [...teacherMap.values()]

  const students = users
    .filter((user) => user.role === "STUDENT" && user.isActive)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: "STUDENT" as const,
      classId: user.classId || "",
      phone: user.phone,
      paymentStatus: "UNPAID" as const,
      behaviorScore: 100,
      attendance: "PRESENT" as const,
      seatRow: 0,
      seatCol: 0,
      coins: 0,
      streak: 0,
      level: 1,
      xp: 0,
    }))

  return NextResponse.json({
    admin,
    schedules: schedulesFromSheet,
    classes,
    teachers,
    students: students.length > 0 ? students : getDbStudents(),
    piketSchedules: getDbPiketSchedules(),
  })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<Schedule>

  if (!payload.classId || !payload.subject || !payload.teacherId || !payload.day || !payload.startTime || !payload.endTime) {
    return NextResponse.json({ error: "Data jadwal belum lengkap" }, { status: 400 })
  }

  const schedule = await createDbSchedule({
    classId: payload.classId,
    subject: payload.subject,
    teacherId: payload.teacherId,
    day: payload.day,
    startTime: payload.startTime,
    endTime: payload.endTime,
    room: payload.room || "",
  })
  const schedulesFromSheet = await getAllDbSchedules()
  setDbSchedules(schedulesFromSheet)
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

  const schedulesFromSheet = await getAllDbSchedules()
  setDbSchedules(schedulesFromSheet)
  const existing = schedulesFromSheet.find((item) => item.id === payload.id)
  if (!existing) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 })
  }

  const updated = await updateDbScheduleById({
    id: existing.id,
    classId: payload.classId,
    subject: payload.subject,
    teacherId: payload.teacherId,
    day: payload.day,
    startTime: payload.startTime,
    endTime: payload.endTime,
    room: payload.room,
  })
  setDbSchedules(schedulesFromSheet.map((item) => (item.id === existing.id ? updated : item)))
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

  const schedulesFromSheet = await getAllDbSchedules()
  setDbSchedules(schedulesFromSheet)
  const existing = schedulesFromSheet.find((item) => item.id === id)
  if (!existing) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 })
  }

  await deleteDbScheduleById(id)
  setDbSchedules(schedulesFromSheet.filter((item) => item.id !== id))
  logAudit({
    actorId: getDbAdmins()[0]?.id || "admin",
    action: "DELETE",
    entityName: "schedules",
    entityId: existing.id,
    oldValue: existing,
  })

  return NextResponse.json({ success: true })
}
