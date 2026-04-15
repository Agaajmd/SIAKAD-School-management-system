import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getAllDbAttendanceRecords } from "@/lib/server/google-sheets-attendance"
import { getAllDbSchedules } from "@/lib/server/google-sheets-schedules"
import { getSessionUser } from "@/lib/server/session-user"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { assignStudentSeatsToClasses } from "@/lib/server/class-seat-layout"
import {
  getDbAttendance,
  getDbClasses,
  getDbPiketSchedules,
  getDbStudents,
  getDbTaskSubmissions,
  getDbTasks,
  getDbTeachers,
  setDbAttendance,
  setDbSchedules,
  setDbStudents,
} from "@/lib/server/data-store"

const normalizeId = (value: unknown) => String(value || "").trim().toLowerCase()

const sameId = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeId(left)
  const normalizedRight = normalizeId(right)
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight
}

export async function GET() {
  const sessionUser = await getSessionUser()
  const users = await getAllDbUsers()
  const classesFromSheet = await getAllDbClasses()
  const schedulesFromSheet = await getAllDbSchedules()
  const { resolveClassId } = createClassIdResolver(classesFromSheet)
  setDbSchedules(schedulesFromSheet)
  const mappedTeacher =
    sessionUser?.role === "EMPLOYEE"
      ? getDbTeachers().find((teacher) => sameId(teacher.id, sessionUser.id)) || null
      : null

  const employee = sessionUser?.role === "EMPLOYEE"
    ? {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        avatar: sessionUser.avatar,
        role: "EMPLOYEE" as const,
        subject: sessionUser.subject || mappedTeacher?.subject || "",
        rating: mappedTeacher?.rating || 0,
        classesCount: mappedTeacher?.classesCount || 0,
        homeroomClassId: mappedTeacher?.homeroomClassId,
      }
    : getDbTeachers()[0] || null

  const employeeId = String(employee?.id || "").trim()

  const schedules = employeeId
    ? schedulesFromSheet
        .filter((schedule) => sameId(schedule.teacherId, employeeId))
        .map((schedule) => ({ ...schedule, classId: resolveClassId(schedule.classId) }))
    : []
  const classIds = new Set(schedules.map((schedule) => schedule.classId).filter(Boolean))

  if (employeeId) {
    for (const classRoom of classesFromSheet) {
      if (sameId(classRoom.teacherId, employeeId)) {
        classIds.add(classRoom.id)
      }
    }
    for (const classRoom of getDbClasses()) {
      if (sameId(classRoom.teacherId, employeeId)) {
        classIds.add(resolveClassId(classRoom.id))
      }
    }
    for (const task of getDbTasks()) {
      if (sameId(task.teacherId, employeeId)) {
        const normalizedClassId = resolveClassId(task.classId)
        if (normalizedClassId) {
          classIds.add(normalizedClassId)
        }
      }
    }

    const normalizedHomeroomId = resolveClassId(employee?.homeroomClassId)
    if (normalizedHomeroomId) {
      classIds.add(normalizedHomeroomId)
    }
  }

  const classesMap = new Map<string, { id: string; name: string; grade: string; rows: number; cols: number; teacherId: string }>()
  for (const classRoom of classesFromSheet) {
    const normalizedClassId = resolveClassId(classRoom.id)
    if (normalizedClassId && classIds.has(normalizedClassId)) {
      classesMap.set(normalizedClassId, { ...classRoom, id: normalizedClassId })
    }
  }
  for (const classRoom of getDbClasses()) {
    const normalizedClassId = resolveClassId(classRoom.id)
    if (normalizedClassId && classIds.has(normalizedClassId)) {
      classesMap.set(normalizedClassId, { ...classRoom, id: normalizedClassId })
    }
  }
  const classes = [...classesMap.values()]

  const storeStudents = getDbStudents().map((student) => ({
    ...student,
    classId: resolveClassId(student.classId),
  }))

  const studentsFromUsers = users
    .filter((user) => user.role === "STUDENT" && user.isActive)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      classId: resolveClassId(user.classId),
      avatar: user.avatar,
      role: "STUDENT" as const,
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

  const studentMap = new Map<string, (typeof storeStudents)[number]>()
  for (const student of storeStudents) {
    studentMap.set(student.id, student)
  }
  for (const student of studentsFromUsers) {
    const existing = studentMap.get(student.id)
    studentMap.set(student.id, {
      ...(existing || student),
      ...student,
      classId: student.classId || existing?.classId || "",
      paymentStatus: existing?.paymentStatus || student.paymentStatus,
      behaviorScore: Number(existing?.behaviorScore ?? student.behaviorScore),
      attendance: existing?.attendance || student.attendance,
      seatRow: Number(existing?.seatRow ?? student.seatRow),
      seatCol: Number(existing?.seatCol ?? student.seatCol),
      coins: Number(existing?.coins ?? student.coins),
      streak: Number(existing?.streak ?? student.streak),
      level: Number(existing?.level ?? student.level),
      xp: Number(existing?.xp ?? student.xp),
    })
  }

  const students = [...studentMap.values()].filter(
    (student) => Boolean(student.classId) && classIds.has(student.classId),
  )

  let attendanceRecords = getDbAttendance()
  try {
    attendanceRecords = await getAllDbAttendanceRecords()
    setDbAttendance(attendanceRecords)
  } catch {
    // Fallback to in-memory attendance cache.
  }

  const latestAttendanceByStudent = new Map<string, { date: string; status: "PRESENT" | "SICK" | "ALPHA" }>()
  for (const record of attendanceRecords) {
    const existing = latestAttendanceByStudent.get(record.studentId)
    if (!existing || record.date >= existing.date) {
      latestAttendanceByStudent.set(record.studentId, {
        date: record.date,
        status: record.status,
      })
    }
  }

  const studentsWithAttendance = students.map((student) => {
    const latestAttendance = latestAttendanceByStudent.get(student.id)
    if (!latestAttendance) return student
    return {
      ...student,
      attendance: latestAttendance.status,
    }
  })

  const seatedStudents = assignStudentSeatsToClasses(classes, studentsWithAttendance as any)
  setDbStudents(seatedStudents as any)

  const tasks = employeeId ? getDbTasks().filter((task) => sameId(task.teacherId, employeeId)) : []
  const taskIds = new Set(tasks.map((task) => task.id))
  const taskSubmissions = getDbTaskSubmissions().filter((submission) => taskIds.has(submission.taskId))

  return NextResponse.json({
    employee,
    classes,
    schedules,
    students: seatedStudents,
    piketSchedules: getDbPiketSchedules(),
    tasks,
    taskSubmissions,
  })
}
