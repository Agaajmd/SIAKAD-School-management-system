"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { Plus, Save, Loader2 } from "lucide-react"

type Employee = { id: string; subject: string; homeroomClassId?: string }
type Student = { id: string; name: string; classId: string }
type StudentGrade = { id: string; studentId: string; subject: string; teacherId: string; semester: string; knowledge: number; skill: number; attitude: "A" | "B" | "C" | "D"; notes?: string }

export default function TeacherGradesPage() {
  const [employee, setEmployee] = useState<Employee>({ id: "", subject: "-" })
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Record<string, { knowledge: number; skill: number; notes: string }>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [pointForm, setPointForm] = useState({ studentId: "", type: "POSITIVE", category: "Akademik", points: 5, description: "" })
  const [isPointSaving, setIsPointSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const contextRes = await fetch("/api/employee/context", { cache: "no-store" })
      if (!contextRes.ok) return
      const contextData = await contextRes.json()
      const teacher = contextData.employee || { id: "", subject: "-" }
      const allStudents: Student[] = Array.isArray(contextData.students) ? contextData.students : []
      const classStudents = allStudents.filter((student) => student.classId === teacher.homeroomClassId)

      setEmployee(teacher)
      setStudents(classStudents)
      setPointForm((prev) => ({ ...prev, studentId: classStudents[0]?.id || "" }))

      const gradesRes = await fetch(`/api/employee/grades?teacherId=${teacher.id}&classId=${teacher.homeroomClassId}`, { cache: "no-store" })
      if (gradesRes.ok) {
        const gradesData = await gradesRes.json()
        const map: Record<string, { knowledge: number; skill: number; notes: string }> = {}
        ;(gradesData.grades || []).forEach((grade: StudentGrade) => {
          map[grade.studentId] = { knowledge: grade.knowledge, skill: grade.skill, notes: grade.notes || "" }
        })
        setGrades(map)
      }
    }

    load().catch(() => {})
  }, [])

  const average = useMemo(() => {
    if (!students.length) return 0
    const total = students.reduce((acc, student) => {
      const current = grades[student.id]
      if (!current) return acc
      return acc + (current.knowledge + current.skill) / 2
    }, 0)
    return Math.round(total / students.length)
  }, [grades, students])

  const updateGrade = (studentId: string, key: "knowledge" | "skill" | "notes", value: string) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        knowledge: prev[studentId]?.knowledge || 0,
        skill: prev[studentId]?.skill || 0,
        notes: prev[studentId]?.notes || "",
        [key]: key === "notes" ? value : Number(value || 0),
      },
    }))
  }

  const handleSaveGrades = async () => {
    setIsSaving(true)
    try {
      const payload: StudentGrade[] = students.map((student) => {
        const current = grades[student.id] || { knowledge: 0, skill: 0, notes: "" }
        const avg = (current.knowledge + current.skill) / 2
        const attitude: StudentGrade["attitude"] = avg >= 90 ? "A" : avg >= 80 ? "B" : avg >= 70 ? "C" : "D"
        return {
          id: `sg-${student.id}-${employee.id}`,
          studentId: student.id,
          subject: employee.subject,
          teacherId: employee.id,
          semester: "Ganjil 2025",
          knowledge: current.knowledge,
          skill: current.skill,
          attitude,
          notes: current.notes,
        }
      })

      const res = await fetch("/api/employee/grades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: employee.id,
          subject: employee.subject,
          classId: employee.homeroomClassId,
          grades: payload,
        }),
      })
      if (!res.ok) throw new Error("Gagal simpan nilai")
      toast.success("Nilai berhasil disimpan")
    } catch {
      toast.error("Gagal menyimpan nilai")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePoint = async () => {
    if (!pointForm.studentId || !pointForm.description.trim()) {
      toast.error("Lengkapi data poin aktivitas")
      return
    }
    setIsPointSaving(true)
    try {
      const res = await fetch("/api/employee/activity-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `ap-${Date.now()}`,
          studentId: pointForm.studentId,
          type: pointForm.type,
          category: pointForm.category,
          points: pointForm.type === "NEGATIVE" ? -Math.abs(pointForm.points) : Math.abs(pointForm.points),
          description: pointForm.description,
          date: new Date().toISOString().slice(0, 10),
          givenBy: employee.id,
        }),
      })
      if (!res.ok) throw new Error("Gagal simpan poin")
      toast.success("Poin aktivitas disimpan")
      setPointForm((prev) => ({ ...prev, description: "" }))
    } catch {
      toast.error("Gagal menyimpan poin")
    } finally {
      setIsPointSaving(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Penilaian & Poin Keaktifan</h1>
        <p className="text-sm text-slate-500">Rata-rata kelas saat ini: {average || "-"}</p>
      </div>

      <GlassCard className="space-y-3">
        <h2 className="font-semibold text-slate-800">Input Poin Aktivitas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={pointForm.studentId} onChange={(e) => setPointForm({ ...pointForm, studentId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
            {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>
          <select value={pointForm.type} onChange={(e) => setPointForm({ ...pointForm, type: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
            <option value="POSITIVE">Positif</option>
            <option value="NEGATIVE">Negatif</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GlassInput value={pointForm.category} onChange={(e) => setPointForm({ ...pointForm, category: e.target.value })} placeholder="Kategori" />
          <GlassInput type="number" value={String(pointForm.points)} onChange={(e) => setPointForm({ ...pointForm, points: Number(e.target.value || 0) })} placeholder="Poin" />
        </div>
        <textarea value={pointForm.description} onChange={(e) => setPointForm({ ...pointForm, description: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white" rows={2} placeholder="Deskripsi aktivitas" />
        <GlassButton onClick={handleSavePoint} disabled={isPointSaving}>{isPointSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Simpan Poin Aktivitas</GlassButton>
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="font-semibold text-slate-800">Input Nilai</h2>
        {students.map((student) => (
          <div key={student.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <p className="font-medium text-slate-800">{student.name}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <GlassInput type="number" placeholder="Pengetahuan" value={String(grades[student.id]?.knowledge || 0)} onChange={(e) => updateGrade(student.id, "knowledge", e.target.value)} />
              <GlassInput type="number" placeholder="Keterampilan" value={String(grades[student.id]?.skill || 0)} onChange={(e) => updateGrade(student.id, "skill", e.target.value)} />
            </div>
            <textarea className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white" rows={2} placeholder="Catatan" value={grades[student.id]?.notes || ""} onChange={(e) => updateGrade(student.id, "notes", e.target.value)} />
          </div>
        ))}
        <GlassButton onClick={handleSaveGrades} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Simpan Nilai</GlassButton>
      </GlassCard>
    </div>
  )
}
