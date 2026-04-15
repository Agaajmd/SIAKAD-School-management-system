"use client"

import { GlassCard } from "@/components/molecules/glass-card"
import { Trophy, Medal, Award, TrendingUp } from "lucide-react"
import type { Student } from "@/lib/data-model"

interface AttendanceLeaderboardProps {
  limit?: number
  showTitle?: boolean
  students?: Student[]
}

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getNetPoints = (student: Student) => {
  const positivePoints = toFiniteNumber((student as any).positivePoints)
  const negativePoints = toFiniteNumber((student as any).negativePoints)
  const totalPoints = (student as any).totalPoints ?? (student as any).points
  if (totalPoints != null) {
    return toFiniteNumber(totalPoints)
  }
  return positivePoints - negativePoints
}

// Combine total points with attendance bonus for class leaderboard ranking.
const getAttendanceScore = (student: Student) => {
  const attendanceBonus = student.attendance === "PRESENT" ? 20 : student.attendance === "SICK" ? 5 : 0
  return getNetPoints(student) + attendanceBonus
}

export const AttendanceLeaderboard = ({ limit = 15, showTitle = true, students = [] }: AttendanceLeaderboardProps) => {
  // Sort students by attendance score
  const sortedStudents = [...students]
    .map(student => ({
      ...student,
      attendanceScore: toFiniteNumber(getAttendanceScore(student)),
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
          <h2 className="text-base font-semibold text-slate-800">Top {limit} Poin Siswa</h2>
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
                <span>{getNetPoints(student) >= 0 ? `+${getNetPoints(student)}` : getNetPoints(student)} poin</span>
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
              <p className="text-sm font-bold text-slate-800">{toFiniteNumber(student.attendanceScore)}</p>
              <p className="text-[10px] text-slate-400">poin</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
