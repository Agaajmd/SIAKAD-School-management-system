"use client"

import { GlassCard } from "@/components/molecules/glass-card"
import type { FinancialData } from "@/lib/data-model"

interface FinancialChartProps {
  data: FinancialData[]
}

export const FinancialChart = ({ data }: FinancialChartProps) => {
  if (data.length === 0) {
    return (
      <GlassCard>
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Financial Overview</h3>
        <div className="h-48 flex items-center justify-center text-sm text-slate-500">Belum ada data keuangan</div>
      </GlassCard>
    )
  }

  const maxValue = Math.max(1, ...data.flatMap((d) => [d.income, d.expenses]))

  return (
    <GlassCard>
      <h3 className="text-lg font-semibold text-slate-800 mb-6">Financial Overview</h3>

      <div className="flex items-end justify-between gap-2 h-48">
        {data.map((item) => (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
            <div className="flex gap-1 w-full h-full items-end justify-center">
              {/* Income Bar */}
              <div
                className="w-3 md:w-4 bg-gradient-to-t from-green-400 to-emerald-300 rounded-t-lg transition-all duration-500"
                style={{ height: `${(item.income / maxValue) * 100}%` }}
              />
              {/* Expenses Bar */}
              <div
                className="w-3 md:w-4 bg-gradient-to-t from-pink-400 to-rose-300 rounded-t-lg transition-all duration-500"
                style={{ height: `${(item.expenses / maxValue) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{item.month}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-300" />
          <span className="text-xs text-slate-500">Income</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-rose-300" />
          <span className="text-xs text-slate-500">Expenses</span>
        </div>
      </div>
    </GlassCard>
  )
}
