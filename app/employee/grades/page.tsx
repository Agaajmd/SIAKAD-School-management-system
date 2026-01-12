"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassTextarea } from "@/components/atoms/glass-textarea"
import { 
  mockEmployees, 
  mockClasses,
  mockStudents,
  mockStudentGrades,
  StudentGrade
} from "@/lib/mock-data"
import { 
  FileText, 
  Users,
  Search,
  Edit,
  Save,
  X,
  TrendingUp,
  Award,
  BookOpen,
  GraduationCap,
  Plus
} from "lucide-react"

const ATTITUDES = ["A", "B", "C", "D"] as const

export default function TeacherRaporPage() {
  const teacher = mockEmployees[0]
  const homeroomClass = mockClasses.find(c => c.id === teacher.homeroomClassId)
  const classStudents = mockStudents.filter(s => s.classId === teacher.homeroomClassId)
  
  const [grades, setGrades] = useState<StudentGrade[]>([...mockStudentGrades])
  const [searchQuery, setSearchQuery] = useState("")
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<typeof mockStudents[0] | null>(null)

  const [editForm, setEditForm] = useState({
    subject: teacher.subject,
    knowledge: 0,
    skill: 0,
    attitude: "B" as "A" | "B" | "C" | "D",
    notes: "",
  })

  const filteredStudents = classStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStudentGrades = (studentId: string) => {
    return grades.filter(g => g.studentId === studentId && g.teacherId === teacher.id)
  }

  const getStudentGradeForSubject = (studentId: string, subject: string) => {
    return grades.find(g => g.studentId === studentId && g.subject === subject && g.teacherId === teacher.id)
  }

  const calculateAverage = (studentGrades: StudentGrade[]) => {
    if (studentGrades.length === 0) return 0
    const total = studentGrades.reduce((acc, g) => acc + ((g.knowledge + g.skill) / 2), 0)
    return Math.round(total / studentGrades.length)
  }

  const getGradeColor = (avg: number) => {
    if (avg >= 85) return "text-green-400"
    if (avg >= 70) return "text-blue-400"
    if (avg >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const getGradeBadge = (avg: number) => {
    if (avg >= 85) return { label: "Sangat Baik", color: "green" }
    if (avg >= 70) return { label: "Baik", color: "blue" }
    if (avg >= 60) return { label: "Cukup", color: "yellow" }
    return { label: "Kurang", color: "red" }
  }

  const handleOpenEdit = (student: typeof mockStudents[0]) => {
    setSelectedStudent(student)
    const existingGrade = getStudentGradeForSubject(student.id, teacher.subject)
    if (existingGrade) {
      setEditForm({
        subject: existingGrade.subject,
        knowledge: existingGrade.knowledge,
        skill: existingGrade.skill,
        attitude: existingGrade.attitude,
        notes: existingGrade.notes || "",
      })
    } else {
      setEditForm({
        subject: teacher.subject,
        knowledge: 0,
        skill: 0,
        attitude: "B",
        notes: "",
      })
    }
    setShowEditModal(true)
  }

  const handleSaveGrades = () => {
    if (!selectedStudent) return

    if (editForm.knowledge < 0 || editForm.knowledge > 100 || editForm.skill < 0 || editForm.skill > 100) {
      toast.error("Nilai harus antara 0-100")
      return
    }

    const existingIndex = grades.findIndex(
      g => g.studentId === selectedStudent.id && g.subject === teacher.subject && g.teacherId === teacher.id
    )
    
    if (existingIndex >= 0) {
      setGrades(grades.map((g, i) => 
        i === existingIndex 
          ? { 
              ...g, 
              knowledge: editForm.knowledge,
              skill: editForm.skill,
              attitude: editForm.attitude,
              notes: editForm.notes,
            }
          : g
      ))
    } else {
      const newGrade: StudentGrade = {
        id: `sg${Date.now()}`,
        studentId: selectedStudent.id,
        subject: teacher.subject,
        teacherId: teacher.id,
        semester: "Ganjil 2025",
        knowledge: editForm.knowledge,
        skill: editForm.skill,
        attitude: editForm.attitude,
        notes: editForm.notes,
      }
      setGrades([...grades, newGrade])
    }

    toast.success("Nilai berhasil disimpan")
    setShowEditModal(false)
  }

  // Stats
  const studentsWithGrades = classStudents.filter(s => getStudentGradeForSubject(s.id, teacher.subject))
  const avgClassScore = studentsWithGrades.length > 0
    ? Math.round(studentsWithGrades.reduce((acc, s) => {
        const g = getStudentGradeForSubject(s.id, teacher.subject)
        return acc + (g ? ((g.knowledge + g.skill) / 2) : 0)
      }, 0) / studentsWithGrades.length)
    : 0

  const topStudents = classStudents
    .map(s => {
      const g = getStudentGradeForSubject(s.id, teacher.subject)
      return { student: s, avg: g ? ((g.knowledge + g.skill) / 2) : 0 }
    })
    .filter(s => s.avg > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)

  return (
    <DashboardLayout role="EMPLOYEE" userName={teacher.name} userAvatar={teacher.avatar}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Nilai Rapor Siswa</h1>
          <p className="text-sm text-white/60">
            {homeroomClass ? `Wali Kelas ${homeroomClass.name} - ${teacher.subject}` : "Kelola nilai rapor siswa"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-4">
            <Users className="w-5 h-5 mx-auto mb-2 text-blue-400" />
            <p className="text-xl font-bold text-white">{classStudents.length}</p>
            <p className="text-xs text-white/60">Total Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <FileText className="w-5 h-5 mx-auto mb-2 text-purple-400" />
            <p className="text-xl font-bold text-white">{studentsWithGrades.length}</p>
            <p className="text-xs text-white/60">Sudah Dinilai</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-green-400" />
            <p className={`text-xl font-bold ${getGradeColor(avgClassScore)}`}>{avgClassScore || "-"}</p>
            <p className="text-xs text-white/60">Rata-rata Kelas</p>
          </GlassCard>
        </div>

        {/* Top Students */}
        {topStudents.length > 0 && (
          <GlassCard className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-yellow-400" />
              <h2 className="font-semibold text-white">Peringkat Teratas</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {topStudents.map((item, index) => (
                <div key={item.student.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl min-w-fit">
                  <span className={`text-lg font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-orange-400'}`}>
                    #{index + 1}
                  </span>
                  <img src={item.student.avatar} alt={item.student.name} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-medium text-white">{item.student.name}</p>
                    <p className="text-xs text-white/60">Nilai: {Math.round(item.avg)}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Cari siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Student List */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Daftar Nilai - {teacher.subject}</h2>
          </div>

          <div className="space-y-2">
            {filteredStudents.map(student => {
              const studentGrade = getStudentGradeForSubject(student.id, teacher.subject)
              const avg = studentGrade ? ((studentGrade.knowledge + studentGrade.skill) / 2) : 0
              const badge = getGradeBadge(avg)

              return (
                <div 
                  key={student.id} 
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                >
                  <img 
                    src={student.avatar} 
                    alt={student.name} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{student.name}</p>
                    <p className="text-xs text-white/50">{student.email}</p>
                  </div>

                  {studentGrade ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-white/50">Pengetahuan / Keterampilan</p>
                        <p className="text-sm font-medium text-white">{studentGrade.knowledge} / {studentGrade.skill}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs bg-${badge.color}-500/20 text-${badge.color}-300`}>
                        {Math.round(avg)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-white/40">Belum dinilai</span>
                  )}

                  <GlassButton size="sm" onClick={() => handleOpenEdit(student)}>
                    {studentGrade ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </GlassButton>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Edit Modal */}
        <GlassModal 
          isOpen={showEditModal} 
          onClose={() => setShowEditModal(false)} 
          title={`Input Nilai - ${selectedStudent?.name || ""}`}
          size="lg"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <img 
                src={selectedStudent?.avatar} 
                alt={selectedStudent?.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow"
              />
              <div>
                <p className="font-semibold text-slate-800">{selectedStudent?.name}</p>
                <p className="text-sm text-slate-500">{teacher.subject}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <GlassInput
                label="Nilai Pengetahuan"
                type="number"
                min={0}
                max={100}
                value={editForm.knowledge}
                onChange={(e) => setEditForm({ ...editForm, knowledge: Number(e.target.value) })}
              />
              <GlassInput
                label="Nilai Keterampilan"
                type="number"
                min={0}
                max={100}
                value={editForm.skill}
                onChange={(e) => setEditForm({ ...editForm, skill: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Sikap</label>
              <div className="grid grid-cols-4 gap-2">
                {ATTITUDES.map(att => (
                  <button
                    key={att}
                    onClick={() => setEditForm({ ...editForm, attitude: att })}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      editForm.attitude === att 
                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/25" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {att}
                  </button>
                ))}
              </div>
            </div>

            <GlassTextarea
              label="Catatan (Opsional)"
              placeholder="Catatan untuk siswa..."
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2}
            />

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowEditModal(false)}>
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton className="flex-1 justify-center" onClick={handleSaveGrades}>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
