import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { createDbClass, getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getSessionUser } from "@/lib/server/session-user"
import { getDbAdmins, getDbClasses, getDbStudents, setDbClasses } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function GET() {
  const [users, classesFromSheet] = await Promise.all([
    getAllDbUsers(),
    getAllDbClasses(),
  ])
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

  const classIdSet = new Set(classesFromSheet.map((item) => item.id))
  const classNameToId = new Map(classesFromSheet.map((item) => [item.name.trim().toLowerCase(), item.id]))
  const resolveClassId = (rawClassId: string | undefined) => {
    const value = String(rawClassId || "").trim()
    if (!value) return ""
    if (classIdSet.has(value)) return value
    return classNameToId.get(value.toLowerCase()) || value
  }

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
      behaviorScore: 100,
      attendance: "PRESENT" as const,
      seatRow: 0,
      seatCol: 0,
      coins: 0,
      streak: 0,
      level: 1,
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
  const students = [...studentMap.values()]

  setDbClasses(classesFromSheet)

  return NextResponse.json({
    admin,
    classes: classesFromSheet,
    students,
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
