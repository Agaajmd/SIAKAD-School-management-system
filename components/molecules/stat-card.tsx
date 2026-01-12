import { LucideIcon } from "lucide-react"
import { GlassCard } from "@/components/molecules/glass-card"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: string
    label: string
    isPositive?: boolean
  }
  iconBgColor?: string
  iconColor?: string
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  iconBgColor = "from-blue-500/20 to-blue-600/20",
  iconColor = "text-blue-400"
}: StatCardProps) {
  return (
    <GlassCard className="p-6 hover:scale-[1.02] transition-transform">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white/60 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 bg-gradient-to-br ${iconBgColor} rounded-xl`}>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-medium ${trend.isPositive !== false ? 'text-green-400' : 'text-red-400'}`}>
            {trend.value}
          </span>
          <span className="text-white/50">{trend.label}</span>
        </div>
      )}
    </GlassCard>
  )
}
