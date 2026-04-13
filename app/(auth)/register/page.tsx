"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { useAuth } from "@/lib/auth"
import type { UserRole } from "@/lib/data-model"
import { ArrowLeft, UserPlus } from "lucide-react"

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "STUDENT", label: "Siswa" },
  { value: "EMPLOYEE", label: "Guru" },
  { value: "PARENT", label: "Orang Tua" },
  { value: "CANTEEN_OWNER", label: "Pemilik Kantin" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Kepala Sekolah" },
]

export default function RegisterPage() {
  const { register } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("PARENT")
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) {
      toast.error("Harap isi semua field")
      return
    }

    setIsLoading(true)
    const result = await register({ name, email, password, role })
    setIsLoading(false)

    if (!result.success) {
      toast.error("Registrasi gagal", { description: result.error })
      return
    }

    toast.success("Registrasi berhasil", {
      description: "Silakan login dengan akun baru Anda",
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Login
        </Link>

        <div className="text-center space-y-3">
          <Image
            src="/AegixLogo.png"
            alt="Aegix SLE Logo"
            width={64}
            height={64}
            priority
            className="w-16 h-16 mx-auto rounded-2xl shadow-lg shadow-blue-500/25"
          />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Daftar Akun</h1>
            <p className="text-slate-500 text-sm">Buat akun baru untuk masuk ke sistem</p>
          </div>
        </div>

        <GlassCard className="p-5 md:p-6 border-slate-200">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Nama Lengkap</label>
              <GlassInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Anda" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <GlassInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <GlassInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <GlassButton type="submit" className="w-full justify-center" disabled={isLoading}>
              <UserPlus className="w-4 h-4 mr-2" />
              {isLoading ? "Memproses..." : "Daftar"}
            </GlassButton>
          </form>

          <p className="text-center text-slate-500 text-sm mt-4">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Masuk
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  )
}
