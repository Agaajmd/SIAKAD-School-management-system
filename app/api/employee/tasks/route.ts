import { NextResponse } from "next/server"
import type { Task } from "@/lib/data-model"
import { getSessionUser } from "@/lib/server/session-user"
import { getDbTasks, getDbTaskSubmissions, setDbTasks, setDbTaskSubmissions } from "@/lib/server/data-store"
import { createDbTask, deleteDbTaskById, getAllDbTasks, updateDbTaskById } from "@/lib/server/google-sheets-tasks"
import { logAudit } from "@/lib/server/audit-log"

async function loadTasksFromSheetOrStore() {
  try {
    const tasks = await getAllDbTasks()
    setDbTasks(tasks)
    return tasks
  } catch {
    return getDbTasks()
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const queryTeacherId = String(url.searchParams.get("teacherId") || "").trim()
  const sessionUser = await getSessionUser()
  const teacherId = sessionUser?.role === "EMPLOYEE" ? sessionUser.id : queryTeacherId

  if (!teacherId) {
    return NextResponse.json({ tasks: [], submissions: [] })
  }

  const tasks = (await loadTasksFromSheetOrStore()).filter((task) => task.teacherId === teacherId)

  return NextResponse.json({
    tasks,
    submissions: getDbTaskSubmissions(),
  })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Task
  const sessionUser = await getSessionUser()
  const teacherId = sessionUser?.role === "EMPLOYEE" ? sessionUser.id : payload.teacherId

  if (!payload.title || !payload.description || !teacherId || !payload.classId || !payload.dueDate) {
    return NextResponse.json({ error: "Data tugas belum lengkap" }, { status: 400 })
  }

  const tasks = await loadTasksFromSheetOrStore()
  const taskCandidate: Task = {
    ...payload,
    id: payload.id || `task-${Date.now()}`,
    teacherId,
    createdAt: payload.createdAt || new Date().toISOString(),
  }

  let task = taskCandidate
  try {
    task = await createDbTask(taskCandidate)
  } catch {
    // Fallback to in-memory backend when Google Sheets is unavailable.
  }

  setDbTasks([task, ...tasks.filter((item) => item.id !== task.id)])
  logAudit({
    actorId: teacherId,
    action: "CREATE",
    entityName: "tasks",
    entityId: task.id,
    newValue: task,
  })

  return NextResponse.json({ task })
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as Partial<Task> & { id?: string }
  const sessionUser = await getSessionUser()
  if (!payload.id) {
    return NextResponse.json({ error: "ID tugas wajib diisi" }, { status: 400 })
  }

  const tasks = await loadTasksFromSheetOrStore()
  const existing = tasks.find((task) => task.id === payload.id)
  if (!existing) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })
  }

  let updated = { ...existing, ...payload, id: existing.id, createdAt: existing.createdAt }
  if (sessionUser?.role === "EMPLOYEE" && updated.teacherId !== sessionUser.id) {
    return NextResponse.json({ error: "Tidak diizinkan mengubah tugas guru lain" }, { status: 403 })
  }

  try {
    updated = await updateDbTaskById(updated)
  } catch {
    // Fallback to in-memory backend when Google Sheets is unavailable.
  }

  setDbTasks(tasks.map((task) => (task.id === existing.id ? updated : task)))

  logAudit({
    actorId: updated.teacherId,
    action: "UPDATE",
    entityName: "tasks",
    entityId: updated.id,
    oldValue: existing,
    newValue: updated,
  })

  return NextResponse.json({ task: updated })
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser()
  const url = new URL(request.url)
  const id = url.searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "ID tugas wajib diisi" }, { status: 400 })
  }

  const tasks = await loadTasksFromSheetOrStore()
  const existing = tasks.find((task) => task.id === id)
  if (!existing) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })
  }

  if (sessionUser?.role === "EMPLOYEE" && existing.teacherId !== sessionUser.id) {
    return NextResponse.json({ error: "Tidak diizinkan menghapus tugas guru lain" }, { status: 403 })
  }

  try {
    await deleteDbTaskById(existing.id)
  } catch {
    // Fallback to in-memory backend when Google Sheets is unavailable.
  }

  setDbTasks(tasks.filter((task) => task.id !== id))
  const submissions = getDbTaskSubmissions()
  setDbTaskSubmissions(submissions.filter((submission) => submission.taskId !== id))

  logAudit({
    actorId: existing.teacherId,
    action: "DELETE",
    entityName: "tasks",
    entityId: existing.id,
    oldValue: existing,
  })

  return NextResponse.json({ success: true })
}
