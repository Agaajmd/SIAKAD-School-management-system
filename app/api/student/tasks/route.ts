import { NextResponse } from "next/server"
import type { TaskSubmission } from "@/lib/data-model"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getAllDbTasks } from "@/lib/server/google-sheets-tasks"
import { getAllDbTaskSubmissions, upsertDbTaskSubmission } from "@/lib/server/google-sheets-task-submissions"
import { getSessionUser } from "@/lib/server/session-user"
import { getDbTaskSubmissions, getDbTasks, setDbTaskSubmissions, setDbTasks } from "@/lib/server/persistent-store"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { logAudit } from "@/lib/server/audit-log"
import { normalizeTaskMedia } from "@/lib/server/task-attachment-storage"

async function loadTasksFromSheetOrStore() {
  try {
    const tasks = await getAllDbTasks()
    setDbTasks(tasks)
    return tasks
  } catch {
    return getDbTasks()
  }
}

async function loadTaskSubmissionsFromSheetOrStore() {
  try {
    const submissions = await getAllDbTaskSubmissions()
    setDbTaskSubmissions(submissions)
    return submissions
  } catch {
    return getDbTaskSubmissions()
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const [users, classes] = await Promise.all([getAllDbUsers(), getAllDbClasses()])
  const { resolveClassId } = createClassIdResolver(classes)
  const sessionUser = await getSessionUser()
  const students = users
    .filter((user) => user.role === "STUDENT" && user.isActive)
    .map((user) => ({ ...user, classId: resolveClassId(user.classId) }))

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
  const [tasksFromSource, submissionsFromSource] = await Promise.all([
    loadTasksFromSheetOrStore(),
    loadTaskSubmissionsFromSheetOrStore(),
  ])

  const tasks = tasksFromSource.filter((task) => resolveClassId(task.classId) === classId)
  const submissions = submissionsFromSource.filter((submission) => submission.studentId === studentId)

  return NextResponse.json({ student, tasks, submissions })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  const body = await request.json()
  const requestedStudentId = String(body.studentId || "").trim()
  const studentId = sessionUser?.role === "STUDENT" ? sessionUser.id : requestedStudentId
  const taskId = String(body.taskId || "").trim()

  if (sessionUser?.role === "STUDENT" && requestedStudentId && requestedStudentId !== sessionUser.id) {
    return NextResponse.json({ error: "Tidak diizinkan mengirim tugas untuk siswa lain" }, { status: 403 })
  }

  if (!studentId || !taskId) {
    return NextResponse.json({ error: "studentId dan taskId wajib diisi" }, { status: 400 })
  }

  const tasks = await loadTasksFromSheetOrStore()
  const taskExists = tasks.some((task) => task.id === taskId)
  if (!taskExists) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })
  }

  let normalizedMedia: {
    attachmentUrl?: string
    attachmentUrls?: string[]
    imageUrl?: string
    imageUrls?: string[]
    attachmentName?: string
  }
  try {
    normalizedMedia = await normalizeTaskMedia(
      {
        attachmentUrl: body.attachmentUrl ? String(body.attachmentUrl) : undefined,
        attachmentUrls: Array.isArray(body.attachmentUrls)
          ? body.attachmentUrls.map((item: unknown) => String(item || "")).filter(Boolean)
          : undefined,
        imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
        imageUrls: Array.isArray(body.imageUrls)
          ? body.imageUrls.map((item: unknown) => String(item || "")).filter(Boolean)
          : undefined,
        attachmentName: body.attachmentName ? String(body.attachmentName) : undefined,
      },
      { taskId: `submission-${taskId}-${studentId}` },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses lampiran tugas" },
      { status: 400 },
    )
  }

  const allSubmissions = await loadTaskSubmissionsFromSheetOrStore()
  const existing = allSubmissions.find((submission) => submission.studentId === studentId && submission.taskId === taskId)

  const nextSubmission: TaskSubmission = {
    id: existing?.id || `sub-${Date.now()}`,
    taskId,
    studentId,
    submittedAt: new Date().toISOString(),
    attachmentUrl: normalizedMedia.attachmentUrl,
    attachmentUrls: normalizedMedia.attachmentUrls,
    imageUrl: normalizedMedia.imageUrl,
    imageUrls: normalizedMedia.imageUrls,
    attachmentName: normalizedMedia.attachmentName,
    status: "SUBMITTED" as const,
    score: existing?.score,
    feedback: existing?.feedback,
  }

  let savedSubmission: TaskSubmission
  try {
    savedSubmission = await upsertDbTaskSubmission(nextSubmission)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan pengumpulan tugas ke backend" },
      { status: 503 },
    )
  }

  const nextSubmissions = existing
    ? allSubmissions.map((submission) => (submission.id === existing.id ? savedSubmission : submission))
    : [savedSubmission, ...allSubmissions]

  setDbTaskSubmissions(nextSubmissions)
  logAudit({
    actorId: studentId,
    action: existing ? "UPDATE" : "CREATE",
    entityName: "TASK_SUBMISSION",
    entityId: savedSubmission.id,
    oldValue: existing || null,
    newValue: savedSubmission,
  })

  return NextResponse.json({ success: true, submission: savedSubmission })
}
