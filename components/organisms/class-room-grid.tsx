"use client"

import { useState } from "react"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { Lock, Armchair } from "lucide-react"
import type { Student, ClassRoom, AttendanceStatus } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface ClassRoomGridProps {
  classroom: ClassRoom
  students: Student[]
  onAttendanceChange?: (studentId: string, status: AttendanceStatus) => void
  viewOnly?: boolean
  highlightStudentId?: string
}

export const ClassRoomGrid = ({ classroom, students, onAttendanceChange, viewOnly = false, highlightStudentId }: ClassRoomGridProps) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const getStudentAtSeat = (row: number, col: number): Student | undefined => {
    return students.find((s) => s.seatRow === row && s.seatCol === col)
  }

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return "ring-4 ring-green-400/60 shadow-green-400/30 shadow-lg"
      case "SICK":
        return "ring-4 ring-yellow-400/60 shadow-yellow-400/30 shadow-lg"
      case "ALPHA":
        return "ring-4 ring-red-400/60 shadow-red-400/30 shadow-lg"
    }
  }

  const getStatusBadgeColor = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return "bg-green-400/80"
      case "SICK":
        return "bg-yellow-400/80"
      case "ALPHA":
        return "bg-red-400/80"
    }
  }

  const handleSeatClick = (student: Student) => {
    if (viewOnly) return
    if (student.paymentStatus === "UNPAID") return
    setSelectedStudent(student)
  }

  const handleAttendanceUpdate = (status: AttendanceStatus) => {
    if (selectedStudent && onAttendanceChange) {
      onAttendanceChange(selectedStudent.id, status)
    }
    setSelectedStudent(null)
  }

  return (
    <>
      <GlassCard className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">{classroom.name}</h2>
            <p className="text-xs sm:text-sm text-slate-500">Grade {classroom.grade}</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500" />
              <span className="text-slate-600">Present</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
              <span className="text-slate-600">Sick</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500" />
              <span className="text-slate-600">Alpha</span>
            </div>
          </div>
        </div>

        {/* Teacher's Desk */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="px-4 sm:px-8 py-2 sm:py-3 backdrop-blur-xl bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl transition-all duration-300 hover:bg-slate-200">
            <span className="text-xs sm:text-sm font-medium text-slate-700">Teacher&apos;s Desk</span>
          </div>
        </div>

        {/* Seats Grid - 6 columns with 2-2-2 pattern */}
        <div className="space-y-4">
          {Array.from({ length: classroom.rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-2 sm:gap-3">
              {/* First pair of seats */}
              {[0, 1].map((colOffset) => {
                const colIndex = colOffset
                const student = getStudentAtSeat(rowIndex, colIndex)
                return (
                  <div key={`${rowIndex}-${colIndex}`} className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16">
                    {renderSeat(student, rowIndex, colIndex)}
                  </div>
                )
              })}
              
              {/* Gap */}
              <div className="w-4 sm:w-6 md:w-8" />
              
              {/* Second pair of seats */}
              {[2, 3].map((colOffset) => {
                const colIndex = colOffset
                const student = getStudentAtSeat(rowIndex, colIndex)
                return (
                  <div key={`${rowIndex}-${colIndex}`} className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16">
                    {renderSeat(student, rowIndex, colIndex)}
                  </div>
                )
              })}
              
              {/* Gap */}
              <div className="w-4 sm:w-6 md:w-8" />
              
              {/* Third pair of seats */}
              {[4, 5].map((colOffset) => {
                const colIndex = colOffset
                const student = getStudentAtSeat(rowIndex, colIndex)
                return (
                  <div key={`${rowIndex}-${colIndex}`} className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16">
                    {renderSeat(student, rowIndex, colIndex)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Student Modal */}
      <GlassModal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="Student Details">
        {selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <img
                src={selectedStudent.avatar || "/placeholder.svg?height=64&width=64&query=student"}
                alt={selectedStudent.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-4 ring-slate-200"
              />
              <div className="min-w-0">
                <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate">{selectedStudent.name}</h4>
                <p className="text-xs sm:text-sm text-slate-500 truncate">{selectedStudent.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-center transition-all duration-300 hover:bg-slate-100">
                <p className="text-xl sm:text-2xl font-bold text-slate-800">{selectedStudent.behaviorScore}</p>
                <p className="text-[10px] sm:text-xs text-slate-500">Behavior</p>
              </div>
              <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-center transition-all duration-300 hover:bg-slate-100">
                <p className="text-xl sm:text-2xl font-bold text-slate-800">{selectedStudent.streak}</p>
                <p className="text-[10px] sm:text-xs text-slate-500">Streak</p>
              </div>
            </div>

            {!viewOnly && (
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium text-slate-700">Update Attendance</p>
                <div className="flex gap-2">
                  <GlassButton
                    size="sm"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm"
                    onClick={() => handleAttendanceUpdate("PRESENT")}
                  >
                    Present
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm"
                    onClick={() => handleAttendanceUpdate("SICK")}
                  >
                    Sick
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm"
                    onClick={() => handleAttendanceUpdate("ALPHA")}
                  >
                    Alpha
                  </GlassButton>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassModal>
    </>
  )

  // Helper function to render individual seat
  function renderSeat(student: Student | undefined, rowIndex: number, colIndex: number) {
    if (!student) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl transition-all duration-300 hover:bg-slate-150">
          <Armchair className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
        </div>
      )
    }

    const isLocked = student.paymentStatus === "UNPAID"
    const isHighlighted = highlightStudentId === student.id

    return (
      <div
        className={cn("relative w-full h-full group", !viewOnly && !isLocked && "cursor-pointer")}
        onClick={() => handleSeatClick(student)}
      >
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            "bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm",
            "transition-all duration-300 ease-out",
            !viewOnly && !isLocked && "hover:scale-105 hover:shadow-md active:scale-95",
            getStatusColor(student.attendance),
            isHighlighted && "ring-4 ring-blue-500 ring-offset-2 scale-110 z-10 shadow-lg shadow-blue-500/30",
          )}
        >
          <img
            src={student.avatar || "/placeholder.svg?height=48&width=48&query=student avatar"}
            alt={student.name}
            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            "absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-transform duration-300 group-hover:scale-125",
            getStatusBadgeColor(student.attendance),
          )}
        />

        {/* Locked Overlay */}
        {isLocked && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-md bg-black/40 rounded-xl sm:rounded-2xl cursor-not-allowed"
            title="Tuition Locked"
          >
            <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-white/80" />
          </div>
        )}

        {/* Name Tooltip */}
        <div className="hidden sm:block absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none scale-90 group-hover:scale-100 z-10">
          <div className="px-2 py-0.5 bg-black/60 backdrop-blur-xl rounded-lg text-[10px] text-white whitespace-nowrap">
            {student.name.split(' ')[0]}
          </div>
        </div>
      </div>
    )
  }
}
