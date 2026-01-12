import Link from "next/link"
import { GraduationCap } from "lucide-react"

export function PublicFooter() {
  return (
    <footer className="py-12 px-4 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">EduGlass</span>
            </Link>
            <p className="text-white/50 text-sm max-w-md">
              Sistem manajemen sekolah modern dengan desain Liquid Glass yang elegan dan fitur lengkap untuk mengelola sekolah Anda.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-white/50 hover:text-white text-sm transition-colors">
                  Fitur
                </a>
              </li>
              <li>
                <a href="#stats" className="text-white/50 hover:text-white text-sm transition-colors">
                  Statistik
                </a>
              </li>
              <li>
                <a href="#testimonials" className="text-white/50 hover:text-white text-sm transition-colors">
                  Testimoni
                </a>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-semibold mb-4">Akun</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="text-white/50 hover:text-white text-sm transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-white/50 hover:text-white text-sm transition-colors">
                  Daftar
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-white/10 text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} EduGlass by{" "}
            <a 
              href="https://profile-portfolio-aga.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              Aga
            </a>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
