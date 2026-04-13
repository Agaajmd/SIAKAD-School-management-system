"use client"

import { GlassCard } from "@/components/molecules/glass-card"
import { Trophy, Medal, Award, Flame, TrendingUp } from "lucide-react"
import type { Student } from "@/lib/data-model"

interface AttendanceLeaderboardProps {
  limit?: number
  showTitle?: boolean
  students?: Student[]
}

// Calculate attendance score based on streak and attendance status
const getAttendanceScore = (student: Student) => {
  const baseScore = student.attendance === "PRESENT" ? 100 : student.attendance === "SICK" ? 50 : 0
  const streakBonus = student.streak * 5
  return baseScore + streakBonus
}

export const AttendanceLeaderboard = ({ limit = 15, showTitle = true, students = [] }: AttendanceLeaderboardProps) => {
  // Sort students by attendance score
  const sortedStudents = [...students]
    .map(student => ({
      ...student,
      attendanceScore: getAttendanceScore(student),
    }))
    .sort((a, b) => b.attendanceScore - a.attendanceScore)
    .slice(0, limit)

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-400" />
      case 1:
        return <Medal className="w-5 h-5 text-gray-300" />
      case 2:
        return <Award className="w-5 h-5 text-orange-400" />
      default:
        return null
    }
  }

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return "bg-amber-50 border-amber-200"
      case 1:
        return "bg-slate-50 border-slate-200"
      case 2:
        return "bg-orange-50 border-orange-200"
      default:
        return "bg-white border-slate-100"
    }
  }

  return (
    <GlassCard>
      {showTitle && (
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="text-base font-semibold text-slate-800">Top {limit} Kehadiran</h2>
        </div>
      )}

      <div className="space-y-2">
        {sortedStudents.map((student, index) => (
          <div
            key={student.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all hover:scale-[1.01] ${getRankBg(index)}`}
          >
            {/* Rank */}
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              {getRankIcon(index) || (
                <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
              )}
            </div>

            {/* Avatar */}
            <img
              src={student.avatar || "/placeholder.svg?height=40&width=40&query=student"}
              alt={student.name}
              className="w-9 h-9 rounded-full object-cover border-2 border-slate-100 shrink-0"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 text-sm truncate">{student.name}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="flex items-center gap-0.5">
                  <Flame className="w-3 h-3 text-orange-500" />
                  {student.streak} streak
                </span>
                <span>•</span>
                <span className={`${
                  student.attendance === "PRESENT" ? "text-emerald-600" : 
                  student.attendance === "SICK" ? "text-amber-600" : "text-red-500"
                }`}>
                  {student.attendance === "PRESENT" ? "Hadir" : student.attendance === "SICK" ? "Sakit" : "Alpha"}
                </span>
              </div>
            </div>

            {/* Score */}
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-slate-800">{student.attendanceScore}</p>
              <p className="text-[10px] text-slate-400">poin</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
