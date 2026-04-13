"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { UserRole } from "./data-model"

// Auth user type combining all user types
export interface AuthUser {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (payload: { name: string; email: string; password: string; role: UserRole }) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  getRedirectPath: (role: UserRole) => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const lastRedirectRef = useRef<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" })
        if (!res.ok) {
          setUser(null)
          return
        }
        const data = await res.json()
        setUser(data.user || null)
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth().catch(() => {
      setUser(null)
      setIsLoading(false)
    })
  }, [])

  const getRedirectPath = useCallback((role: UserRole): string => {
    switch (role) {
      case "STUDENT":
        return "/student"
      case "EMPLOYEE":
        return "/employee"
      case "ADMIN":
        return "/admin"
      case "SUPER_ADMIN":
        return "/super-admin"
      case "PARENT":
        return "/parent"
      case "CANTEEN_OWNER":
        return "/canteen-owner"
      default:
        return "/login"
    }
  }, [])

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return

    const publicPaths = ["/", "/login", "/register"]
    const isPublicPath = publicPaths.includes(pathname)

    if (!user && !isPublicPath) {
      if (lastRedirectRef.current !== "/login") {
        lastRedirectRef.current = "/login"
        router.replace("/login")
      }
    } else if (user && isPublicPath) {
      const targetPath = getRedirectPath(user.role)
      if (pathname !== targetPath && lastRedirectRef.current !== targetPath) {
        lastRedirectRef.current = targetPath
        router.replace(targetPath)
      }
    } else {
      lastRedirectRef.current = null
    }
  }, [user, isLoading, pathname, router, getRedirectPath])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok || !data?.user) {
        return { success: false, error: data?.error || "Email atau password salah" }
      }

      setUser(data.user)
      return { success: true }
    } catch {
      return { success: false, error: "Gagal terhubung ke server" }
    }
  }, [])

  const register = useCallback(async (payload: { name: string; email: string; password: string; role: UserRole }) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data?.error || "Gagal melakukan registrasi" }
      }

      return { success: true }
    } catch {
      return { success: false, error: "Gagal terhubung ke server" }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      // Ignore network errors on logout.
    }
    setUser(null)
    router.replace("/login")
  }, [router])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      getRedirectPath,
    }),
    [user, isLoading, login, register, logout, getRedirectPath],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles?: UserRole[]
) {
  return function ProtectedComponent(props: P) {
    const { user, isLoading, isAuthenticated } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.replace("/login")
      } else if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
        router.replace("/unauthorized")
      }
    }, [isLoading, isAuthenticated, user, router, allowedRoles])

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center liquid-glass-bg">
          <div className="w-12 h-12 border-4 border-white/30 border-t-purple-400 rounded-full animate-spin" />
        </div>
      )
    }

    if (!isAuthenticated || (allowedRoles && user && !allowedRoles.includes(user.role))) {
      return null
    }

    return <Component {...props} />
  }
}
