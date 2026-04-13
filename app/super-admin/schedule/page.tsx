"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassInput } from "@/components/atoms/glass-input"
import { Calendar, MapPin, BookOpen, Search, Users, Briefcase, Shield, GraduationCap } from "lucide-react"

type Schedule = {
  id: string
  classId: string
  subject: string
  teacherId: string
  day: string
  startTime: string
  endTime: string
  room: string
}

type ClassRoom = { id: string; name: string }
type Teacher = { id: string; name: string; subject?: string; avatar?: string; homeroomClassId?: string }
type AdminUser = { id: string; name: string; email: string; avatar?: string }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function SuperAdminSchedulePage() {
  const [superAdmin, setSuperAdmin] = useState({ name: "Kepala Sekolah", avatar: "/placeholder-user.jpg" })
  const [selectedDay, setSelectedDay] = useState("Monday")
  const [searchQuery, setSearchQuery] = useState("")
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])

  useEffect(() => {
    const load = async () => {
      const [dashboardRes, scheduleRes, staffRes] = await Promise.all([
        fetch("/api/dashboard/super-admin", { cache: "no-store" }),
        fetch("/api/admin/schedule", { cache: "no-store" }),
        fetch("/api/staff", { cache: "no-store" }),
      ])

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json()
        if (dashboardData.superAdmin) setSuperAdmin(dashboardData.superAdmin)
      }

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json()
        setSchedules(Array.isArray(scheduleData.schedules) ? scheduleData.schedules : [])
        setClasses(Array.isArray(scheduleData.classes) ? scheduleData.classes : [])
        setTeachers(Array.isArray(scheduleData.teachers) ? scheduleData.teachers : [])
      }

      if (staffRes.ok) {
        const staffData = await staffRes.json()
        setAdmins(Array.isArray(staffData.admins) ? staffData.admins : [])
      }
    }

    load().catch(() => {
      // Keep fallback values.
    })
  }, [])

  const filteredSchedules = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return schedules
      .filter((schedule) => schedule.day === selectedDay)
      .filter((schedule) => {
        if (!query) return true
        const teacher = teachers.find((item) => item.id === schedule.teacherId)
        return (
          schedule.subject.toLowerCase().includes(query) ||
          schedule.room.toLowerCase().includes(query) ||
          (teacher?.name || "").toLowerCase().includes(query)
        )
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [schedules, selectedDay, searchQuery, teachers])

  const schedulesByTeacher = useMemo(() => {
    return teachers
      .map((teacher) => ({
        teacher,
        schedules: filteredSchedules.filter((schedule) => schedule.teacherId === teacher.id),
      }))
      .filter((item) => item.schedules.length > 0)
  }, [teachers, filteredSchedules])

  const getClassName = (classId: string) => classes.find((item) => item.id === classId)?.name || "Unknown"

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={superAdmin.name} userAvatar={superAdmin.avatar}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Jadwal Harian</h1>
            <p className="text-sm text-slate-500">Lihat seluruh jadwal guru dan admin hari ini</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 rounded-xl">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">{selectedDay}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-4"><div className="w-10 h-10 mx-auto mb-2 bg-blue-100 rounded-xl flex items-center justify-center"><Briefcase className="w-5 h-5 text-blue-600" /></div><p className="text-2xl font-bold text-slate-800">{schedulesByTeacher.length}</p><p className="text-xs text-slate-500">Guru Aktif</p></GlassCard>
          <GlassCard className="text-center py-4"><div className="w-10 h-10 mx-auto mb-2 bg-green-100 rounded-xl flex items-center justify-center"><GraduationCap className="w-5 h-5 text-green-600" /></div><p className="text-2xl font-bold text-slate-800">{filteredSchedules.length}</p><p className="text-xs text-slate-500">Kelas Hari Ini</p></GlassCard>
          <GlassCard className="text-center py-4"><div className="w-10 h-10 mx-auto mb-2 bg-orange-100 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-orange-600" /></div><p className="text-2xl font-bold text-slate-800">{admins.length}</p><p className="text-xs text-slate-500">Admin Aktif</p></GlassCard>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {DAYS.map((day) => (
            <button key={day} onClick={() => setSelectedDay(day)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedDay === day ? "bg-purple-500 text-white shadow-lg" : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"}`}>
              {day}
            </button>
          ))}
        </div>

        <GlassCard className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <GlassInput placeholder="Cari guru, mata pelajaran, atau ruangan..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10" />
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-purple-500" />Jadwal Guru ({schedulesByTeacher.length} guru aktif)</h2>
          <div className="space-y-4">
            {schedulesByTeacher.map(({ teacher, schedules: teacherSchedules }) => (
              <div key={teacher.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-200">
                  <img src={teacher.avatar || "/placeholder-user.jpg"} alt={teacher.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{teacher.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{teacher.subject || "-"}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{teacherSchedules.length} kelas</span>
                      {teacher.homeroomClassId && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Wali Kelas</span>}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {teacherSchedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100">
                      <div className="text-center min-w-[50px] px-2 py-1 bg-purple-50 rounded-lg"><p className="text-sm font-bold text-purple-700">{schedule.startTime}</p><p className="text-[10px] text-purple-500">{schedule.endTime}</p></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 text-sm flex items-center gap-1.5 truncate"><BookOpen className="w-3 h-3 text-blue-500 shrink-0" />{schedule.subject}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{schedule.room}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{getClassName(schedule.classId)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-orange-500" />Admin Staff Bertugas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img src={admin.avatar || "/placeholder-user.jpg"} alt={admin.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow" />
                <div className="flex-1"><p className="font-medium text-slate-800 text-sm">{admin.name}</p><p className="text-xs text-slate-500">{admin.email}</p></div>
                <div className="px-2 py-1 bg-green-100 rounded-full"><span className="text-xs text-green-700 font-medium">Aktif</span></div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  )
}
