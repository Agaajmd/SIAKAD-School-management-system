"use client"

import { GlassCard } from "@/components/molecules/glass-card"
import { Clock, MapPin, User } from "lucide-react"
import type { Schedule, Employee } from "@/lib/data-model"

interface NextClassCardProps {
  schedule?: Schedule | null
  teacher?: Employee
}

export const NextClassCard = ({ schedule, teacher }: NextClassCardProps) => {
  if (!schedule) {
    return (
      <GlassCard className="bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kelas Berikutnya</span>
          <span className="px-2.5 py-1 text-xs bg-slate-100 text-slate-500 rounded-lg font-medium">-</span>
        </div>
        <h3 className="text-lg font-bold text-slate-800">Belum ada jadwal berikutnya</h3>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="bg-white border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kelas Berikutnya</span>
        <span className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg font-medium">{schedule.day}</span>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-3">{schedule.subject}</h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>
            {schedule.startTime} - {schedule.endTime}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span>{schedule.room}</span>
        </div>
        {teacher && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="w-4 h-4 text-slate-400" />
            <span>{teacher.name}</span>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
