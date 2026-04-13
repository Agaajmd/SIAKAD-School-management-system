import "server-only"

import { cookies } from "next/headers"
import { getAllDbUsers, type DbUser } from "@/lib/server/google-sheets-auth"

export async function getSessionUser(): Promise<DbUser | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get("auth_user")?.value
    if (!raw) return null

    const parsed = JSON.parse(raw) as { id?: string }
    if (!parsed?.id) return null

    const users = await getAllDbUsers()
    return users.find((user) => user.id === parsed.id && user.isActive) || null
  } catch {
    return null
  }
}
