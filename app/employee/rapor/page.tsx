"use client"

import { useEffect, useMemo, useState } from "react"
import { GlassCard } from "@/components/molecules/glass-card"

type Employee = { id: string; subject: string; homeroomClassId?: string }
type Student = { id: string; name: string; classId: string }
type Grade = { studentId: string; knowledge: number; skill: number; notes?: string }

export default function EmployeeRaporPage() {
  const [employee, setEmployee] = useState<Employee>({ id: "", subject: "-" })
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Grade[]>([])

  useEffect(() => {
    const load = async () => {
      const contextRes = await fetch("/api/employee/context", { cache: "no-store" })
      if (!contextRes.ok) return
      const context = await contextRes.json()
      const teacher = context.employee || { id: "", subject: "-" }
      const classStudents = (context.students || []).filter((student: Student) => student.classId === teacher.homeroomClassId)
      setEmployee(teacher)
      setStudents(classStudents)

      const gradesRes = await fetch(`/api/employee/grades?teacherId=${teacher.id}&classId=${teacher.homeroomClassId}`, { cache: "no-store" })
      if (gradesRes.ok) {
        const gradesData = await gradesRes.json()
        setGrades(Array.isArray(gradesData.grades) ? gradesData.grades : [])
      }
    }
    load().catch(() => {})
  }, [])

  const rows = useMemo(() => {
    return students.map((student) => {
      const grade = grades.find((item) => item.studentId === student.id)
      const average = grade ? Math.round((grade.knowledge + grade.skill) / 2) : 0
      return { student, grade, average }
    })
  }, [students, grades])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Rapor Siswa</h1>
        <p className="text-slate-500 text-sm">Rekap nilai {employee.subject}</p>
      </div>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-3 px-4">Siswa</th>
                <th className="py-3 px-4">Pengetahuan</th>
                <th className="py-3 px-4">Keterampilan</th>
                <th className="py-3 px-4">Rata-rata</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, grade, average }) => (
                <tr key={student.id} className="border-b border-slate-100">
                  <td className="py-3 px-4 font-medium text-slate-800">{student.name}</td>
                  <td className="py-3 px-4 text-slate-700">{grade?.knowledge ?? "-"}</td>
                  <td className="py-3 px-4 text-slate-700">{grade?.skill ?? "-"}</td>
                  <td className="py-3 px-4 text-slate-700">{average || "-"}</td>
                  <td className="py-3 px-4 text-slate-600">{grade?.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}
