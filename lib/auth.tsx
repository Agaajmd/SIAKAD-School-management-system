"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { UserRole, Student, Employee, User } from "./mock-data"
import { mockStudents, mockEmployees, mockAdmins, mockSuperAdmins, mockParents, mockCanteenOwners } from "./mock-data"

// Auth user type combining all user types
export interface AuthUser {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  password?: string
}

// Mock users with passwords for login
export const mockAuthUsers: (AuthUser & { password: string })[] = [
  // Students
  ...mockStudents.map(s => ({ ...s, password: "student123" })),
  // Employees
  ...mockEmployees.map(e => ({ ...e, password: "guru123" })),
  // Admins
  ...mockAdmins.map(a => ({ ...a, password: "admin123" })),
  // Super Admins
  ...mockSuperAdmins.map(sa => ({ ...sa, password: "kepsek123" })),
  // Parents
  ...mockParents.map(p => ({ ...p, password: "parent123" })),
  // Canteen Owners
  ...mockCanteenOwners.map(co => ({ ...co, password: "canteen123" })),
]

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  getRedirectPath: (role: UserRole) => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem("auth_user")
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error("Failed to parse auth user:", error)
        localStorage.removeItem("auth_user")
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return

    const publicPaths = ["/", "/login", "/register"]
    const isPublicPath = publicPaths.includes(pathname)

    if (!user && !isPublicPath) {
      router.push("/")
    } else if (user && isPublicPath) {
      router.push(getRedirectPath(user.role))
    }
  }, [user, isLoading, pathname, router])

  const getRedirectPath = (role: UserRole): string => {
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
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))

    const foundUser = mockAuthUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )

    if (!foundUser) {
      return { success: false, error: "Email atau password salah" }
    }

    // Remove password before storing
    const { password: _, ...userWithoutPassword } = foundUser
    setUser(userWithoutPassword)
    localStorage.setItem("auth_user", JSON.stringify(userWithoutPassword))

    return { success: true }
  }

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))

    // Check if email already exists
    const existingUser = mockAuthUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase()
    )

    if (existingUser) {
      return { success: false, error: "Email sudah terdaftar" }
    }

    // Create new student user (default role for registration)
    const newUser: AuthUser = {
      id: `student-${Date.now()}`,
      name,
      email,
      avatar: "/placeholder-user.jpg",
      role: "STUDENT",
    }

    setUser(newUser)
    localStorage.setItem("auth_user", JSON.stringify(newUser))

    return { success: true }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("auth_user")
    router.push("/")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        getRedirectPath,
      }}
    >
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
        router.push("/login")
      } else if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
        router.push("/unauthorized")
      }
    }, [isLoading, isAuthenticated, user, router])

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
