import { NextResponse } from "next/server"
import type { AttendanceRecord, AttendanceStatus } from "@/lib/data-model"
import { getSessionUser } from "@/lib/server/session-user"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getDbAttendance, getDbStudents, setDbAttendance, setDbStudents } from "@/lib/server/data-store"
import { getAllDbAttendanceRecords, upsertDbAttendanceRecord } from "@/lib/server/google-sheets-attendance"
import { logAudit } from "@/lib/server/audit-log"

const VALID_STATUSES: AttendanceStatus[] = ["PRESENT", "SICK", "ALPHA"]

export async function POST(request: Request) {
  const body = (await request.json()) as {
    studentId?: string
    status?: AttendanceStatus
    date?: string
  }

  const studentId = String(body.studentId || "").trim()
  const status = body.status
  const date = String(body.date || new Date().toISOString().slice(0, 10)).slice(0, 10)

  if (!studentId || !status) {
    return NextResponse.json({ error: "studentId dan status wajib diisi" }, { status: 400 })
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Status attendance tidak valid" }, { status: 400 })
  }

  let students = getDbStudents()
  let targetStudent = students.find((student) => student.id === studentId)

  if (!targetStudent) {
    try {
      const users = await getAllDbUsers()
      const studentUser = users.find((user) => user.role === "STUDENT" && user.id === studentId && user.isActive)
      if (studentUser) {
        targetStudent = {
          id: studentUser.id,
          name: studentUser.name,
          email: studentUser.email,
          phone: studentUser.phone,
          avatar: studentUser.avatar,
          role: "STUDENT",
          classId: studentUser.classId || "",
          paymentStatus: "UNPAID",
          behaviorScore: 100,
          attendance: "PRESENT",
          seatRow: 0,
          seatCol: 0,
          coins: 0,
          streak: 0,
          level: 1,
          xp: 0,
        }
        students = [...students.filter((student) => student.id !== studentId), targetStudent]
      }
    } catch {
      // Keep fallback to local store only when users sheet is unavailable.
    }
  }

  if (!targetStudent) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  let attendance = getDbAttendance()
  try {
    attendance = await getAllDbAttendanceRecords()
    setDbAttendance(attendance)
  } catch {
    // Fallback to in-memory attendance when Google Sheets is unavailable.
  }

  const recordId = `att-${studentId}-${date}`
  const existing = attendance.find((record) => record.id === recordId)

  const nextRecord: AttendanceRecord = {
    id: recordId,
    studentId,
    date,
    status,
    notes: existing?.notes,
  }

  let persistedRecord = nextRecord
  try {
    persistedRecord = await upsertDbAttendanceRecord({
      id: recordId,
      studentId,
      date,
      status,
      notes: existing?.notes,
    })
  } catch {
    // Fallback to in-memory attendance when Google Sheets is unavailable.
  }

  const nextAttendance = existing
    ? attendance.map((record) => (record.id === recordId ? persistedRecord : record))
    : [persistedRecord, ...attendance]

  setDbAttendance(nextAttendance)
  setDbStudents(students.map((student) => (student.id === studentId ? { ...student, attendance: status } : student)))

  const sessionUser = await getSessionUser()
  logAudit({
    actorId: sessionUser?.id || "system",
    action: existing ? "UPDATE" : "CREATE",
    entityName: "attendance",
    entityId: recordId,
    oldValue: existing || null,
    newValue: persistedRecord,
  })

  return NextResponse.json({ success: true, record: persistedRecord, studentId })
}
