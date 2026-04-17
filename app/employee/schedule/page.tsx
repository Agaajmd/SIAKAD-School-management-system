"use client"

import { useEffect, useMemo, useState } from "react"
import { GlassCard } from "@/components/molecules/glass-card"
import { RouteLoading } from "@/components/templates/route-loading"
import { Clock, MapPin, Users, ChevronLeft, ChevronRight } from "lucide-react"

type Employee = { id: string; name: string }
type Schedule = { id: string; classId: string; teacherId: string; day: string; subject: string; startTime: string; endTime: string; room: string }
type ClassRoom = { id: string; name: string; rows: number; cols: number }
type TeacherInfo = { id: string; name: string; avatar?: string }
type TeacherPiketSchedule = { id: string; day: string; teacherId: string }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const DAY_ALIASES: Record<string, string[]> = {
  monday: ["monday", "senin", "mon", "sen"],
  tuesday: ["tuesday", "selasa", "tue", "sel"],
  wednesday: ["wednesday", "rabu", "wed", "rab"],
  thursday: ["thursday", "kamis", "thu", "kam"],
  friday: ["friday", "jumat", "jum'at", "fri", "jum"],
  saturday: ["saturday", "sabtu", "sat", "sab"],
}

const normalizeDay = (value: unknown) => String(value || "").trim().toLowerCase()

export default function EmployeeSchedule() {
  const [employee, setEmployee] = useState<Employee>({ id: "", name: "" })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState("Monday")
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [teacherPiketSchedules, setTeacherPiketSchedules] = useState<TeacherPiketSchedule[]>([])
  const [teachers, setTeachers] = useState<TeacherInfo[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/employee/context", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        setEmployee(data.employee || { id: "", name: "" })
        setSchedules(Array.isArray(data.schedules) ? data.schedules : [])
        setClasses(Array.isArray(data.classes) ? data.classes : [])
        setTeacherPiketSchedules(Array.isArray(data.teacherPiketSchedules) ? data.teacherPiketSchedules : [])
        setTeachers(Array.isArray(data.teachers) ? data.teachers : [])
      } finally {
        setIsLoading(false)
      }
    }
    load().catch(() => {})
  }, [])

  const employeeSchedule = useMemo(() => schedules.filter((s) => s.teacherId === employee.id), [schedules, employee.id])
  const todaySchedule = useMemo(() => {
    const selectedAliases = new Set(DAY_ALIASES[normalizeDay(selectedDay)] || [])
    return employeeSchedule.filter((schedule) => selectedAliases.has(normalizeDay(schedule.day)))
  }, [employeeSchedule, selectedDay])
  const todayTeacherPiket = useMemo(
    () => {
      const selectedAliases = new Set(DAY_ALIASES[normalizeDay(selectedDay)] || [])
      return teacherPiketSchedules.filter((item) => selectedAliases.has(normalizeDay(item.day)))
    },
    [teacherPiketSchedules, selectedDay],
  )

  if (isLoading) {
    return <RouteLoading />
  }

  const currentDayIndex = DAYS.indexOf(selectedDay)
  const navigateDay = (direction: "prev" | "next") => {
    if (direction === "prev" && currentDayIndex > 0) setSelectedDay(DAYS[currentDayIndex - 1])
    if (direction === "next" && currentDayIndex < DAYS.length - 1) setSelectedDay(DAYS[currentDayIndex + 1])
  }

  const getClassInfo = (classId: string) => classes.find((c) => c.id === classId)
  const getTeacherName = (teacherId: string) => teachers.find((teacher) => teacher.id === teacherId)?.name || "Guru"

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Teaching Schedule</h1>
        <p className="text-sm sm:text-base text-slate-500">Your weekly timetable</p>
      </div>

      <GlassCard className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => navigateDay("prev")} disabled={currentDayIndex === 0} className="p-2 rounded-xl bg-slate-100 disabled:opacity-30 hover:bg-slate-200 transition-colors shrink-0"><ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" /></button>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto py-2 px-1 scrollbar-hide flex-1 justify-center">
          {DAYS.map((day) => (
            <button type="button" key={day} onClick={() => setSelectedDay(day)} className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${selectedDay === day ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => navigateDay("next")} disabled={currentDayIndex === DAYS.length - 1} className="p-2 rounded-xl bg-slate-100 disabled:opacity-30 hover:bg-slate-200 transition-colors shrink-0"><ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" /></button>
      </GlassCard>

      <GlassCard>
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Guru Piket {selectedDay}</h2>
        {todayTeacherPiket.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada guru piket terjadwal.</p>
        ) : (
          <div className="space-y-2">
            {todayTeacherPiket.map((item) => {
              const isCurrentTeacher = item.teacherId === employee.id
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border px-3 py-2 text-sm ${isCurrentTeacher ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                >
                  {isCurrentTeacher ? "Anda bertugas piket hari ini" : getTeacherName(item.teacherId)}
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-slate-800">{selectedDay}</h2>
        {todaySchedule.length === 0 ? (
          <GlassCard className="text-center py-8 sm:py-12"><p className="text-sm sm:text-base text-slate-500">No classes scheduled for {selectedDay}</p></GlassCard>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {todaySchedule.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((schedule, index) => {
              const classInfo = getClassInfo(schedule.classId)
              return (
                <GlassCard key={schedule.id} className="relative overflow-hidden" hover>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500" />
                  <div className="pl-3 sm:pl-4">
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><h3 className="font-semibold text-slate-800 text-base sm:text-lg truncate">{schedule.subject}</h3><p className="text-sm text-slate-500 truncate">{classInfo?.name || "Unknown Class"}</p></div><span className="text-xs sm:text-sm font-medium text-slate-600 bg-slate-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shrink-0">#{index + 1}</span></div>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 mt-3 sm:mt-4">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500"><Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /><span>{schedule.startTime} - {schedule.endTime}</span></div>
                      {schedule.room && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500"><MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /><span>{schedule.room}</span></div>
                      )}
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500"><Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /><span>{classInfo?.rows && classInfo?.cols ? `${classInfo.rows * classInfo.cols} seats` : "N/A"}</span></div>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>

      <GlassCard>
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4">Weekly Overview</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
          {DAYS.map((day) => {
            const selectedAliases = new Set(DAY_ALIASES[normalizeDay(day)] || [])
            const dayClasses = employeeSchedule.filter((schedule) => selectedAliases.has(normalizeDay(schedule.day)))
            return (
              <button type="button" key={day} onClick={() => setSelectedDay(day)} className={`p-2 sm:p-3 rounded-xl text-center cursor-pointer transition-all w-full ${selectedDay === day ? "bg-gradient-to-b from-purple-100 to-pink-100 border border-purple-300" : "bg-slate-50 hover:bg-slate-100"}`}>
                <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">{day.slice(0, 3)}</p>
                <p className="text-lg sm:text-2xl font-bold text-slate-800">{dayClasses.length}</p>
                <p className="text-[9px] sm:text-xs text-slate-400">classes</p>
              </button>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}
