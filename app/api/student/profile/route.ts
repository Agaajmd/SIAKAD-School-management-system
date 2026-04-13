import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const users = await getAllDbUsers()
  const students = users.filter((user) => user.role === "STUDENT" && user.isActive)
  const studentId = url.searchParams.get("studentId") || students[0]?.id

  const student = students.find((item) => item.id === studentId)
  if (!student) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      avatar: student.avatar,
      role: student.role,
      classId: student.classId,
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
