import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { createDbClass, getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getAllDbAttendanceRecords } from "@/lib/server/google-sheets-attendance"
import { getAllDbActivityPointsFromSheet } from "@/lib/server/google-sheets-activity-points"
import { getSessionUser } from "@/lib/server/session-user"
import { getDbAdmins, getDbAttendance, getDbClasses, getDbStudents, setDbAttendance, setDbClasses } from "@/lib/server/persistent-store"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { assignStudentSeatsToClasses } from "@/lib/server/class-seat-layout"
import { logAudit } from "@/lib/server/audit-log"

export async function GET() {
  const [users, classesFromSheet] = await Promise.all([
    getAllDbUsers(),
    getAllDbClasses(),
  ])
  let activityPoints = [] as Awaited<ReturnType<typeof getAllDbActivityPointsFromSheet>>
  try {
    activityPoints = await getAllDbActivityPointsFromSheet()
  } catch {
    activityPoints = []
  }
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

  const { resolveClassId } = createClassIdResolver(classesFromSheet)

  const studentsFromStore = getDbStudents()
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
      behaviorScore: 0,
      attendance: "PRESENT" as const,
      seatRow: 0,
      seatCol: 0,
      coins: 0,
      streak: 0,
      level: 0,
      xp: 0,
    }))
  const studentMap = new Map<string, (typeof studentsFromStore)[number]>()
  for (const student of studentsFromUsers) {
    studentMap.set(student.id, student)
  }
  for (const student of studentsFromStore) {
    const fromUsers = studentMap.get(student.id)
    studentMap.set(student.id, {
      ...student,
      name: fromUsers?.name || student.name,
      email: fromUsers?.email || student.email,
      phone: fromUsers?.phone || student.phone,
      classId: fromUsers?.classId || resolveClassId(student.classId),
      avatar: fromUsers?.avatar || student.avatar,
    })
  }

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

  for (const [studentId, latest] of latestAttendanceByStudent.entries()) {
    const current = studentMap.get(studentId)
    if (!current) continue
    studentMap.set(studentId, {
      ...current,
      attendance: latest.status,
    })
  }

  const students = assignStudentSeatsToClasses(classesFromSheet, [...studentMap.values()].map((student) => ({
    ...student,
    classId: resolveClassId(student.classId),
  })))

  const studentIds = new Set(students.map((student) => student.id))
  const pointSummaryByStudentId = activityPoints.reduce((acc, point) => {
    if (!studentIds.has(point.studentId)) {
      return acc
    }
    const bucket = acc[point.studentId] || { positivePoints: 0, negativePoints: 0, totalPoints: 0 }
    if (point.type === "NEGATIVE") {
      bucket.negativePoints += Math.abs(Number(point.points) || 0)
    } else {
      bucket.positivePoints += Math.abs(Number(point.points) || 0)
    }
    bucket.totalPoints = bucket.positivePoints - bucket.negativePoints
    acc[point.studentId] = bucket
    return acc
  }, {} as Record<string, { positivePoints: number; negativePoints: number; totalPoints: number }>)

  const studentsWithPoints = students.map((student) => {
    const summary = pointSummaryByStudentId[student.id] || { positivePoints: 0, negativePoints: 0, totalPoints: 0 }
    return {
      ...student,
      positivePoints: summary.positivePoints,
      negativePoints: summary.negativePoints,
      totalPoints: summary.totalPoints,
      points: summary.totalPoints,
    }
  })

  setDbClasses(classesFromSheet)

  return NextResponse.json({
    admin,
    classes: classesFromSheet,
    students: studentsWithPoints,
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = String(body.name || "").trim()
  const grade = String(body.grade || "").trim()
  const rows = Number(body.rows || 0)
  const cols = Number(body.cols || 0)
  const teacherId = String(body.teacherId || "")

  if (!name || !grade || rows <= 0 || cols <= 0) {
    return NextResponse.json({ error: "Data kelas belum lengkap" }, { status: 400 })
  }

  const next = await createDbClass({ name, grade, rows, cols, teacherId })

  setDbClasses([...getDbClasses().filter((item) => item.id !== next.id), next])
  logAudit({
    action: "CREATE",
    entityName: "classes",
    entityId: next.id,
    oldValue: null,
    newValue: next,
  })

  return NextResponse.json({ classItem: next }, { status: 201 })
}
