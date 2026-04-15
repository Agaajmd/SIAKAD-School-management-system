import { NextResponse } from "next/server"
import { type ActivityPoint } from "@/lib/data-model"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getDbActivityPoints, getDbStudents, setDbActivityPoints } from "@/lib/server/persistent-store"
import { createDbActivityPoint, getAllDbActivityPointsFromSheet } from "@/lib/server/google-sheets-activity-points"
import { getSessionUser } from "@/lib/server/session-user"
import { logAudit } from "@/lib/server/audit-log"

export async function POST(request: Request) {
  const payload = (await request.json()) as ActivityPoint
  const sessionUser = await getSessionUser()
  const givenBy = sessionUser?.role === "EMPLOYEE" ? sessionUser.id : payload.givenBy
  const points = Number(payload.points)

  if (!payload.studentId || !payload.type || !payload.category || !payload.description || !givenBy) {
    return NextResponse.json({ error: "Data poin aktivitas belum lengkap" }, { status: 400 })
  }

  if (!Number.isFinite(points) || points === 0) {
    return NextResponse.json({ error: "Poin aktivitas tidak valid" }, { status: 400 })
  }

  let students = getDbStudents()
  let targetStudent = students.find((student) => student.id === payload.studentId)

  if (!targetStudent) {
    try {
      const users = await getAllDbUsers()
      const user = users.find((item) => item.role === "STUDENT" && item.id === payload.studentId && item.isActive)
      if (user) {
        targetStudent = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: "STUDENT",
          classId: user.classId || "",
          paymentStatus: "UNPAID",
          behaviorScore: 0,
          attendance: "PRESENT",
          seatRow: 0,
          seatCol: 0,
          coins: 0,
          streak: 0,
          level: 0,
          xp: 0,
        }
        students = [...students.filter((student) => student.id !== user.id), targetStudent]
      }
    } catch {
      // Keep fallback to local store only when users sheet is unavailable.
    }
  }

  if (!targetStudent) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  const normalizedPoints = payload.type === "NEGATIVE" ? -Math.abs(points) : Math.abs(points)

  const nextPoint: ActivityPoint = {
    ...payload,
    points: normalizedPoints,
    givenBy,
    id: payload.id || `ap-${Date.now()}`,
    date: payload.date || new Date().toISOString().slice(0, 10),
  }

  let persistedPoint = nextPoint
  try {
    persistedPoint = await createDbActivityPoint(nextPoint)
  } catch {
    // Fallback to in-memory activity points when Google Sheets is unavailable.
  }

  let activityPoints = getDbActivityPoints()
  try {
    activityPoints = await getAllDbActivityPointsFromSheet()
  } catch {
    activityPoints = [...activityPoints, persistedPoint]
  }
  setDbActivityPoints(activityPoints)

  logAudit({
    actorId: persistedPoint.givenBy,
    action: "CREATE",
    entityName: "activity_points",
    entityId: persistedPoint.id,
    oldValue: null,
    newValue: persistedPoint,
  })
  return NextResponse.json({ point: persistedPoint }, { status: 201 })
}
