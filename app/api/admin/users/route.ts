import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"

export async function GET() {
  const users = await getAllDbUsers()
  const activeUsers = users
    .filter((user) => user.isActive)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      classId: user.classId || null,
    }))

  return NextResponse.json({ users: activeUsers })
}
