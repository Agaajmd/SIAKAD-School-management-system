import { NextResponse } from "next/server"
import { deleteDbUserById, getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { deleteDbClassById, getAllDbClasses, updateDbClassById } from "@/lib/server/google-sheets-classes"
import {
  getDbStudents,
  setDbClasses,
  setDbStudents,
} from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function PATCH(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const body = await request.json()

  const classes = await getAllDbClasses()
  const target = classes.find((item) => item.id === classId)
  if (!target) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })
  }

  const next = await updateDbClassById({
    id: classId,
    name: body.name ? String(body.name) : undefined,
    grade: body.grade ? String(body.grade) : undefined,
    rows: body.rows != null ? Number(body.rows) : undefined,
    cols: body.cols != null ? Number(body.cols) : undefined,
    teacherId: body.teacherId != null ? String(body.teacherId) : undefined,
  })

  setDbClasses(classes.map((item) => (item.id === classId ? next : item)))
  logAudit({
    action: "UPDATE",
    entityName: "classes",
    entityId: classId,
    oldValue: target,
    newValue: next,
  })

  return NextResponse.json({ classItem: next })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const classes = await getAllDbClasses()
  const target = classes.find((item) => item.id === classId)
  if (!target) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })
  }

  const users = await getAllDbUsers()
  const studentsInClass = users.filter(
    (user) => user.role === "STUDENT" && user.classId === classId,
  )

  await Promise.all(studentsInClass.map((student) => deleteDbUserById(student.id)))
  await deleteDbClassById(classId)
  setDbClasses(classes.filter((item) => item.id !== classId))
  setDbStudents(getDbStudents().filter((student) => student.classId !== classId))
  logAudit({
    action: "DELETE",
    entityName: "classes",
    entityId: classId,
    oldValue: target,
    newValue: null,
  })

  return NextResponse.json({ success: true })
}
