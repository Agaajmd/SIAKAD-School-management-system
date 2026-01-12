"use client"

import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { mockParents, mockClasses, getChildrenByParent } from "@/lib/mock-data"
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Users,
  GraduationCap,
} from "lucide-react"
import Link from "next/link"

export default function ParentProfilePage() {
  const parent = mockParents[0]
  const children = getChildrenByParent(parent.id)

  return (
    <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
      <div className="max-w-2xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/parent" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Profil Saya</h1>
            <p className="text-slate-500 text-sm">Informasi akun orang tua</p>
          </div>
        </div>

        {/* Profile Card */}
        <GlassCard className="p-6 text-center">
          <img 
            src={parent.avatar} 
            alt={parent.name} 
            className="w-24 h-24 rounded-full object-cover mx-auto ring-4 ring-blue-100"
          />
          <h2 className="text-xl font-bold text-slate-800 mt-4">{parent.name}</h2>
          <p className="text-slate-500">Orang Tua / Wali</p>
        </GlassCard>

        {/* Info Cards */}
        <GlassCard className="p-4 space-y-4">
          <h3 className="font-semibold text-slate-800">Informasi Kontak</h3>
          
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="p-2 rounded-lg bg-blue-100">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="font-medium text-slate-800">{parent.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="p-2 rounded-lg bg-green-100">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Telepon</p>
              <p className="font-medium text-slate-800">{parent.phone}</p>
            </div>
          </div>
        </GlassCard>

        {/* Children List */}
        <GlassCard className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">Anak yang Terdaftar</h3>
          </div>
          
          <div className="space-y-3">
            {children.map(child => {
              const childClass = mockClasses.find(c => c.id === child.classId)
              return (
                <div key={child.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <img 
                    src={child.avatar} 
                    alt={child.name} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{child.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <GraduationCap className="w-4 h-4" />
                      <span>{childClass?.name}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  )
}
