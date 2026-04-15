"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { Plus, Loader2 } from "lucide-react"

type Employee = { id: string; subject: string; homeroomClassId?: string }
type ClassRoom = { id: string; name: string; grade?: string }
type Student = { id: string; name: string; classId: string }

const ACTIVITY_CATEGORIES = [
  { label: "Akademik", value: "Akademik" },
  { label: "Non Akademik", value: "Non Akademik" },
]

export default function TeacherGradesPage() {
  const [employee, setEmployee] = useState<Employee>({ id: "", subject: "-" })
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [pointForm, setPointForm] = useState({ studentId: "", type: "POSITIVE", category: "Akademik", points: 5, description: "" })
  const [isPointSaving, setIsPointSaving] = useState(false)

  const students = useMemo(
    () => allStudents.filter((student) => (selectedClassId ? student.classId === selectedClassId : true)),
    [allStudents, selectedClassId],
  )

  const classLabel = useMemo(
    () => classes.find((item) => item.id === selectedClassId)?.name || "-",
    [classes, selectedClassId],
  )

  const gradeLabel = useMemo(
    () => classes.find((item) => item.id === selectedClassId)?.grade || "-",
    [classes, selectedClassId],
  )

  useEffect(() => {
    const load = async () => {
      try {
        const contextRes = await fetch("/api/employee/context", { cache: "no-store" })
        if (!contextRes.ok) {
          throw new Error("Gagal memuat konteks guru")
        }
        const contextData = await contextRes.json()
        const teacher = contextData.employee || { id: "", subject: "-" }
        const nextClasses: ClassRoom[] = Array.isArray(contextData.classes) ? contextData.classes : []
        const nextStudents: Student[] = Array.isArray(contextData.students) ? contextData.students : []
        const initialClassId =
          (teacher.homeroomClassId && nextClasses.some((item) => item.id === teacher.homeroomClassId)
            ? teacher.homeroomClassId
            : nextClasses[0]?.id) || ""

        setEmployee(teacher)
        setClasses(nextClasses)
        setAllStudents(nextStudents)
        setSelectedClassId(initialClassId)
      } catch {
        toast.error("Gagal memuat data kelas dan siswa")
      } finally {
        setIsLoading(false)
      }
    }

    load().catch(() => {})
  }, [])

  useEffect(() => {
    setPointForm((prev) => ({
      ...prev,
      studentId: students.some((student) => student.id === prev.studentId) ? prev.studentId : (students[0]?.id || ""),
    }))
  }, [students])

  const handleSavePoint = async () => {
    if (!selectedClassId) {
      toast.error("Pilih kelas terlebih dahulu")
      return
    }
    if (!pointForm.studentId || !pointForm.description.trim()) {
      toast.error("Lengkapi data poin aktivitas")
      return
    }

    setIsPointSaving(true)
    try {
      const normalizedPoints = Math.max(1, Math.abs(Number(pointForm.points || 0)))
      const res = await fetch("/api/employee/activity-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `ap-${Date.now()}`,
          studentId: pointForm.studentId,
          type: pointForm.type,
          category: pointForm.category,
          points: pointForm.type === "NEGATIVE" ? -normalizedPoints : normalizedPoints,
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

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <GlassCard className="p-4 text-sm text-slate-500">Memuat data kelas...</GlassCard>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Penilaian & Poin Keaktifan</h1>
      </div>

      <GlassCard className="space-y-3">
        <h2 className="font-semibold text-slate-800">Kelas Aktif</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            disabled={classes.length === 0}
          >
            {classes.length === 0 ? <option value="">Belum ada kelas</option> : null}
            {classes.map((classRoom) => (
              <option key={classRoom.id} value={classRoom.id}>
                {classRoom.name} {classRoom.grade ? `- Grade ${classRoom.grade}` : ""}
              </option>
            ))}
          </select>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <p>Kelas: <span className="font-medium text-slate-800">{classLabel}</span></p>
            <p>Grade: <span className="font-medium text-slate-800">{gradeLabel}</span></p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="space-y-3">
        <h2 className="font-semibold text-slate-800">Input Poin Aktivitas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={pointForm.studentId} onChange={(e) => setPointForm({ ...pointForm, studentId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
            {students.length === 0 ? <option value="">Belum ada siswa</option> : null}
            {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
          </select>
          <select value={pointForm.type} onChange={(e) => setPointForm({ ...pointForm, type: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
            <option value="POSITIVE">Positif</option>
            <option value="NEGATIVE">Negatif</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={pointForm.category}
            onChange={(e) => setPointForm({ ...pointForm, category: e.target.value })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
          >
            {ACTIVITY_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <input
            type="number"
            value={String(pointForm.points)}
            onChange={(e) => setPointForm({ ...pointForm, points: Number(e.target.value || 0) })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
            placeholder="Poin"
          />
        </div>
        <textarea value={pointForm.description} onChange={(e) => setPointForm({ ...pointForm, description: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white" rows={2} placeholder="Deskripsi aktivitas" />
        <GlassButton type="button" onClick={handleSavePoint} disabled={isPointSaving || students.length === 0}>{isPointSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Simpan Poin Aktivitas</GlassButton>
      </GlassCard>
    </div>
  )
}
