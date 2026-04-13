import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get("auth_user")?.value
    if (!raw) {
      return NextResponse.json({ user: null })
    }

    const parsed = JSON.parse(raw) as { id?: string }
    if (!parsed?.id) {
      return NextResponse.json({ user: null })
    }

    const users = await getAllDbUsers()
    const user = users.find((item) => item.id === parsed.id && item.isActive)
    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
