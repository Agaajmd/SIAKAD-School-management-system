import { LucideIcon } from "lucide-react"
import { GlassCard } from "@/components/molecules/glass-card"

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  iconBgColor?: string
  iconColor?: string
}

export function FeatureCard({ 
  title, 
  description, 
  icon: Icon,
  iconBgColor = "from-purple-500/20 to-pink-500/20",
  iconColor = "text-purple-400"
}: FeatureCardProps) {
  return (
    <GlassCard className="p-6 hover:scale-105 transition-transform group">
      <div className={`p-3 bg-gradient-to-br ${iconBgColor} rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm">{description}</p>
    </GlassCard>
  )
}
