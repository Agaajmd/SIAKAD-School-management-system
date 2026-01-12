"use client"

import { GlassCard } from "@/components/molecules/glass-card"
import { Star, TrendingUp } from "lucide-react"
import type { Employee } from "@/lib/mock-data"

interface EmployeeLeaderboardProps {
  employees: Employee[]
}

export const EmployeeLeaderboard = ({ employees }: EmployeeLeaderboardProps) => {
  const sorted = [...employees].sort((a, b) => b.rating - a.rating)

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Top Performers</h3>
        <TrendingUp className="w-5 h-5 text-green-500" />
      </div>

      <div className="space-y-3">
        {sorted.map((employee, index) => (
          <div
            key={employee.id}
            className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl transition-all duration-300 hover:bg-slate-100"
          >
            <div className="relative">
              <img
                src={employee.avatar || "/placeholder.svg"}
                alt={employee.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              {index < 3 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 flex items-center justify-center text-[10px] font-bold text-white">
                  {index + 1}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{employee.name}</p>
              <p className="text-xs text-slate-500">{employee.subject}</p>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-semibold text-slate-800">{employee.rating}</span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
