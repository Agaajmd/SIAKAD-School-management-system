import { NextResponse } from "next/server"
import type { StudentGrade } from "@/lib/data-model"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getDbGrades, getDbStudents, setDbGrades } from "@/lib/server/data-store"
import { getAllDbGradesFromSheet, replaceAllDbGradesToSheet } from "@/lib/server/google-sheets-grades"
import { getSessionUser } from "@/lib/server/session-user"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { logAudit } from "@/lib/server/audit-log"

const clampScore = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(100, parsed))
}

const optionalScore = (value: unknown): number | undefined => {
  if (value == null || String(value).trim() === "") return undefined
  return clampScore(value, 0)
}

const deriveAttitude = (score: number): "A" | "B" | "C" | "D" => {
  if (score >= 90) return "A"
  if (score >= 80) return "B"
  if (score >= 70) return "C"
  return "D"
}

const normalizeDetailedGrade = (
  input: Partial<StudentGrade>,
  options: { id: string; teacherId: string; subject: string },
): StudentGrade => {
  const assignmentScore = clampScore(input.assignmentScore ?? input.knowledge, 0)
  const practiceScore = clampScore(input.practiceScore ?? input.skill, 0)
  const utsScore = optionalScore(input.utsScore)
  const uasScore = clampScore(input.uasScore ?? input.knowledge, 0)
  const schoolExamScore = clampScore(input.schoolExamScore ?? input.knowledge, 0)

  const knowledgeSources = [assignmentScore, uasScore, schoolExamScore]
  if (typeof utsScore === "number") {
    knowledgeSources.push(utsScore)
  }
  const derivedKnowledge = Math.round(
    knowledgeSources.reduce((total, value) => total + value, 0) / Math.max(knowledgeSources.length, 1),
  )
  const knowledge = clampScore(input.knowledge, derivedKnowledge)
  const skill = clampScore(input.skill, practiceScore)
  const overall = Math.round((knowledge + skill) / 2)

  const attitude: StudentGrade["attitude"] =
    input.attitude === "A" || input.attitude === "B" || input.attitude === "C" || input.attitude === "D"
      ? input.attitude
      : deriveAttitude(overall)

  return {
    id: options.id,
    studentId: String(input.studentId || ""),
    subject: options.subject,
    teacherId: options.teacherId,
    semester: String(input.semester || "Ganjil 2026"),
    assignmentScore,
    practiceScore,
    utsScore,
    uasScore,
    schoolExamScore,
    knowledge,
    skill,
    attitude,
    notes: String(input.notes || ""),
  }
}

async function loadGradesFromSheetOrStore() {
  try {
    const grades = await getAllDbGradesFromSheet()
    setDbGrades(grades)
    return grades
  } catch {
    return getDbGrades()
  }
}

async function resolveClassStudentIds(classId: string) {
  if (!classId) return new Set<string>()

  try {
    const [classes, users] = await Promise.all([getAllDbClasses(), getAllDbUsers()])
    const { resolveClassId } = createClassIdResolver(classes)
    const normalizedClassId = resolveClassId(classId)

    const idsFromStore = new Set(
      getDbStudents()
        .filter((student) => resolveClassId(student.classId) === normalizedClassId)
        .map((student) => student.id),
    )
    if (idsFromStore.size > 0) {
      return idsFromStore
    }

    return new Set(
      users
        .filter((user) => user.role === "STUDENT" && user.isActive && resolveClassId(user.classId) === normalizedClassId)
        .map((user) => user.id),
    )
  } catch {
    return new Set(getDbStudents().filter((student) => student.classId === classId).map((student) => student.id))
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sessionUser = await getSessionUser()
  const queryTeacherId = url.searchParams.get("teacherId")
  const teacherId = sessionUser?.role === "EMPLOYEE" ? sessionUser.id : queryTeacherId
  const classId = url.searchParams.get("classId")

  const classStudentIds = classId ? await resolveClassStudentIds(classId) : null

  const grades = (await loadGradesFromSheetOrStore()).filter((grade) => {
    if (teacherId && grade.teacherId !== teacherId) return false
    if (classStudentIds && !classStudentIds.has(grade.studentId)) return false
    return true
  })

  return NextResponse.json({ grades })
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as Partial<StudentGrade>
  const sessionUser = await getSessionUser()
  const teacherId = sessionUser?.role === "EMPLOYEE" ? sessionUser.id : payload.teacherId

  if (!payload.studentId || !teacherId || !payload.subject) {
    return NextResponse.json({ error: "Data nilai belum lengkap" }, { status: 400 })
  }

  const grades = await loadGradesFromSheetOrStore()
  const existingIndex = grades.findIndex(
    (grade) =>
      grade.studentId === payload.studentId &&
      grade.teacherId === teacherId &&
      grade.subject === payload.subject,
  )

  let nextGrades = grades
  const previous = existingIndex >= 0 ? grades[existingIndex] : null
  if (existingIndex >= 0) {
    const existing = grades[existingIndex]
    const normalized = normalizeDetailedGrade(
      { ...existing, ...payload, teacherId },
      {
        id: existing.id,
        teacherId,
        subject: payload.subject,
      },
    )
    nextGrades = grades.map((grade, index) => (index === existingIndex ? normalized : grade))
  } else {
    const normalized = normalizeDetailedGrade(
      { ...payload, teacherId },
      {
        id: payload.id || `sg-${Date.now()}`,
        teacherId,
        subject: payload.subject,
      },
    )
    nextGrades = [...grades, normalized]
  }

  setDbGrades(nextGrades)
  try {
    await replaceAllDbGradesToSheet(nextGrades)
  } catch {
    // Fallback to in-memory grades when Google Sheets is unavailable.
  }

  const saved = nextGrades.find((grade) => grade.studentId === payload.studentId && grade.teacherId === teacherId && grade.subject === payload.subject)
  if (saved) {
    logAudit({
      actorId: teacherId,
      action: previous ? "UPDATE" : "CREATE",
      entityName: "student_grades",
      entityId: saved.id,
      oldValue: previous,
      newValue: saved,
    })
  }

  return NextResponse.json({ grade: saved })
}

export async function PUT(request: Request) {
  const sessionUser = await getSessionUser()
  const payload = (await request.json().catch(() => ({}))) as {
    teacherId?: string
    subject?: string
    classId?: string
    grades?: StudentGrade[]
  }

  const teacherId = sessionUser?.role === "EMPLOYEE" ? sessionUser.id : payload.teacherId
  if (!teacherId) {
    return NextResponse.json({ error: "teacherId wajib diisi" }, { status: 400 })
  }

  if (!payload.subject || !payload.classId || !payload.grades) {
    return NextResponse.json({ error: "Payload bulk update tidak valid" }, { status: 400 })
  }

  const classStudentIds = await resolveClassStudentIds(payload.classId)

  const currentGrades = await loadGradesFromSheetOrStore()
  const base = currentGrades.filter(
    (grade) =>
      !(grade.teacherId === teacherId && grade.subject === payload.subject && classStudentIds.has(grade.studentId)),
  )

  const normalized = payload.grades.map((grade) => {
    return normalizeDetailedGrade(
      { ...grade, teacherId, subject: payload.subject as string },
      {
        id: grade.id || `sg-${grade.studentId}-${teacherId}`,
        teacherId,
        subject: payload.subject as string,
      },
    )
  })

  const nextGrades = [...base, ...normalized]
  setDbGrades(nextGrades)
  try {
    await replaceAllDbGradesToSheet(nextGrades)
  } catch {
    // Fallback to in-memory grades when Google Sheets is unavailable.
  }

  logAudit({
    actorId: teacherId,
    action: "UPDATE",
    entityName: "student_grades",
    entityId: `${payload.classId}:${payload.subject}`,
    oldValue: { count: currentGrades.length },
    newValue: { count: normalized.length, classId: payload.classId, subject: payload.subject },
  })
  return NextResponse.json({ count: normalized.length })
}
