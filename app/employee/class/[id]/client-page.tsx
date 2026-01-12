"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { ClassRoomGrid } from "@/components/organisms/class-room-grid"
import { GlassToast } from "@/components/molecules/glass-toast"
import { GlassCard } from "@/components/molecules/glass-card"
import { mockEmployees, mockClasses, mockStudents, type AttendanceStatus } from "@/lib/mock-data"
import { ChevronDown, School, Users, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClientPageProps {
  id: string
}

export default function EmployeeClassClient({ id }: ClientPageProps) {
  const router = useRouter()
  const employee = mockEmployees[0]
  
  const [selectedClassId, setSelectedClassId] = useState(id)
  const [showClassSelector, setShowClassSelector] = useState(false)
  
  const classroom = mockClasses.find((c) => c.id === selectedClassId) || mockClasses[0]
  const [students, setStudents] = useState(mockStudents.filter((s) => s.classId === classroom.id))
  const [toast, setToast] = useState({ open: false, message: "" })

  // Update students when class changes
  useEffect(() => {
    const newClassroom = mockClasses.find((c) => c.id === selectedClassId)
    if (newClassroom) {
      setStudents(mockStudents.filter((s) => s.classId === newClassroom.id))
    }
  }, [selectedClassId])

  const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, attendance: status } : s)))
    const student = students.find((s) => s.id === studentId)
    setToast({
      open: true,
      message: `${student?.name}'s attendance updated to ${status}`,
    })
  }

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId)
    setShowClassSelector(false)
    router.push(`/employee/class/${classId}`)
  }

  return (
    <DashboardLayout role="EMPLOYEE" userName={employee.name} userAvatar={employee.avatar}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Manajemen Kelas</h1>
            <p className="text-slate-500">Klik siswa untuk mengubah kehadiran</p>
          </div>
          
          {/* Class Selector */}
          <div className="relative">
            <button
              onClick={() => setShowClassSelector(!showClassSelector)}
              className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all duration-200 min-w-[180px]"
            >
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <School className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-800">{classroom.name}</p>
                <p className="text-xs text-slate-500">Grade {classroom.grade}</p>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-slate-400 transition-transform duration-200",
                showClassSelector && "rotate-180"
              )} />
            </button>

            {/* Dropdown */}
            {showClassSelector && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowClassSelector(false)} 
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500 px-2">Pilih Kelas</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {mockClasses.map((cls) => {
                      const classStudentCount = mockStudents.filter(s => s.classId === cls.id).length
                      const isSelected = cls.id === selectedClassId
                      return (
                        <button
                          key={cls.id}
                          onClick={() => handleClassChange(cls.id)}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200",
                            isSelected 
                              ? "bg-blue-50 text-blue-700" 
                              : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg",
                            isSelected ? "bg-blue-100" : "bg-slate-100"
                          )}>
                            <GraduationCap className={cn(
                              "w-4 h-4",
                              isSelected ? "text-blue-600" : "text-slate-500"
                            )} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className={cn(
                              "text-sm font-medium",
                              isSelected ? "text-blue-700" : "text-slate-800"
                            )}>{cls.name}</p>
                            <p className="text-xs text-slate-500">Grade {cls.grade}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Users className="w-3 h-3" />
                            <span>{classStudentCount}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Class Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-slate-800">{students.length}</p>
            <p className="text-xs text-slate-500">Total Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-green-600">
              {students.filter(s => s.attendance === "PRESENT").length}
            </p>
            <p className="text-xs text-slate-500">Hadir</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-red-600">
              {students.filter(s => s.attendance !== "PRESENT").length}
            </p>
            <p className="text-xs text-slate-500">Tidak Hadir</p>
          </GlassCard>
        </div>

        <ClassRoomGrid classroom={classroom} students={students} onAttendanceChange={handleAttendanceChange} />

        <GlassToast
          isOpen={toast.open}
          onClose={() => setToast({ open: false, message: "" })}
          message={toast.message}
          type="success"
        />
      </div>
    </DashboardLayout>
  )
}
