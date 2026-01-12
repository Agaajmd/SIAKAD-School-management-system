"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { useAuth } from "@/lib/auth"
import { 
  Eye, 
  EyeOff, 
  UserPlus, 
  GraduationCap, 
  Lock, 
  Mail, 
  User,
  ArrowLeft,
  Check
} from "lucide-react"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const { register, getRedirectPath } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Harap isi semua field")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Password tidak cocok")
      return
    }

    if (password.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }

    if (!acceptTerms) {
      toast.error("Harap setujui syarat dan ketentuan")
      return
    }

    setIsLoading(true)
    const result = await register(name, email, password)
    setIsLoading(false)

    if (result.success) {
      toast.success("Registrasi berhasil!", {
        description: "Selamat datang di EduManage",
      })
      // Get user from localStorage to determine redirect
      const storedUser = localStorage.getItem("auth_user")
      if (storedUser) {
        const user = JSON.parse(storedUser)
        router.push(getRedirectPath(user.role))
      }
    } else {
      toast.error("Registrasi gagal", {
        description: result.error,
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Section - Form (Mobile: Full width, Desktop: Half) */}
      <div className="flex-1 flex flex-col justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Back to Home */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>

          {/* Logo & Title - Mobile */}
          <div className="md:hidden text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Daftar Akun</h1>
              <p className="text-slate-500 text-sm">Buat akun baru untuk mulai</p>
            </div>
          </div>

          {/* Desktop Title */}
          <div className="hidden md:block">
            <h1 className="text-3xl font-bold text-slate-800">Buat Akun Baru</h1>
            <p className="text-slate-500 mt-2">Daftar untuk mengakses EduManage School System.</p>
          </div>

          {/* Register Form */}
          <GlassCard className="p-5 md:p-6 border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  Nama Lengkap
                </label>
                <GlassInput
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Email
                </label>
                <GlassInput
                  type="email"
                  placeholder="nama@school.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Password
                </label>
                <div className="relative">
                  <GlassInput
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-12"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Konfirmasi Password
                </label>
                <GlassInput
                  type={showPassword ? "text" : "password"}
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full"
                  autoComplete="new-password"
                />
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setAcceptTerms(!acceptTerms)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                    acceptTerms 
                      ? "bg-blue-500 border-blue-500" 
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {acceptTerms && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className="text-sm text-slate-500">
                  Saya menyetujui{" "}
                  <a href="#" className="text-blue-600 hover:underline">Syarat & Ketentuan</a>
                  {" "}dan{" "}
                  <a href="#" className="text-blue-600 hover:underline">Kebijakan Privasi</a>
                </span>
              </label>

              <GlassButton
                type="submit"
                className="w-full justify-center py-3"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="ml-2">Mendaftarkan...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Daftar
                  </>
                )}
              </GlassButton>
            </form>

            {/* Login Link */}
            <div className="text-center mt-5 pt-5 border-t border-slate-100">
              <p className="text-slate-500 text-sm">
                Sudah punya akun?{" "}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Masuk di sini
                </Link>
              </p>
            </div>
          </GlassCard>

          {/* Footer */}
          <p className="text-center text-slate-400 text-xs">
            © 2025 EduManage by{" "}
            <a 
              href="https://profile-portfolio-aga.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline transition-colors"
            >
              Aga
            </a>. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Section - Illustration (Desktop only) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center p-12">
        <div className="max-w-md text-center text-white">
          <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center mb-8">
            <UserPlus className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Bergabung Sekarang</h2>
          <p className="text-white/80 text-lg">
            Daftar untuk mengakses semua fitur manajemen sekolah modern
          </p>
          <div className="mt-8 space-y-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-300" />
              <span>Akses jadwal kelas dan pelajaran</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-300" />
              <span>Lihat nilai dan rapor digital</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-left flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-300" />
              <span>Sistem gamifikasi dan reward</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
