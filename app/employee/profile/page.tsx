"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { ImageUploadModal } from "@/components/molecules/image-upload"
import { mockEmployees, mockSchedule, mockClasses } from "@/lib/mock-data"
import { Mail, BookOpen, Star, Users, Calendar, Award, Edit, Clock, TrendingUp, Camera, Save, X } from "lucide-react"

export default function EmployeeProfile() {
  const [employee, setEmployee] = useState(mockEmployees[0])
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const employeeSchedule = mockSchedule.filter((s) => s.teacherId === employee.id)
  const uniqueClasses = [...new Set(employeeSchedule.map((s) => s.classId))]

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: employee.name,
    email: employee.email,
    subject: employee.subject,
  })

  // Calculate teaching hours per week
  const totalHoursPerWeek = employeeSchedule.reduce((acc, s) => {
    const start = Number.parseInt(s.startTime.split(":")[0])
    const end = Number.parseInt(s.endTime.split(":")[0])
    return acc + (end - start) + 0.5
  }, 0)

  const handleEditProfile = () => {
    setEditForm({
      name: employee.name,
      email: employee.email,
      subject: employee.subject,
    })
    setShowEditModal(true)
  }

  const handleSaveProfile = () => {
    setEmployee({
      ...employee,
      name: editForm.name,
      email: editForm.email,
      subject: editForm.subject,
    })
    setShowEditModal(false)
    toast.success("Profil berhasil diperbarui", {
      description: "Perubahan telah disimpan",
    })
  }

  const handleAvatarSave = (imageData: string | null) => {
    if (imageData) {
      setEmployee({ ...employee, avatar: imageData })
      toast.success("Foto profil berhasil diperbarui", {
        description: "Perubahan telah disimpan",
      })
    }
    setShowAvatarModal(false)
  }

  return (
    <DashboardLayout role="EMPLOYEE" userName={employee.name} userAvatar={employee.avatar}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={employee.avatar || "/placeholder.svg?height=120&width=120&query=teacher portrait professional"}
                alt={employee.name}
                className="w-24 h-24 rounded-full border-4 border-white/30 object-cover"
              />
              <button 
                onClick={() => setShowAvatarModal(true)}
                className="absolute bottom-0 right-0 p-2 bg-slate-100 backdrop-blur-xl rounded-full border border-slate-200 hover:bg-slate-200 transition-colors"
              >
                <Camera className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mt-4">{employee.name}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {employee.email}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 mt-3">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium">{employee.subject} Teacher</span>
            </div>
          </div>
        </GlassCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <GlassCard className="text-center py-4">
            <Star className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
            <p className="text-xl font-bold text-slate-800">{employee.rating}</p>
            <p className="text-xs text-slate-500">Rating</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <Users className="w-6 h-6 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold text-slate-800">{employee.classesCount}</p>
            <p className="text-xs text-slate-500">Classes</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <Clock className="w-6 h-6 mx-auto mb-1 text-purple-500" />
            <p className="text-xl font-bold text-slate-800">{totalHoursPerWeek}h</p>
            <p className="text-xs text-slate-500">Weekly</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <TrendingUp className="w-6 h-6 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold text-slate-800">95%</p>
            <p className="text-xs text-slate-500">Attend</p>
          </GlassCard>
        </div>

        {/* Teaching Information */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Teaching Information
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Award className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs text-slate-400">Subject Expertise</p>
                <p className="font-medium text-slate-800">{employee.subject}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Users className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs text-slate-400">Assigned Classes</p>
                <p className="font-medium text-slate-800">{uniqueClasses.length} classes</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Calendar className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs text-slate-400">Weekly Sessions</p>
                <p className="font-medium text-slate-800">{employeeSchedule.length} sessions</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Classes Taught */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Classes Taught
          </h2>

          <div className="space-y-2">
            {uniqueClasses.map((classId) => {
              const classInfo = mockClasses.find((c) => c.id === classId)
              const classSessions = employeeSchedule.filter((s) => s.classId === classId)
              return (
                <div key={classId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-medium text-slate-800">{classInfo?.name || "Unknown"}</p>
                    <p className="text-xs text-slate-400">Grade {classInfo?.grade}</p>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs rounded-full border border-purple-200">
                    {classSessions.length} sessions/week
                  </span>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Edit Profile Button */}
        <GlassButton className="w-full py-4" onClick={handleEditProfile}>
          <Edit className="w-5 h-5 mr-2" />
          Edit Profile
        </GlassButton>
      </div>

      {/* Edit Profile Modal */}
      <GlassModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profil">
        <div className="space-y-5">
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
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Mata Pelajaran</label>
            <GlassInput
              value={editForm.subject}
              onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
              placeholder="Masukkan mata pelajaran"
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <GlassButton 
              variant="secondary"
              className="flex-1 justify-center" 
              onClick={() => setShowEditModal(false)}
            >
              <X className="w-4 h-4 mr-2" />
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
        </div>
      </GlassModal>

      {/* Avatar Upload Modal */}
      <ImageUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentImage={employee.avatar}
        onSave={handleAvatarSave}
        title="Upload Foto Profil"
      />
    </DashboardLayout>
  )
}
