import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const [users, classes] = await Promise.all([getAllDbUsers(), getAllDbClasses().catch(() => [])])
  const { resolveClassId } = createClassIdResolver(classes)
  const students = users.filter((user) => user.role === "STUDENT" && user.isActive)
  const studentId = url.searchParams.get("studentId") || students[0]?.id

  const student = students.find((item) => item.id === studentId)
  if (!student) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  const normalizedClassId = resolveClassId(student.classId)
  const classInfo = classes.find((item) => item.id === normalizedClassId)

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      avatar: student.avatar,
      role: student.role,
      classId: normalizedClassId || student.classId,
      className: classInfo?.name || student.classId || "-",
      classGrade: classInfo?.grade || "",
      phone: student.phone || "",
    },
  })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const id = String(body.id || "").trim()

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  const updated = await updateDbUserById({
    id,
    name: body.name ? String(body.name) : undefined,
    email: body.email ? String(body.email) : undefined,
    avatar: body.avatar ? String(body.avatar) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
  })

  return NextResponse.json({ user: updated })
}
