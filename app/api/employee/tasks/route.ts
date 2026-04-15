import { NextResponse } from "next/server"
import type { Task } from "@/lib/data-model"
import { getSessionUser } from "@/lib/server/session-user"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getAllDbSchedules } from "@/lib/server/google-sheets-schedules"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import {
  deleteDbTaskSubmissionsByTaskId,
  getAllDbTaskSubmissions,
} from "@/lib/server/google-sheets-task-submissions"
import {
  getDbClasses,
  getDbTaskSubmissions,
  getDbTasks,
  getDbTeachers,
  setDbTasks,
  setDbTaskSubmissions,
} from "@/lib/server/persistent-store"
import { createDbTask, deleteDbTaskById, getAllDbTasks, updateDbTaskById } from "@/lib/server/google-sheets-tasks"
import { normalizeTaskMedia } from "@/lib/server/task-attachment-storage"
import { logAudit } from "@/lib/server/audit-log"

const normalizeId = (value: unknown) => String(value || "").trim().toLowerCase()

const sameId = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeId(left)
  const normalizedRight = normalizeId(right)
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight
}

const toClassOption = (value: { id: string; name: string; grade: string }) => ({
  id: value.id,
  name: value.name,
  grade: value.grade,
})

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
  const queryTeacherId = String(url.searchParams.get("teacherId") || "").trim()
  const sessionUser = await getSessionUser()
  const teacherId = sessionUser?.role === "EMPLOYEE" ? sessionUser.id : queryTeacherId

  if (!teacherId) {
    return NextResponse.json({ tasks: [], submissions: [], classes: [], employee: null })
  }

  const [tasksFromSource, classesFromSheet, schedulesFromSheet, submissionsFromSource] = await Promise.all([
    loadTasksFromSheetOrStore(),
    getAllDbClasses().catch(() => getDbClasses()),
    getAllDbSchedules().catch(() => []),
    loadTaskSubmissionsFromSheetOrStore(),
  ])

  const { resolveClassId } = createClassIdResolver(classesFromSheet)

  const tasks = tasksFromSource
    .filter((task) => sameId(task.teacherId, teacherId))
    .map((task) => ({
      ...task,
      teacherId: String(task.teacherId || "").trim(),
      classId: resolveClassId(task.classId),
    }))

  const classIds = new Set<string>()
  for (const task of tasks) {
    if (task.classId) {
      classIds.add(task.classId)
    }
  }
  for (const classRoom of classesFromSheet) {
    if (sameId(classRoom.teacherId, teacherId)) {
      classIds.add(classRoom.id)
    }
  }
  for (const schedule of schedulesFromSheet) {
    if (!sameId(schedule.teacherId, teacherId)) continue
    const normalizedClassId = resolveClassId(schedule.classId)
    if (normalizedClassId) {
      classIds.add(normalizedClassId)
    }
  }

  const classesMap = new Map<string, { id: string; name: string; grade: string }>()
  for (const classRoom of classesFromSheet) {
    const normalizedClassId = resolveClassId(classRoom.id)
    if (normalizedClassId && classIds.has(normalizedClassId)) {
      classesMap.set(normalizedClassId, {
        id: normalizedClassId,
        name: classRoom.name,
        grade: classRoom.grade,
      })
    }
  }
  for (const classRoom of getDbClasses()) {
    const normalizedClassId = resolveClassId(classRoom.id)
    if (normalizedClassId && classIds.has(normalizedClassId) && !classesMap.has(normalizedClassId)) {
      classesMap.set(normalizedClassId, {
        id: normalizedClassId,
        name: classRoom.name,
        grade: classRoom.grade,
      })
    }
  }

  const teacherMap = getDbTeachers().find((teacher) => sameId(teacher.id, teacherId))
  const employee = {
    id: teacherId,
    subject: sessionUser?.subject || teacherMap?.subject || "-",
  }

  return NextResponse.json({
    tasks,
    submissions: submissionsFromSource,
    classes: [...classesMap.values()].map(toClassOption),
    employee,
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
  const classes = await getAllDbClasses().catch(() => getDbClasses())
  const { resolveClassId } = createClassIdResolver(classes)
  const normalizedClassId = resolveClassId(payload.classId)
  const taskId = payload.id || `task-${Date.now()}`

  let normalizedMedia: { attachmentUrl?: string; imageUrl?: string; attachmentName?: string }
  try {
    normalizedMedia = await normalizeTaskMedia(
      {
        attachmentUrl: payload.attachmentUrl,
        imageUrl: payload.imageUrl,
        attachmentName: payload.attachmentName,
      },
      { taskId },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses lampiran tugas" },
      { status: 400 },
    )
  }

  const taskCandidate: Task = {
    ...payload,
    id: taskId,
    teacherId,
    classId: normalizedClassId || payload.classId,
    createdAt: payload.createdAt || new Date().toISOString(),
    attachmentUrl: normalizedMedia.attachmentUrl || undefined,
    imageUrl: normalizedMedia.imageUrl || undefined,
    attachmentName: normalizedMedia.attachmentName || undefined,
  }

  let task: Task
  try {
    task = await createDbTask(taskCandidate)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan tugas ke backend" },
      { status: 503 },
    )
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

  const classes = await getAllDbClasses().catch(() => getDbClasses())
  const { resolveClassId } = createClassIdResolver(classes)

  let normalizedMedia: { attachmentUrl?: string; imageUrl?: string; attachmentName?: string }
  try {
    normalizedMedia = await normalizeTaskMedia(
      {
        attachmentUrl: payload.attachmentUrl != null ? String(payload.attachmentUrl) : existing.attachmentUrl,
        imageUrl: payload.imageUrl != null ? String(payload.imageUrl) : existing.imageUrl,
        attachmentName: payload.attachmentName != null ? String(payload.attachmentName) : existing.attachmentName,
      },
      { taskId: existing.id },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses lampiran tugas" },
      { status: 400 },
    )
  }

  let updated: Task = {
    ...existing,
    ...payload,
    id: existing.id,
    classId: payload.classId != null ? (resolveClassId(payload.classId) || payload.classId) : existing.classId,
    createdAt: existing.createdAt,
    attachmentUrl: normalizedMedia.attachmentUrl,
    imageUrl: normalizedMedia.imageUrl,
    attachmentName: normalizedMedia.attachmentName,
  }
  if (sessionUser?.role === "EMPLOYEE" && !sameId(updated.teacherId, sessionUser.id)) {
    return NextResponse.json({ error: "Tidak diizinkan mengubah tugas guru lain" }, { status: 403 })
  }

  try {
    updated = await updateDbTaskById(updated)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui tugas di backend" },
      { status: 503 },
    )
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

  if (sessionUser?.role === "EMPLOYEE" && !sameId(existing.teacherId, sessionUser.id)) {
    return NextResponse.json({ error: "Tidak diizinkan menghapus tugas guru lain" }, { status: 403 })
  }

  try {
    await deleteDbTaskById(existing.id)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus tugas di backend" },
      { status: 503 },
    )
  }

  try {
    await deleteDbTaskSubmissionsByTaskId(existing.id)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus pengumpulan tugas di backend" },
      { status: 503 },
    )
  }

  setDbTasks(tasks.filter((task) => task.id !== id))
  const submissions = await loadTaskSubmissionsFromSheetOrStore()
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
