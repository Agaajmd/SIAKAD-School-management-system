"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassToast } from "@/components/molecules/glass-toast"
import { 
  mockAdmins, 
  mockClasses, 
  mockStudents, 
  mockEmployees,
  type ClassRoom 
} from "@/lib/mock-data"
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  GraduationCap, 
  School,
  Grid3X3,
  User,
  Search,
  MoreVertical,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function AdminClassManagement() {
  const admin = mockAdmins[0]
  const [classes, setClasses] = useState<ClassRoom[]>(mockClasses)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassRoom | null>(null)
  const [toast, setToast] = useState({ open: false, message: "", type: "success" as "success" | "error" })

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    rows: 5,
    cols: 5,
    teacherId: "",
  })

  // Filter classes based on search
  const filteredClasses = classes.filter(cls => 
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.grade.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get student count for a class
  const getStudentCount = (classId: string) => {
    return mockStudents.filter(s => s.classId === classId).length
  }

  // Get teacher name for a class
  const getTeacherName = (teacherId: string) => {
    const teacher = mockEmployees.find(e => e.id === teacherId)
    return teacher?.name || "Belum ditentukan"
  }

  // Create new class
  const handleCreate = () => {
    const newClass: ClassRoom = {
      id: `c${Date.now()}`,
      name: formData.name,
      grade: formData.grade,
      rows: formData.rows,
      cols: formData.cols,
      teacherId: formData.teacherId,
    }
    setClasses([...classes, newClass])
    setShowCreateModal(false)
    resetForm()
    setToast({ open: true, message: `Kelas ${newClass.name} berhasil dibuat`, type: "success" })
  }

  // Update class
  const handleUpdate = () => {
    if (!selectedClass) return
    setClasses(classes.map(cls => 
      cls.id === selectedClass.id 
        ? { ...cls, ...formData }
        : cls
    ))
    setShowEditModal(false)
    setSelectedClass(null)
    resetForm()
    setToast({ open: true, message: "Kelas berhasil diperbarui", type: "success" })
  }

  // Delete class
  const handleDelete = () => {
    if (!selectedClass) return
    setClasses(classes.filter(cls => cls.id !== selectedClass.id))
    setShowDeleteModal(false)
    setSelectedClass(null)
    setToast({ open: true, message: "Kelas berhasil dihapus", type: "success" })
  }

  // Open edit modal
  const openEditModal = (cls: ClassRoom) => {
    setSelectedClass(cls)
    setFormData({
      name: cls.name,
      grade: cls.grade,
      rows: cls.rows,
      cols: cls.cols,
      teacherId: cls.teacherId,
    })
    setShowEditModal(true)
  }

  // Open delete modal
  const openDeleteModal = (cls: ClassRoom) => {
    setSelectedClass(cls)
    setShowDeleteModal(true)
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      grade: "",
      rows: 5,
      cols: 5,
      teacherId: "",
    })
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar}>
      <div className="max-w-6xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Manajemen Kelas</h1>
            <p className="text-slate-500">Kelola semua kelas di sekolah</p>
          </div>
          <GlassButton 
            onClick={() => {
              resetForm()
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas</span>
          </GlassButton>
        </div>

        {/* Search */}
        <GlassCard className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <GlassInput
              type="text"
              placeholder="Cari kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard className="p-4 text-center">
            <School className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{classes.length}</p>
            <p className="text-xs text-slate-500">Total Kelas</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">
              {mockStudents.length}
            </p>
            <p className="text-xs text-slate-500">Total Siswa</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <User className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">
              {mockEmployees.length}
            </p>
            <p className="text-xs text-slate-500">Total Guru</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <Grid3X3 className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">
              {classes.reduce((acc, cls) => acc + cls.rows * cls.cols, 0)}
            </p>
            <p className="text-xs text-slate-500">Total Kursi</p>
          </GlassCard>
        </div>

        {/* Class List */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => {
            const studentCount = getStudentCount(cls.id)
            const teacherName = getTeacherName(cls.teacherId)
            const capacity = cls.rows * cls.cols
            const occupancy = Math.round((studentCount / capacity) * 100)
            
            return (
              <GlassCard key={cls.id} className="p-4 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{cls.name}</h3>
                      <p className="text-xs text-slate-500">Grade {cls.grade}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openEditModal(cls)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button 
                      onClick={() => openDeleteModal(cls)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Wali Kelas</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{teacherName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Kapasitas</span>
                    <span className="font-medium text-slate-700">{cls.rows} x {cls.cols} = {capacity} kursi</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Siswa</span>
                    <span className="font-medium text-slate-700">{studentCount} siswa</span>
                  </div>

                  {/* Occupancy Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Terisi</span>
                      <span className={cn(
                        "font-medium",
                        occupancy >= 80 ? "text-red-600" : 
                        occupancy >= 50 ? "text-amber-600" : "text-green-600"
                      )}>{occupancy}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          occupancy >= 80 ? "bg-red-500" : 
                          occupancy >= 50 ? "bg-amber-500" : "bg-green-500"
                        )}
                        style={{ width: `${Math.min(occupancy, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>

        {filteredClasses.length === 0 && (
          <GlassCard className="p-8 text-center">
            <School className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600">Tidak ada kelas ditemukan</h3>
            <p className="text-slate-400 mt-1">Coba ubah pencarian atau tambah kelas baru</p>
          </GlassCard>
        )}

        {/* Create Modal */}
        <GlassModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Tambah Kelas Baru"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nama Kelas</label>
              <GlassInput
                placeholder="Contoh: Class 10-A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Grade</label>
              <GlassInput
                placeholder="Contoh: 10"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Baris</label>
                <GlassInput
                  type="number"
                  min={1}
                  max={10}
                  value={formData.rows}
                  onChange={(e) => setFormData({ ...formData, rows: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Kolom</label>
                <GlassInput
                  type="number"
                  min={1}
                  max={10}
                  value={formData.cols}
                  onChange={(e) => setFormData({ ...formData, cols: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Wali Kelas</label>
              <select
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              >
                <option value="">Pilih Guru</option>
                {mockEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} - {emp.subject}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <GlassButton
                variant="secondary"
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
              >
                Batal
              </GlassButton>
              <GlassButton
                className="flex-1"
                onClick={handleCreate}
                disabled={!formData.name || !formData.grade}
              >
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        {/* Edit Modal */}
        <GlassModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Kelas"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nama Kelas</label>
              <GlassInput
                placeholder="Contoh: Class 10-A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Grade</label>
              <GlassInput
                placeholder="Contoh: 10"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Baris</label>
                <GlassInput
                  type="number"
                  min={1}
                  max={10}
                  value={formData.rows}
                  onChange={(e) => setFormData({ ...formData, rows: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Kolom</label>
                <GlassInput
                  type="number"
                  min={1}
                  max={10}
                  value={formData.cols}
                  onChange={(e) => setFormData({ ...formData, cols: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Wali Kelas</label>
              <select
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              >
                <option value="">Pilih Guru</option>
                {mockEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} - {emp.subject}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <GlassButton
                variant="secondary"
                className="flex-1"
                onClick={() => setShowEditModal(false)}
              >
                Batal
              </GlassButton>
              <GlassButton
                className="flex-1"
                onClick={handleUpdate}
                disabled={!formData.name || !formData.grade}
              >
                Simpan Perubahan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        {/* Delete Confirmation Modal */}
        <GlassModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Hapus Kelas"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800">
                Apakah Anda yakin ingin menghapus kelas <strong>{selectedClass?.name}</strong>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <GlassButton
                variant="secondary"
                className="flex-1"
                onClick={() => setShowDeleteModal(false)}
              >
                Batal
              </GlassButton>
              <GlassButton
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDelete}
              >
                Hapus
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        {/* Toast */}
        <GlassToast
          isOpen={toast.open}
          onClose={() => setToast({ ...toast, open: false })}
          message={toast.message}
          type={toast.type}
        />
      </div>
    </DashboardLayout>
  )
}
