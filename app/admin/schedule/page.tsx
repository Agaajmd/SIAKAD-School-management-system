"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { 
  mockAdmins, 
  mockSchedule, 
  mockClasses, 
  mockEmployees,
  mockPiketSchedule,
  mockStudents,
  Schedule 
} from "@/lib/mock-data"
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  MapPin, 
  BookOpen,
  User,
  Search,
  Filter,
  Save,
  X,
  Users,
  Sparkles
} from "lucide-react"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function AdminSchedulePage() {
  const admin = mockAdmins[0]
  const [schedules, setSchedules] = useState<Schedule[]>([...mockSchedule])
  const [selectedDay, setSelectedDay] = useState("Monday")
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null)
  
  const [formData, setFormData] = useState({
    classId: "c1",
    subject: "",
    teacherId: "",
    day: "Monday",
    startTime: "",
    endTime: "",
    room: "",
  })

  const filteredSchedules = schedules.filter(s => {
    const matchDay = s.day === selectedDay
    const matchSearch = searchQuery 
      ? s.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.room.toLowerCase().includes(searchQuery.toLowerCase())
      : true
    return matchDay && matchSearch
  })

  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime)
  })

  const handleOpenCreate = () => {
    setEditingSchedule(null)
    setFormData({
      classId: "c1",
      subject: "",
      teacherId: "",
      day: selectedDay,
      startTime: "",
      endTime: "",
      room: "",
    })
    setShowModal(true)
  }

  const handleOpenEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      classId: schedule.classId,
      subject: schedule.subject,
      teacherId: schedule.teacherId,
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room,
    })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!formData.subject || !formData.teacherId || !formData.startTime || !formData.endTime || !formData.room) {
      toast.error("Semua field harus diisi")
      return
    }

    if (editingSchedule) {
      // Update existing
      setSchedules(schedules.map(s => 
        s.id === editingSchedule.id 
          ? { ...s, ...formData }
          : s
      ))
      toast.success("Jadwal berhasil diperbarui")
    } else {
      // Create new
      const newSchedule: Schedule = {
        id: `sch${Date.now()}`,
        ...formData,
      }
      setSchedules([...schedules, newSchedule])
      toast.success("Jadwal berhasil ditambahkan")
    }
    setShowModal(false)
  }

  const handleDelete = () => {
    if (!scheduleToDelete) return
    setSchedules(schedules.filter(s => s.id !== scheduleToDelete.id))
    toast.success("Jadwal berhasil dihapus")
    setShowDeleteModal(false)
    setScheduleToDelete(null)
  }

  const getTeacherName = (teacherId: string) => {
    return mockEmployees.find(e => e.id === teacherId)?.name || "Unknown"
  }

  const getClassName = (classId: string) => {
    return mockClasses.find(c => c.id === classId)?.name || "Unknown"
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Manajemen Jadwal</h1>
            <p className="text-sm text-slate-500">Kelola jadwal pelajaran untuk semua kelas</p>
          </div>
          <GlassButton onClick={handleOpenCreate} className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Jadwal
          </GlassButton>
        </div>

        {/* Today's Duty Section */}
        <GlassCard className="border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Piket Hari Ini</h2>
              <p className="text-sm text-slate-500">Siswa yang bertugas pada {selectedDay}</p>
            </div>
          </div>
          
          {(() => {
            const todayPiket = mockPiketSchedule.filter(p => p.day === selectedDay)
            if (todayPiket.length === 0) {
              return (
                <div className="text-center py-4 text-slate-400">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Tidak ada jadwal piket untuk hari ini</p>
                </div>
              )
            }
            return (
              <div className="space-y-3">
                {todayPiket.map(piket => {
                  const className = getClassName(piket.classId)
                  const students = piket.studentIds.map(sid => 
                    mockStudents.find(s => s.id === sid)
                  ).filter(Boolean)
                  
                  return (
                    <div key={piket.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {className}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {students.map(student => (
                          <div key={student?.id} className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-slate-200">
                            <img 
                              src={student?.avatar} 
                              alt={student?.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="text-sm text-slate-700">{student?.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

        </GlassCard>

        {/* Day Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedDay === day
                  ? "bg-purple-500 text-white shadow-lg"
                  : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Search */}
        <GlassCard className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <GlassInput
              placeholder="Cari mata pelajaran atau ruangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </GlassCard>

        {/* Schedule List */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Jadwal {selectedDay} ({sortedSchedules.length})
          </h2>

          {sortedSchedules.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada jadwal untuk hari ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSchedules.map(schedule => (
                <div
                  key={schedule.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-3"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-lg font-bold text-slate-800">{schedule.startTime}</p>
                      <p className="text-xs text-slate-400">{schedule.endTime}</p>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        {schedule.subject}
                      </h3>
                      <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                        <User className="w-3 h-3" />
                        {getTeacherName(schedule.teacherId)}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {schedule.room}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {getClassName(schedule.classId)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    <GlassButton
                      size="sm"
                      onClick={() => handleOpenEdit(schedule)}
                      className="flex-1 sm:flex-none justify-center"
                    >
                      <Edit className="w-4 h-4" />
                    </GlassButton>
                    <GlassButton
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setScheduleToDelete(schedule)
                        setShowDeleteModal(true)
                      }}
                      className="flex-1 sm:flex-none justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Create/Edit Modal */}
        <GlassModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingSchedule ? "Edit Jadwal" : "Tambah Jadwal Baru"}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Kelas</label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              >
                {mockClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Mata Pelajaran</label>
              <GlassInput
                placeholder="Contoh: Matematika"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Guru</label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              >
                <option value="">Pilih Guru</option>
                {mockEmployees.map(e => (
                  <option key={e.id} value={e.id}>{e.name} - {e.subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Hari</label>
              <select
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              >
                {DAYS.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Jam Mulai</label>
                <GlassInput
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Jam Selesai</label>
                <GlassInput
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Ruangan</label>
              <GlassInput
                placeholder="Contoh: Ruang 101"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowModal(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton
                className="flex-1 justify-center"
                onClick={handleSave}
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        {/* Delete Confirmation Modal */}
        <GlassModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Hapus Jadwal"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-slate-700">
                Apakah Anda yakin ingin menghapus jadwal{" "}
                <span className="font-semibold text-red-600">{scheduleToDelete?.subject}</span>?
              </p>
              <p className="text-sm text-slate-500 mt-1">Aksi ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex gap-3">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowDeleteModal(false)}
              >
                Batal
              </GlassButton>
              <GlassButton
                variant="danger"
                className="flex-1 justify-center"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
