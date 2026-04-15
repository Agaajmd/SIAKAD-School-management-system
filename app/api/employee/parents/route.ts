import { NextResponse } from "next/server"
import { createDbUser, deleteDbUserById, getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getAllDbActivityPointsFromSheet } from "@/lib/server/google-sheets-activity-points"
import { getDbParents, setDbParents } from "@/lib/server/persistent-store"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { logAudit } from "@/lib/server/audit-log"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/

export async function GET(request: Request) {
  const url = new URL(request.url)
  const classId = String(url.searchParams.get("classId") || "").trim()

  const [users, classes] = await Promise.all([getAllDbUsers(), getAllDbClasses()])
  const { resolveClassId } = createClassIdResolver(classes)
  const normalizedClassId = resolveClassId(classId)

  const students = users
    .filter((user) => user.role === "STUDENT" && user.isActive)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
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
    .filter((student) => (normalizedClassId ? student.classId === normalizedClassId : true))

  let activityPoints = [] as Awaited<ReturnType<typeof getAllDbActivityPointsFromSheet>>
  try {
    activityPoints = await getAllDbActivityPointsFromSheet()
  } catch {
    activityPoints = []
  }

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

  const parents = getDbParents()
    .filter((parent) => parent.childrenIds.some((childId) => studentIds.has(childId)))
    .map((parent) => {
      const firstChildId = parent.childrenIds.find((childId) => studentIds.has(childId)) || ""
      const firstChild = studentsWithPoints.find((student) => student.id === firstChildId)
      return {
        ...parent,
        childId: firstChildId,
        childName: firstChild?.name || "-",
      }
    })

  return NextResponse.json({ parents, students: studentsWithPoints })
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const phone = String(body.phone || "").trim()
  const password = String(body.password || "")
  const childId = String(body.childId || "").trim()
  const classId = String(body.classId || "").trim()

  if (!name || !email || !phone || !password || !childId) {
    return NextResponse.json({ error: "Data orang tua belum lengkap" }, { status: 400 })
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
  }

  if (!WHATSAPP_REGEX.test(phone)) {
    return NextResponse.json({ error: "Format nomor WhatsApp Indonesia tidak valid" }, { status: 400 })
  }

  const [users, classes] = await Promise.all([getAllDbUsers(), getAllDbClasses()])
  const { resolveClassId } = createClassIdResolver(classes)
  const normalizedClassId = resolveClassId(classId)
  const hasClassFilter = Boolean(normalizedClassId && classes.some((item) => item.id === normalizedClassId))
  const child = users.find((user) => user.id === childId && user.role === "STUDENT")
  const childExists = Boolean(child)
  if (!childExists) {
    return NextResponse.json({ error: "Data anak tidak ditemukan" }, { status: 404 })
  }
  if (hasClassFilter && resolveClassId(child?.classId) !== normalizedClassId) {
    return NextResponse.json({ error: "Anak tidak terdaftar di kelas ini" }, { status: 400 })
  }

  const user = await createDbUser({
    name,
    email,
    phone,
    password,
    role: "PARENT",
    avatar: "/placeholder-user.jpg",
  })

  const next = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: "PARENT" as const,
    childrenIds: [childId],
    phone,
  }

  setDbParents([...getDbParents(), next])
  logAudit({
    actorId: user.id,
    action: "CREATE",
    entityName: "parents",
    entityId: next.id,
    oldValue: null,
    newValue: next,
  })

  return NextResponse.json({ parent: next }, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const id = String(body.id || "").trim()
  const classId = String(body.classId || "").trim()
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  if (body.email != null && !EMAIL_REGEX.test(String(body.email).trim().toLowerCase())) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
  }

  if (body.phone != null && !WHATSAPP_REGEX.test(String(body.phone).trim())) {
    return NextResponse.json({ error: "Format nomor WhatsApp Indonesia tidak valid" }, { status: 400 })
  }

  const parents = getDbParents()
  const target = parents.find((item) => item.id === id)
  if (!target) {
    return NextResponse.json({ error: "Orang tua tidak ditemukan" }, { status: 404 })
  }

  if (body.childId || classId) {
    const [users, classes] = await Promise.all([getAllDbUsers(), getAllDbClasses()])
    const { resolveClassId } = createClassIdResolver(classes)
    const normalizedClassId = resolveClassId(classId)
    const hasClassFilter = Boolean(normalizedClassId && classes.some((item) => item.id === normalizedClassId))
    const targetChildId = String(body.childId || target.childrenIds[0] || "").trim()
    const child = users.find((user) => user.id === targetChildId && user.role === "STUDENT")
    if (!child) {
      return NextResponse.json({ error: "Data anak tidak ditemukan" }, { status: 404 })
    }
    if (hasClassFilter && resolveClassId(child.classId) !== normalizedClassId) {
      return NextResponse.json({ error: "Anak tidak terdaftar di kelas ini" }, { status: 400 })
    }
  }

  await updateDbUserById({
    id,
    name: body.name ? String(body.name) : undefined,
    email: body.email ? String(body.email) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
    password: body.password ? String(body.password) : undefined,
  })

  const next = {
    ...target,
    name: body.name ? String(body.name) : target.name,
    email: body.email ? String(body.email) : target.email,
    phone: body.phone ? String(body.phone) : target.phone,
    childrenIds: body.childId ? [String(body.childId)] : target.childrenIds,
  }

  setDbParents(parents.map((item) => (item.id === id ? next : item)))
  logAudit({
    actorId: id,
    action: "UPDATE",
    entityName: "parents",
    entityId: id,
    oldValue: target,
    newValue: next,
  })

  return NextResponse.json({ parent: next })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  let id = String(url.searchParams.get("id") || "").trim()
  if (!id) {
    const body = (await request.json().catch(() => ({}))) as { id?: string }
    id = String(body.id || "").trim()
  }
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  const parents = getDbParents()
  const target = parents.find((item) => item.id === id)
  if (!target) {
    return NextResponse.json({ error: "Orang tua tidak ditemukan" }, { status: 404 })
  }

  setDbParents(parents.filter((item) => item.id !== id))
  await deleteDbUserById(id)
  logAudit({
    actorId: id,
    action: "DELETE",
    entityName: "parents",
    entityId: id,
    oldValue: target,
    newValue: null,
  })

  return NextResponse.json({ success: true })
}
