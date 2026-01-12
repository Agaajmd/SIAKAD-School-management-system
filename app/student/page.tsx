"use client"

import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { WalletCard } from "@/components/organisms/wallet-card"
import { GamificationStats } from "@/components/organisms/gamification-stats"
import { NextClassCard } from "@/components/organisms/next-class-card"
import { AttendanceLeaderboard } from "@/components/organisms/attendance-leaderboard"
import { ClassRoomGrid } from "@/components/organisms/class-room-grid"
import { mockStudents, mockSchedule, mockClasses, getEmployeeById } from "@/lib/mock-data"

export default function StudentDashboard() {
  const student = mockStudents[0]
  const nextClass = mockSchedule[0]
  const teacher = getEmployeeById(nextClass.teacherId)
  
  // Get the student's class and classmates
  const studentClass = mockClasses.find(c => c.id === student.classId)
  const classmates = mockStudents.filter(s => s.classId === student.classId)

  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar}>
      <div className="max-w-2xl mx-auto space-y-5 px-1">
        {/* Header */}
        <div className="pb-2">
          <h1 className="text-xl font-bold text-slate-800">Selamat datang,</h1>
          <p className="text-slate-500">{student.name}</p>
        </div>

        {/* Quick Stats */}
        <WalletCard student={student} />

        <GamificationStats student={student} />

        <NextClassCard schedule={nextClass} teacher={teacher} />

        {/* Class Layout - View Only */}
        {studentClass && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">Layout Kelas Saya</h2>
            <ClassRoomGrid 
              classroom={studentClass} 
              students={classmates} 
              viewOnly={true}
            />
          </div>
        )}

        {/* Attendance Leaderboard */}
        <AttendanceLeaderboard limit={15} />
      </div>
    </DashboardLayout>
  )
}
