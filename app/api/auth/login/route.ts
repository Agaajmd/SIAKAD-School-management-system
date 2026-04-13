import { NextResponse } from "next/server"
import { ensurePrincipalSeeded, verifyDbLogin } from "@/lib/server/google-sheets-auth"
import { logAudit } from "@/lib/server/audit-log"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || "").trim()
    const password = String(body?.password || "")

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 })
    }

    await ensurePrincipalSeeded()
    const user = await verifyDbLogin(email, password)

    if (!user) {
      logAudit({
        action: "LOGIN",
        entityName: "users",
        entityId: email.toLowerCase(),
        oldValue: null,
        newValue: { status: "FAILED" },
      })
      return NextResponse.json({ error: "Email atau password salah" }, { status: 401 })
    }

    logAudit({
      actorId: user.id,
      action: "LOGIN",
      entityName: "users",
      entityId: user.id,
      oldValue: null,
      newValue: { email: user.email, role: user.role, status: "SUCCESS" },
    })

    const response = NextResponse.json({ user }, { status: 200 })
    response.cookies.set("auth_user", JSON.stringify(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan saat login"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
