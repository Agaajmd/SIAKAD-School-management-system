"use client"

import { GlassCard } from "@/components/molecules/glass-card"
import { Clock, MapPin } from "lucide-react"
import type { Schedule } from "@/lib/data-model"
import { cn } from "@/lib/utils"

interface ScheduleTimelineProps {
  schedules: Schedule[]
  currentDay?: string
}

export const ScheduleTimeline = ({ schedules, currentDay = "Monday" }: ScheduleTimelineProps) => {
  const groupedByDay = schedules.reduce(
    (acc, schedule) => {
      if (!acc[schedule.day]) acc[schedule.day] = []
      acc[schedule.day].push(schedule)
      return acc
    },
    {} as Record<string, Schedule[]>,
  )

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

  return (
    <div className="space-y-4 sm:space-y-6">
      {days.map((day) => {
        const daySchedules = groupedByDay[day] || []
        if (daySchedules.length === 0) return null

        return (
          <div key={day} className="animate-fade-in">
            <h3
              className={cn(
                "text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center gap-2 flex-wrap",
                day === currentDay ? "text-slate-800" : "text-slate-400",
              )}
            >
              {day}
              {day === currentDay && (
                <span className="px-2 py-0.5 text-[10px] sm:text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-purple-600 rounded-full border border-purple-200">
                  Today
                </span>
              )}
            </h3>
            <div className="space-y-2 sm:space-y-3 relative">
              <div className="absolute left-3 sm:left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-400/40 via-purple-400/40 to-transparent" />
              {daySchedules.map((schedule, index) => (
                <div
                  key={schedule.id}
                  className="relative pl-8 sm:pl-10"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute left-1.5 sm:left-2.5 top-4 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 ring-4 ring-white/20 animate-pulse" />
                  <GlassCard className="py-3 px-3 sm:px-4" hover>
                    <h4 className="font-semibold text-slate-800 text-sm sm:text-base">{schedule.subject}</h4>
                    <div className="flex flex-wrap gap-2 sm:gap-4 mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {schedule.startTime} - {schedule.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{schedule.room}</span>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
