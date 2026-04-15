"use client"

import { GlassCard } from "@/components/molecules/glass-card"
import { Scale, TrendingDown, TrendingUp } from "lucide-react"
import type { Student } from "@/lib/data-model"

interface GamificationStatsProps {
  student: Student
}

export const GamificationStats = ({ student }: GamificationStatsProps) => {
  const positivePoints = Number((student as any).positivePoints ?? 0)
  const negativePoints = Number((student as any).negativePoints ?? 0)
  const totalPoints = Number((student as any).totalPoints ?? (positivePoints - negativePoints))

  return (
    <div className="grid grid-cols-2 gap-3">
      <GlassCard className="col-span-2 flex flex-col items-center justify-center py-4 bg-white border border-slate-200" hover>
        <Scale className="w-7 h-7 text-blue-500 mb-2" />
        <span className="text-xl font-bold text-blue-600">{totalPoints >= 0 ? `+${totalPoints}` : totalPoints}</span>
        <span className="text-xs text-slate-500">Total Poin</span>
      </GlassCard>

      <GlassCard className="flex flex-col items-center justify-center py-4 bg-white border border-slate-200" hover>
        <TrendingUp className="w-7 h-7 text-emerald-500 mb-2" />
        <span className="text-xl font-bold text-emerald-600">+{positivePoints}</span>
        <span className="text-xs text-slate-500">Poin Positif</span>
      </GlassCard>

      <GlassCard className="flex flex-col items-center justify-center py-4 bg-white border border-slate-200" hover>
        <TrendingDown className="w-7 h-7 text-rose-500 mb-2" />
        <span className="text-xl font-bold text-rose-600">-{negativePoints}</span>
        <span className="text-xs text-slate-500">Poin Negatif</span>
      </GlassCard>
    </div>
  )
}
