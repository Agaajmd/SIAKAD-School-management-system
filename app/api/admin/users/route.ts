import { NextResponse } from "next/server"
import { deleteDbUserById, getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbAdmins,
  getDbCanteenOwners,
  getDbCanteens,
  getDbParents,
  getDbStudents,
  getDbSuperAdmins,
  getDbTeachers,
  setDbAdmins,
  setDbCanteenOwners,
  setDbCanteens,
  setDbParents,
  setDbStudents,
  setDbSuperAdmins,
  setDbTeachers,
} from "@/lib/server/data-store"

export async function GET() {
  const sessionUser = await getSessionUser()
  const users = await getAllDbUsers()
  const visibleUsers = users
    .filter((user) => (sessionUser?.id ? user.id !== sessionUser.id : true))
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      classId: user.classId || null,
      isActive: user.isActive,
    }))

  return NextResponse.json({ users: visibleUsers })
}

export async function DELETE(request: Request) {
  const body = await request.json()
  const id = String(body.id || "").trim()
  if (!id) {
    return NextResponse.json({ error: "ID user wajib diisi" }, { status: 400 })
  }

  const sessionUser = await getSessionUser()
  if (sessionUser?.id === id) {
    return NextResponse.json({ error: "Akun sendiri tidak dapat dihapus" }, { status: 400 })
  }

  const users = await getAllDbUsers()
  const target = users.find((user) => user.id === id)
  if (!target) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
  }

  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Akun superadmin tidak dapat dihapus" }, { status: 403 })
  }

  await deleteDbUserById(id)

  setDbStudents(getDbStudents().filter((item) => item.id !== id))
  setDbTeachers(getDbTeachers().filter((item) => item.id !== id))
  setDbAdmins(getDbAdmins().filter((item) => item.id !== id))
  setDbSuperAdmins(getDbSuperAdmins().filter((item) => item.id !== id))
  setDbParents(getDbParents().filter((item) => item.id !== id))
  setDbCanteenOwners(getDbCanteenOwners().filter((item) => item.id !== id))
  setDbCanteens(getDbCanteens().filter((item) => item.ownerId !== id))

  return NextResponse.json({ success: true })
}
