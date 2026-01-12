"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { mockAdmins, mockStudents, mockEmployees, mockClasses } from "@/lib/mock-data"
import {
  User,
  Mail,
  Shield,
  Edit,
  GraduationCap,
  Briefcase,
  School,
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  Save,
} from "lucide-react"

export default function AdminProfile() {
  const [admin, setAdmin] = useState(mockAdmins[0])
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: admin.name,
    email: admin.email,
  })

  // Mock admin activity
  const recentActivities = [
    { action: "Menyetujui laporan aset", time: "2 jam lalu", status: "success" },
    { action: "Memperbarui data siswa", time: "4 jam lalu", status: "success" },
    { action: "Membuat laporan bulanan", time: "1 hari lalu", status: "success" },
    { action: "Menyelesaikan masalah pembayaran", time: "2 hari lalu", status: "warning" },
  ]

  const handleSaveProfile = () => {
    setAdmin({ ...admin, name: editForm.name, email: editForm.email })
    setShowEditModal(false)
    toast.success("Profil berhasil diperbarui")
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setAdmin({ ...admin, avatar: result })
        toast.success("Foto profil berhasil diperbarui")
      }
      reader.readAsDataURL(file)
    }
    setShowAvatarModal(false)
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar}>
      <div className="max-w-2xl mx-auto space-y-5 px-1">
        {/* Profile Header */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={admin.avatar || "/placeholder.svg?height=120&width=120&query=admin professional portrait"}
                alt={admin.name}
                className="w-24 h-24 rounded-full border-4 border-amber-100 object-cover"
              />
              <button 
                onClick={() => setShowAvatarModal(true)}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <Camera className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <h1 className="text-xl font-bold text-slate-800 mt-4">{admin.name}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1 text-sm">
              <Mail className="w-4 h-4" />
              {admin.email}
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 mt-3">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Administrator</span>
            </div>
          </div>
        </GlassCard>

        {/* Management Stats */}
        <div className="grid grid-cols-3 gap-2">
          <GlassCard className="text-center py-3">
            <GraduationCap className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-slate-800">{mockStudents.length}</p>
            <p className="text-[10px] text-slate-500">Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <Briefcase className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-lg font-bold text-slate-800">{mockEmployees.length}</p>
            <p className="text-[10px] text-slate-500">Guru</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <School className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-bold text-slate-800">{mockClasses.length}</p>
            <p className="text-[10px] text-slate-500">Kelas</p>
          </GlassCard>
        </div>

        {/* Admin Information */}
        <GlassCard>
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-400" />
            Informasi Administrator
          </h2>

          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Shield className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="font-medium text-slate-800 text-sm">System Administrator</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Clock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Level Akses</p>
                <p className="font-medium text-slate-800 text-sm">Akses Admin Penuh</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Status Akun</p>
                <p className="font-medium text-emerald-600 text-sm">Aktif</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard>
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Aktivitas Terbaru
          </h2>

          <div className="space-y-2">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {activity.status === "success" ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{activity.action}</p>
                    <p className="text-xs text-slate-500">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Edit Profile Button */}
        <GlassButton 
          className="w-full justify-center py-3"
          onClick={() => {
            setEditForm({ name: admin.name, email: admin.email })
            setShowEditModal(true)
          }}
        >
          <Edit className="w-5 h-5 mr-2" />
          Edit Profil
        </GlassButton>
      </div>

      {/* Edit Profile Modal */}
      <GlassModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profil"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nama Lengkap</label>
            <GlassInput
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Masukkan nama lengkap"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
            <GlassInput
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="Masukkan email"
            />
          </div>
        </div>
        
        <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
          <GlassButton 
            variant="secondary"
            className="flex-1 justify-center" 
            onClick={() => setShowEditModal(false)}
          >
            Batal
          </GlassButton>
          <GlassButton 
            className="flex-1 justify-center" 
            onClick={handleSaveProfile}
          >
            <Save className="w-4 h-4 mr-2" />
            Simpan
          </GlassButton>
        </div>
      </GlassModal>

      {/* Avatar Upload Modal */}
      <GlassModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Upload Foto Profil"
        size="sm"
      >
        <label className="block border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleAvatarChange}
          />
          <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Klik untuk pilih foto</p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG (maks 5MB)</p>
        </label>
        
        <GlassButton
          variant="secondary"
          onClick={() => setShowAvatarModal(false)}
          className="w-full justify-center mt-4"
        >
          Batal
        </GlassButton>
      </GlassModal>
    </DashboardLayout>
  )
}
