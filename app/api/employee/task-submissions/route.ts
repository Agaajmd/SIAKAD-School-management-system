import { NextResponse } from "next/server"
import type { TaskSubmission } from "@/lib/data-model"
import { getSessionUser } from "@/lib/server/session-user"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbTasks } from "@/lib/server/google-sheets-tasks"
import { getAllDbTaskSubmissions, upsertDbTaskSubmission } from "@/lib/server/google-sheets-task-submissions"
import { logAudit } from "@/lib/server/audit-log"

const normalizeId = (value: unknown) => String(value || "").trim().toLowerCase()

const sameId = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeId(left)
  const normalizedRight = normalizeId(right)
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || !["EMPLOYEE", "ADMIN", "SUPER_ADMIN"].includes(sessionUser.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
  }

  const url = new URL(request.url)
  const taskId = String(url.searchParams.get("taskId") || "").trim()

  const [tasks, submissions, users] = await Promise.all([
    getAllDbTasks(),
    getAllDbTaskSubmissions(),
    getAllDbUsers(),
  ])

  const allowedTaskIds = new Set(
    tasks
      .filter((task) =>
        sessionUser.role === "EMPLOYEE" ? sameId(task.teacherId, sessionUser.id) : true,
      )
      .map((task) => task.id),
  )

  if (taskId && !allowedTaskIds.has(taskId)) {
    return NextResponse.json({ error: "Tugas tidak ditemukan atau tidak diizinkan" }, { status: 404 })
  }

  const filtered = submissions.filter((submission) => {
    if (!allowedTaskIds.has(submission.taskId)) return false
    if (taskId && submission.taskId !== taskId) return false
    return true
  })

  const studentsById = users
    .filter((user) => user.role === "STUDENT")
    .reduce((acc, user) => {
      acc[user.id] = user.name
      return acc
    }, {} as Record<string, string>)

  return NextResponse.json({
    submissions: filtered,
    studentsById,
  })
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || !["EMPLOYEE", "ADMIN", "SUPER_ADMIN"].includes(sessionUser.role)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
  }

  const body = await request.json()
  const submissionId = String(body.submissionId || "").trim()
  const score = Number(body.score)
  const feedback = body.feedback != null ? String(body.feedback) : undefined

  if (!submissionId) {
    return NextResponse.json({ error: "submissionId wajib diisi" }, { status: 400 })
  }
  if (!Number.isFinite(score)) {
    return NextResponse.json({ error: "Nilai harus berupa angka" }, { status: 400 })
  }

  const [tasks, submissions] = await Promise.all([getAllDbTasks(), getAllDbTaskSubmissions()])

  const target = submissions.find((submission) => submission.id === submissionId)
  if (!target) {
    return NextResponse.json({ error: "Submission tidak ditemukan" }, { status: 404 })
  }

  const task = tasks.find((item) => item.id === target.taskId)
  if (!task) {
    return NextResponse.json({ error: "Tugas terkait tidak ditemukan" }, { status: 404 })
  }

  if (sessionUser.role === "EMPLOYEE" && !sameId(task.teacherId, sessionUser.id)) {
    return NextResponse.json({ error: "Tidak diizinkan menilai submission guru lain" }, { status: 403 })
  }

  const maxScore = Number(task.maxScore || 100)
  const normalizedScore = Math.max(0, Math.min(maxScore, Math.round(score)))

  const updated: TaskSubmission = {
    ...target,
    score: normalizedScore,
    feedback,
    status: "GRADED" as const,
  }

  let saved: TaskSubmission = updated
  try {
    saved = await upsertDbTaskSubmission(updated)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan penilaian ke backend" },
      { status: 503 },
    )
  }

  logAudit({
    actorId: sessionUser.id,
    action: "UPDATE",
    entityName: "TASK_SUBMISSION",
    entityId: saved.id,
    oldValue: target,
    newValue: saved,
  })

  return NextResponse.json({ submission: saved })
}
