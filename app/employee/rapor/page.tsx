"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { Loader2, Save } from "lucide-react"

type Employee = { id: string; subject: string; homeroomClassId?: string }
type ClassRoom = { id: string; name: string; grade?: string }
type Student = { id: string; name: string; classId: string }
type Grade = {
  id?: string
  studentId: string
  assignmentScore?: number
  practiceScore?: number
  utsScore?: number
  uasScore?: number
  schoolExamScore?: number
  knowledge?: number
  skill?: number
  notes?: string
}
type GradeDraft = {
  assignmentScore: number
  practiceScore: number
  utsScore: string
  uasScore: number
  schoolExamScore: number
  notes: string
}
type StudentGradePayload = {
  id: string
  studentId: string
  subject: string
  teacherId: string
  semester: string
  assignmentScore: number
  practiceScore: number
  utsScore?: number
  uasScore: number
  schoolExamScore: number
  knowledge: number
  skill: number
  attitude: "A" | "B" | "C" | "D"
  notes?: string
}

const clampScore = (value: number) => Math.max(0, Math.min(100, value))

export default function EmployeeRaporPage() {
  const [employee, setEmployee] = useState<Employee>({ id: "", subject: "-" })
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [grades, setGrades] = useState<Grade[]>([])
  const [gradeDraft, setGradeDraft] = useState<Record<string, GradeDraft>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const students = useMemo(
    () => allStudents.filter((student) => (selectedClassId ? student.classId === selectedClassId : true)),
    [allStudents, selectedClassId],
  )

  useEffect(() => {
    const load = async () => {
      try {
        const contextRes = await fetch("/api/employee/context", { cache: "no-store" })
        if (!contextRes.ok) {
          throw new Error("Gagal memuat konteks guru")
        }
        const context = await contextRes.json()
        const teacher = context.employee || { id: "", subject: "-" }
        const nextClasses: ClassRoom[] = Array.isArray(context.classes) ? context.classes : []
        const nextStudents: Student[] = Array.isArray(context.students) ? context.students : []
        const initialClassId =
          (teacher.homeroomClassId && nextClasses.some((item) => item.id === teacher.homeroomClassId)
            ? teacher.homeroomClassId
            : nextClasses[0]?.id) || ""

        setEmployee(teacher)
        setClasses(nextClasses)
        setAllStudents(nextStudents)
        setSelectedClassId(initialClassId)
      } catch {
        toast.error("Gagal memuat data rapor")
      } finally {
        setIsLoading(false)
      }
    }
    load().catch(() => {})
  }, [])

  useEffect(() => {
    const loadGrades = async () => {
      if (!employee.id || !selectedClassId) {
        setGrades([])
        setGradeDraft({})
        return
      }

      try {
        const gradesRes = await fetch(`/api/employee/grades?teacherId=${employee.id}&classId=${selectedClassId}`, { cache: "no-store" })
        if (!gradesRes.ok) {
          throw new Error("Gagal memuat nilai kelas")
        }
        const gradesData = await gradesRes.json()
        const nextGrades: Grade[] = Array.isArray(gradesData.grades) ? gradesData.grades : []
        setGrades(nextGrades)

        const nextDraft: Record<string, GradeDraft> = {}
        for (const student of students) {
          const grade = nextGrades.find((item) => item.studentId === student.id)
          const assignmentScore = clampScore(Number(grade?.assignmentScore ?? grade?.knowledge ?? 0) || 0)
          const practiceScore = clampScore(Number(grade?.practiceScore ?? grade?.skill ?? 0) || 0)
          const utsRaw = grade?.utsScore
          const utsScore =
            typeof utsRaw === "number" && Number.isFinite(utsRaw)
              ? String(clampScore(Number(utsRaw)))
              : ""
          const uasScore = clampScore(Number(grade?.uasScore ?? grade?.knowledge ?? 0) || 0)
          const schoolExamScore = clampScore(Number(grade?.schoolExamScore ?? grade?.knowledge ?? 0) || 0)

          nextDraft[student.id] = {
            assignmentScore,
            practiceScore,
            utsScore,
            uasScore,
            schoolExamScore,
            notes: String(grade?.notes || ""),
          }
        }
        setGradeDraft(nextDraft)
      } catch {
        setGrades([])
        setGradeDraft({})
        toast.error("Gagal memuat nilai rapor")
      }
    }

    void loadGrades()
  }, [employee.id, selectedClassId, students])

  const updateDraft = (
    studentId: string,
    key: "assignmentScore" | "practiceScore" | "utsScore" | "uasScore" | "schoolExamScore" | "notes",
    value: string,
  ) => {
    setGradeDraft((prev) => {
      const current = prev[studentId] || {
        assignmentScore: 0,
        practiceScore: 0,
        utsScore: "",
        uasScore: 0,
        schoolExamScore: 0,
        notes: "",
      }
      return {
        ...prev,
        [studentId]: {
          assignmentScore: key === "assignmentScore" ? clampScore(Number(value || 0)) : current.assignmentScore,
          practiceScore: key === "practiceScore" ? clampScore(Number(value || 0)) : current.practiceScore,
          utsScore: key === "utsScore" ? value : current.utsScore,
          uasScore: key === "uasScore" ? clampScore(Number(value || 0)) : current.uasScore,
          schoolExamScore: key === "schoolExamScore" ? clampScore(Number(value || 0)) : current.schoolExamScore,
          notes: key === "notes" ? value : current.notes,
        },
      }
    })
  }

  const handleSaveGrades = async () => {
    if (!selectedClassId) {
      toast.error("Pilih kelas terlebih dahulu")
      return
    }
    if (!employee.id) {
      toast.error("Data guru belum valid")
      return
    }
    if (students.length === 0) {
      toast.error("Belum ada siswa pada kelas ini")
      return
    }

    const payload: StudentGradePayload[] = students.map((student) => {
      const current = gradeDraft[student.id] || {
        assignmentScore: 0,
        practiceScore: 0,
        utsScore: "",
        uasScore: 0,
        schoolExamScore: 0,
        notes: "",
      }
      const assignmentScore = clampScore(Number(current.assignmentScore || 0))
      const practiceScore = clampScore(Number(current.practiceScore || 0))
      const utsScore =
        current.utsScore.trim() === ""
          ? undefined
          : clampScore(Number(current.utsScore || 0))
      const uasScore = clampScore(Number(current.uasScore || 0))
      const schoolExamScore = clampScore(Number(current.schoolExamScore || 0))

      const knowledgeSources = [assignmentScore, uasScore, schoolExamScore]
      if (typeof utsScore === "number") {
        knowledgeSources.push(utsScore)
      }
      const knowledge = Math.round(
        knowledgeSources.reduce((total, score) => total + score, 0) / Math.max(knowledgeSources.length, 1),
      )
      const skill = practiceScore
      const overall = Math.round((knowledge + skill) / 2)
      const attitude: StudentGradePayload["attitude"] = overall >= 90 ? "A" : overall >= 80 ? "B" : overall >= 70 ? "C" : "D"
      const existing = grades.find((item) => item.studentId === student.id)

      return {
        id: existing?.id || `sg-${student.id}-${employee.id}-${employee.subject || "subject"}`,
        studentId: student.id,
        subject: employee.subject || "-",
        teacherId: employee.id,
        semester: "Ganjil 2026",
        assignmentScore,
        practiceScore,
        utsScore,
        uasScore,
        schoolExamScore,
        knowledge,
        skill,
        attitude,
        notes: current.notes,
      }
    })

    setIsSaving(true)
    try {
      const res = await fetch("/api/employee/grades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: employee.id,
          subject: employee.subject || "-",
          classId: selectedClassId,
          grades: payload,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Gagal menyimpan nilai")
      }

      setGrades(payload)
      toast.success("Nilai rapor berhasil disimpan")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan nilai")
    } finally {
      setIsSaving(false)
    }
  }

  const rows = useMemo(() => {
    return students.map((student) => {
      const draft = gradeDraft[student.id] || {
        assignmentScore: 0,
        practiceScore: 0,
        utsScore: "",
        uasScore: 0,
        schoolExamScore: 0,
        notes: "",
      }

      const utsScore = draft.utsScore.trim() === "" ? undefined : clampScore(Number(draft.utsScore || 0))
      const scoreParts = [draft.assignmentScore, draft.practiceScore, draft.uasScore, draft.schoolExamScore]
      if (typeof utsScore === "number") {
        scoreParts.push(utsScore)
      }
      const average = Math.round(scoreParts.reduce((total, score) => total + score, 0) / Math.max(scoreParts.length, 1))

      return { student, draft, average }
    })
  }, [students, gradeDraft])

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <GlassCard className="p-4 text-sm text-slate-500">Memuat data rapor...</GlassCard>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Rapor Siswa</h1>
        <p className="text-slate-500 text-sm">Rekap nilai {employee.subject || "-"}</p>
      </div>

      <GlassCard className="space-y-3">
        <h2 className="font-semibold text-slate-800">Kelas Aktif</h2>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="w-full sm:max-w-sm px-3 py-2 rounded-xl border border-slate-200 bg-white"
          disabled={classes.length === 0}
        >
          {classes.length === 0 ? <option value="">Belum ada kelas</option> : null}
          {classes.map((classRoom) => (
            <option key={classRoom.id} value={classRoom.id}>
              {classRoom.name} {classRoom.grade ? `- Grade ${classRoom.grade}` : ""}
            </option>
          ))}
        </select>
      </GlassCard>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-3 px-4">Siswa</th>
                <th className="py-3 px-4">Nilai Tugas</th>
                <th className="py-3 px-4">Nilai Praktik</th>
                <th className="py-3 px-4">Nilai UTS (Opsional)</th>
                <th className="py-3 px-4">Nilai UAS</th>
                <th className="py-3 px-4">Nilai Ujian Sekolah</th>
                <th className="py-3 px-4">Nilai Akhir</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="py-4 px-4 text-slate-500" colSpan={8}>Belum ada data siswa atau nilai pada kelas ini.</td>
                </tr>
              ) : null}
              {rows.map(({ student, draft, average }) => (
                <tr key={student.id} className="border-b border-slate-100">
                  <td className="py-3 px-4 font-medium text-slate-800">{student.name}</td>
                  <td className="py-3 px-4 text-slate-700">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={String(draft.assignmentScore)}
                      onChange={(e) => updateDraft(student.id, "assignmentScore", e.target.value)}
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={String(draft.practiceScore)}
                      onChange={(e) => updateDraft(student.id, "practiceScore", e.target.value)}
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={draft.utsScore}
                      onChange={(e) => updateDraft(student.id, "utsScore", e.target.value)}
                      className="w-28 rounded-lg border border-slate-200 px-2 py-1"
                      placeholder="Kosongkan jika tidak ada"
                    />
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={String(draft.uasScore)}
                      onChange={(e) => updateDraft(student.id, "uasScore", e.target.value)}
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={String(draft.schoolExamScore)}
                      onChange={(e) => updateDraft(student.id, "schoolExamScore", e.target.value)}
                      className="w-24 rounded-lg border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{Number.isFinite(average) ? average : "-"}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <input
                      type="text"
                      value={draft.notes}
                      onChange={(e) => updateDraft(student.id, "notes", e.target.value)}
                      className="w-full min-w-[180px] rounded-lg border border-slate-200 px-2 py-1"
                      placeholder="Catatan"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 flex justify-end">
          <GlassButton type="button" onClick={handleSaveGrades} disabled={isSaving || rows.length === 0}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Nilai Rapor
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  )
}
