import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getAllDbSchedules } from "@/lib/server/google-sheets-schedules"
import { getSessionUser } from "@/lib/server/session-user"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { assignStudentSeatsToClasses } from "@/lib/server/class-seat-layout"
import {
  getDbActivityPoints,
  getDbAttendance,
  getDbClasses,
  getDbGrades,
  getDbPayments,
  getDbSchedules,
  getDbStudentReports,
  getDbTaskSubmissions,
  getDbTasks,
  getDbStudents,
  type StudentReport,
} from "@/lib/server/data-store"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const [users, classesFromSheet, schedulesFromSheet] = await Promise.all([
    getAllDbUsers(),
    getAllDbClasses(),
    getAllDbSchedules(),
  ])
  const { resolveClassId } = createClassIdResolver(classesFromSheet)
  const sessionUser = await getSessionUser()

  const sheetStudents = users
    .filter((user) => user.role === "STUDENT" && user.isActive)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: "STUDENT" as const,
      classId: resolveClassId(user.classId),
      paymentStatus: "UNPAID" as const,
      behaviorScore: 100,
      attendance: "PRESENT" as const,
      seatRow: Number((user as any).seatRow ?? 0),
      seatCol: Number((user as any).seatCol ?? 0),
      coins: 0,
      streak: Number((user as any).streak ?? 0),
      level: Number((user as any).level ?? 1),
      xp: Number((user as any).xp ?? 0),
    }))

  const storeStudents = getDbStudents().map((student) => ({
    ...student,
    classId: resolveClassId(student.classId),
  }))

  const studentMap = new Map<string, (typeof storeStudents)[number]>()
  for (const student of storeStudents) {
    studentMap.set(student.id, student)
  }
  for (const student of sheetStudents) {
    const existing = studentMap.get(student.id)
    studentMap.set(student.id, {
      ...(existing || student),
      ...student,
      classId: student.classId || existing?.classId || "",
      seatRow: Number(student.seatRow ?? existing?.seatRow ?? 0),
      seatCol: Number(student.seatCol ?? existing?.seatCol ?? 0),
      streak: Number(student.streak ?? existing?.streak ?? 0),
      level: Number(student.level ?? existing?.level ?? 1),
      xp: Number(student.xp ?? existing?.xp ?? 0),
    })
  }

  const mergedStudents = [...studentMap.values()].filter((student) => Boolean(student.classId))
  const students = assignStudentSeatsToClasses(classesFromSheet, mergedStudents as any)
  const teachers = users.filter((user) => user.role === "EMPLOYEE" && user.isActive)

  const studentId =
    url.searchParams.get("studentId") ||
    (sessionUser?.role === "STUDENT" ? sessionUser.id : undefined) ||
    students[0]?.id
  if (!studentId) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  const student = students.find((item) => item.id === studentId)
  if (!student) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  const classId = resolveClassId(student.classId)
  const schedules = schedulesFromSheet
    .map((item) => ({ ...item, classId: resolveClassId(item.classId) }))
    .filter((item) => item.classId === classId)
  const nextClass = schedules[0] || null
  const teacher = nextClass ? teachers.find((item) => item.id === nextClass.teacherId) || null : null
  const studentClass = classesFromSheet.find((item) => item.id === classId) || getDbClasses().find((item) => item.id === classId) || null
  const classmates = students.filter((item) => item.classId === classId)

  const tasks = getDbTasks().filter((task) => resolveClassId(task.classId) === classId)
  const taskSubmissions = getDbTaskSubmissions().filter((submission) => submission.studentId === student.id)
  const grades = getDbGrades().filter((grade) => grade.studentId === student.id)
  const activityPoints = getDbActivityPoints().filter((point) => point.studentId === student.id)
  const attendance = getDbAttendance().filter((record) => record.studentId === student.id)
  const payments = getDbPayments().filter((payment) => payment.studentId === student.id)
  const reports = getDbStudentReports().filter((report) => report.studentId === student.id)

  return NextResponse.json({
    student,
    teacher,
    nextClass,
    studentClass,
    classmates,
    schedules,
    tasks,
    taskSubmissions,
    grades,
    activityPoints,
    attendance,
    payments,
    reports,
  })
}
