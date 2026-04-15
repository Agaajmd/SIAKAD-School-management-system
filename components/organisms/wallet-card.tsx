"use client"

import { GlassCard } from "@/components/molecules/glass-card"
import { Sparkles, Trophy } from "lucide-react"
import type { Student } from "@/lib/data-model"

interface WalletCardProps {
  student: Student
}

export const WalletCard = ({ student }: WalletCardProps) => {
  const positivePoints = Number((student as any)?.positivePoints ?? 0)
  const negativePoints = Number((student as any)?.negativePoints ?? 0)
  const totalPoints = Number((student as any)?.totalPoints ?? (positivePoints - negativePoints))

  return (
    <GlassCard className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-5 group transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/25">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 transition-transform duration-700 group-hover:scale-110" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-white/90">Total Poin Siswa</span>
          <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-yellow-400 transition-transform duration-300 group-hover:rotate-12" />
          <span className="text-3xl font-bold text-white">{totalPoints.toLocaleString()}</span>
        </div>

        <div className="mb-4 flex items-center gap-2 text-[11px] text-white/90">
          <span className="rounded-full bg-white/20 px-2 py-0.5">+{positivePoints}</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5">-{negativePoints}</span>
        </div>

        <div className="flex items-center justify-between text-white/90 text-xs">
          <span className="truncate mr-2">{student.name}</span>
          <span className="shrink-0">{String(student.classId || "-").toUpperCase()}</span>
        </div>
      </div>
    </GlassCard>
  )
}
