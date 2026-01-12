"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export const GlassCard = ({ children, className, onClick, hover = false }: GlassCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white/80 backdrop-blur-sm border border-slate-200/80 shadow-sm rounded-xl p-4",
        "transition-all duration-300 ease-out",
        hover && "hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1 hover:bg-white active:scale-[0.98] cursor-pointer",
        onClick && "cursor-pointer active:scale-[0.98] hover:bg-white hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  )
}
