"use client"

import { GlassCard } from "@/components/molecules/glass-card"
import { Flame, Trophy, Star, Zap } from "lucide-react"
import type { Student } from "@/lib/data-model"

interface GamificationStatsProps {
  student: Student
}

export const GamificationStats = ({ student }: GamificationStatsProps) => {
  const xpToNextLevel = (student.level + 1) * 500
  const xpProgress = ((student.xp % 500) / 500) * 100

  return (
    <div className="grid grid-cols-2 gap-3">
      <GlassCard className="flex flex-col items-center justify-center py-4 bg-white border border-slate-200" hover>
        <Flame className="w-7 h-7 text-orange-500 mb-2" />
        <span className="text-xl font-bold text-slate-800">{student.streak}</span>
        <span className="text-xs text-slate-500">Hari Streak</span>
      </GlassCard>

      <GlassCard className="flex flex-col items-center justify-center py-4 bg-white border border-slate-200" hover>
        <Trophy className="w-7 h-7 text-amber-500 mb-2" />
        <span className="text-xl font-bold text-slate-800">{student.level}</span>
        <span className="text-xs text-slate-500">Level</span>
      </GlassCard>

      <GlassCard className="flex flex-col items-center justify-center py-4 bg-white border border-slate-200" hover>
        <Star className="w-7 h-7 text-blue-500 mb-2" />
        <span className="text-xl font-bold text-slate-800">{student.behaviorScore}</span>
        <span className="text-xs text-slate-500">Perilaku</span>
      </GlassCard>

      <GlassCard className="flex flex-col items-center justify-center py-4 bg-white border border-slate-200" hover>
        <div className="relative w-full">
          <Zap className="w-7 h-7 text-emerald-500 mb-2 mx-auto" />
          <span className="text-xl font-bold text-slate-800 block text-center">{student.xp}</span>
          <span className="text-xs text-slate-500 block text-center mb-2">XP</span>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
