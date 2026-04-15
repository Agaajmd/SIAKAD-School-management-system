"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Mail, MessageCircle, MoreVertical, Plus, Trash2, UserRoundPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { openShareChannel } from "@/lib/account-share"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassModal } from "@/components/molecules/glass-modal"
import { ClassRoomGrid } from "@/components/organisms/class-room-grid"

type ParentAccount = {
  id: string
  name: string
  email: string
  phone?: string
  childrenIds?: string[]
  childId?: string
  childName: string
}

type Student = {
  id: string
  name: string
  email: string
  classId: string
  avatar?: string
  attendance?: "PRESENT" | "SICK" | "ALPHA"
  seatRow?: number
  seatCol?: number
  paymentStatus?: "PAID" | "UNPAID"
  positivePoints?: number
  negativePoints?: number
  totalPoints?: number
  points?: number
}

type ClassRoom = {
  id: string
  name: string
  grade: string
  rows: number
  cols: number
}

type GridClassRoom = {
  id: string
  name: string
  grade: string
  rows: number
  cols: number
  teacherId: string
  floorPlanImage: string
  seatingPlan: Record<string, string>
}

type GridStudent = {
  id: string
  name: string
  email: string
  role: "STUDENT"
  avatar: string
  classId: string
  paymentStatus: "PAID" | "UNPAID"
  behaviorScore: number
  attendance: "PRESENT" | "SICK" | "ALPHA"
  points: number
  coins: number
  streak: number
  level: number
  xp: number
  positivePoints: number
  negativePoints: number
  totalPoints: number
  parentId: string
  seatRow: number
  seatCol: number
}

type ParentForm = {
  name: string
  email: string
  phone: string
  password: string
  childId: string
}

const EMPTY_FORM: ParentForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  childId: "",
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/

type ApiResponseBody = {
  error?: string
  parent?: { id?: string }
  [key: string]: unknown
}

const parseResponseBody = async (response: Response): Promise<ApiResponseBody> => {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as ApiResponseBody
  } catch {
    return {}
  }
}

interface EmployeeClassDetailClientProps {
  id?: string
}

export default function EmployeeClassDetailClient({ id }: EmployeeClassDetailClientProps) {
  const params = useParams<{ id: string }>()
  const classId = id || params?.id

  const [employee, setEmployee] = useState<any>(null)
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [selectedClassId, setSelectedClassId] = useState(String(classId || ""))
  const [classItem, setClassItem] = useState<ClassRoom | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [parents, setParents] = useState<ParentAccount[]>([])
  const [form, setForm] = useState<ParentForm>(EMPTY_FORM)
  const [editingParent, setEditingParent] = useState<ParentAccount | null>(null)
  const [selectedParent, setSelectedParent] = useState<ParentAccount | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [knownParentPasswords, setKnownParentPasswords] = useState<Record<string, string>>({})

  const load = async () => {
    try {
      const [classesRes, parentsRes] = await Promise.all([
        fetch("/api/admin/classes", { cache: "no-store" }),
        fetch(`/api/employee/parents?classId=${selectedClassId || classId || ""}`, { cache: "no-store" }),
      ])

      if (!classesRes.ok || !parentsRes.ok) {
        throw new Error("Gagal memuat data kelas")
      }

      const classesData = await classesRes.json()
      const parentsData = await parentsRes.json()

      const classes = Array.isArray(classesData.classes) ? (classesData.classes as ClassRoom[]) : []
      const studentsFromClasses = Array.isArray(classesData.students) ? (classesData.students as Student[]) : []
      const studentsFromParents = Array.isArray(parentsData.students) ? (parentsData.students as Student[]) : []
      const parentStudentsById = new Map(studentsFromParents.map((item) => [item.id, item]))

      const nextClass =
        classes.find((item) => item.id === selectedClassId) ||
        classes.find((item) => item.name.trim().toLowerCase() === String(selectedClassId || classId || "").trim().toLowerCase()) ||
        classes[0] ||
        null
      const resolvedClassId = nextClass?.id || String(classId || "")

      const studentsForClass = studentsFromClasses.filter((item) => item.classId === resolvedClassId)
      const fallbackStudentsFromParents = studentsFromParents.filter((item) => item.classId === resolvedClassId)
      const nextStudents = studentsForClass.length > 0 ? studentsForClass : fallbackStudentsFromParents

      const nextParents = Array.isArray(parentsData.parents) ? (parentsData.parents as ParentAccount[]) : []
      const normalizedParents = nextParents.map((parent) => {
        const childId = parent.childId || parent.childrenIds?.[0] || ""
        if (!childId) return parent

        const resolvedName =
          parent.childName && parent.childName !== "-"
            ? parent.childName
            : parentStudentsById.get(childId)?.name || "-"

        return {
          ...parent,
          childId,
          childName: resolvedName,
        }
      })

      setEmployee(classesData.admin || null)
      setClasses(classes)
      if (nextClass?.id && nextClass.id !== selectedClassId) {
        setSelectedClassId(nextClass.id)
      }
      setClassItem(nextClass)
      setStudents(nextStudents)
      setParents(normalizedParents)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!classId && !selectedClassId) return
    load().catch(() => toast.error("Gagal memuat data"))
  }, [classId, selectedClassId])

  const handleSelectClass = (nextClassId: string) => {
    setSelectedClassId(nextClassId)
  }

  const availableChildren = useMemo(
    () => students.map((student) => ({ id: student.id, label: `${student.name} (${student.email})` })),
    [students],
  )

  const classRoomGridData = useMemo<GridClassRoom | null>(() => {
    if (!classItem) return null
    return {
      id: classItem.id,
      name: classItem.name,
      grade: classItem.grade,
      rows: classItem.rows,
      cols: classItem.cols,
      teacherId: "",
      floorPlanImage: "",
      seatingPlan: {},
    }
  }, [classItem])

  const classRoomGridStudents = useMemo<GridStudent[]>(() => {
    return students.map((student, index) => {
      const fallbackCols = Math.max(classItem?.cols || 6, 1)
      const row = Number((student as any).seatRow ?? Math.floor(index / fallbackCols))
      const col = Number((student as any).seatCol ?? (index % fallbackCols))
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        role: "STUDENT",
        avatar: student.avatar || "/placeholder-user.jpg",
        classId: student.classId,
        paymentStatus: student.paymentStatus || "PAID",
        behaviorScore: 0,
        attendance: student.attendance || "PRESENT",
        points: Number(student.points ?? student.totalPoints ?? 0),
        coins: 0,
        streak: 0,
        level: 0,
        xp: 0,
        positivePoints: Number(student.positivePoints ?? 0),
        negativePoints: Number(student.negativePoints ?? 0),
        totalPoints: Number(student.totalPoints ?? student.points ?? 0),
        parentId: "",
        seatRow: row,
        seatCol: col,
      }
    })
  }, [students, classItem])

  const handleAttendanceChange = async (studentId: string, status: "PRESENT" | "SICK" | "ALPHA") => {
    setStudents((prev) => prev.map((student) => (student.id === studentId ? { ...student, attendance: status } : student)))
    try {
      const res = await fetch("/api/employee/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, status }),
      })
      const data = await parseResponseBody(res)
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan attendance")
      }
      toast.success("Attendance siswa berhasil diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan attendance")
      await load()
    }
  }

  if (isLoading) {
    return <RouteLoading />
  }

  const openCreate = () => {
    setEditingParent(null)
    setForm(EMPTY_FORM)
    setShowFormModal(true)
  }

  const openEdit = (parent: ParentAccount) => {
    const student = parent.childId
      ? students.find((item) => item.id === parent.childId)
      : students.find((item) => item.name === parent.childName)
    setEditingParent(parent)
    setForm({
      name: parent.name,
      email: parent.email,
      phone: parent.phone || "",
      password: "",
      childId: student?.id || "",
    })
    setShowFormModal(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.childId || (!editingParent && !form.password)) {
      toast.error("Nama, email, nomor WhatsApp, anak, dan password wajib diisi")
      return
    }

    if (!EMAIL_REGEX.test(form.email)) {
      toast.error("Format email tidak valid")
      return
    }

    if (!WHATSAPP_REGEX.test(form.phone)) {
      toast.error("Format nomor WhatsApp Indonesia tidak valid")
      return
    }

    const resolvedClassId = selectedClassId || classItem?.id || String(classId || "")

    setIsSubmitting(true)
    try {
      if (editingParent) {
        const res = await fetch("/api/employee/parents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingParent.id,
            name: form.name,
            email: form.email,
            phone: form.phone,
            password: form.password || undefined,
            childId: form.childId,
            classId: resolvedClassId,
          }),
        })
        const data = await parseResponseBody(res)
        if (!res.ok) throw new Error(data?.error || "Gagal update akun parent")
        await load()
        if (form.password) {
          setKnownParentPasswords((prev) => ({ ...prev, [editingParent.id]: form.password }))
        }
        toast.success("Akun parent berhasil diperbarui")
      } else {
        const res = await fetch("/api/employee/parents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, classId: resolvedClassId }),
        })
        const data = await parseResponseBody(res)
        if (!res.ok) throw new Error(data?.error || "Gagal menambah akun parent")
        await load()
        const createdParentId = data?.parent?.id
        if (createdParentId) {
          setKnownParentPasswords((prev) => ({ ...prev, [String(createdParentId)]: form.password }))
        }
        toast.success("Akun parent berhasil dibuat")
      }

      setShowFormModal(false)
      setEditingParent(null)
      setForm(EMPTY_FORM)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan akun parent")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedParent) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/employee/parents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedParent.id }),
      })
      const data = await parseResponseBody(res)
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus akun parent")
      await load()
      setShowDeleteModal(false)
      setSelectedParent(null)
      toast.success("Akun parent berhasil dihapus")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus akun parent")
    } finally {
      setIsSubmitting(false)
    }
  }

  const sendParentAccount = (parent: ParentAccount, channel: "whatsapp" | "email", password: string) => {
    try {
      openShareChannel(channel, {
        roleLabel: "Orang Tua",
        name: parent.name,
        email: parent.email,
        phone: parent.phone,
        password,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuka kanal pengiriman")
    }
  }

  const handleShareParentAccount = (parent: ParentAccount, channel: "whatsapp" | "email") => {
    const password = knownParentPasswords[parent.id] || ""
    sendParentAccount(parent, channel, password)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Detail Kelas {classItem?.name || "-"}</h1>
            <p className="text-slate-500">Kelola seat kelas dan akun parent siswa</p>
          </div>
          <GlassButton type="button" onClick={openCreate} className="flex items-center gap-2">
            <UserRoundPlus className="w-4 h-4" /> Tambah Akun Parent
          </GlassButton>
        </div>

        <GlassCard className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Pilih Kelas</p>
            <p className="text-xs text-slate-500">Ambil data langsung dari backend kelas yang tersedia</p>
          </div>
          <select
            value={selectedClassId || classItem?.id || ""}
            onChange={(e) => handleSelectClass(e.target.value)}
            className="w-full sm:w-80 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700"
          >
            {classes.length === 0 ? (
              <option value="">Tidak ada kelas tersedia</option>
            ) : (
              classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - Grade {cls.grade}
                </option>
              ))
            )}
          </select>
        </GlassCard>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GlassCard className="p-4 text-center"><Users className="w-6 h-6 mx-auto mb-2 text-blue-600" /><p className="text-2xl font-bold text-slate-800">{students.length}</p><p className="text-xs text-slate-500">Siswa</p></GlassCard>
          <GlassCard className="p-4 text-center"><UserRoundPlus className="w-6 h-6 mx-auto mb-2 text-emerald-600" /><p className="text-2xl font-bold text-slate-800">{parents.length}</p><p className="text-xs text-slate-500">Akun Parent</p></GlassCard>
          <GlassCard className="p-4 text-center"><Users className="w-6 h-6 mx-auto mb-2 text-amber-600" /><p className="text-2xl font-bold text-slate-800">{classItem ? classItem.rows * classItem.cols : 0}</p><p className="text-xs text-slate-500">Kapasitas Kursi</p></GlassCard>
        </div>

        {classRoomGridData && (
          <GlassCard className="p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Seat Kelas</h2>
            <ClassRoomGrid classroom={classRoomGridData} students={classRoomGridStudents} onAttendanceChange={handleAttendanceChange} lockUnpaidSeats={false} />
          </GlassCard>
        )}

        <GlassCard className="p-4 sm:p-5 space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Daftar Akun Parent</h2>
          {parents.map((parent) => (
            <div key={parent.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{parent.name}</p>
                <p className="text-sm text-slate-500">{parent.email}</p>
                <p className="text-sm text-slate-500">WA: {parent.phone || "-"}</p>
                <p className="text-sm text-slate-600">Anak: {parent.childName}</p>
              </div>
              <div className="relative group" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                  <MoreVertical className="w-4 h-4 text-slate-600" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button type="button" onClick={() => openEdit(parent)} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">Edit</button>
                  <button type="button" onClick={() => handleShareParentAccount(parent, "whatsapp")} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    Kirim Akun via WhatsApp
                  </button>
                  <button type="button" onClick={() => handleShareParentAccount(parent, "email")} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Mail className="w-4 h-4" />
                    Kirim Akun via Email
                  </button>
                  <button type="button" className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-slate-50 transition-colors" onClick={() => { setSelectedParent(parent); setShowDeleteModal(true) }}>
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
          {parents.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
              Data akun parent belum tersedia untuk kelas ini.
            </div>
          )}
        </GlassCard>

          <GlassModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingParent ? "Edit Akun Parent" : "Tambah Akun Parent"}>
          <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nama</label>
                <GlassInput autoComplete="name" name="parent-name" placeholder="Nama parent" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <GlassInput autoComplete="email" name="parent-email" type="email" placeholder="Email parent" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nomor WhatsApp</label>
                <GlassInput autoComplete="tel" inputMode="tel" name="parent-phone" type="tel" placeholder="08xxxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{editingParent ? "Password baru (opsional)" : "Password"}</label>
                <GlassInput autoComplete={editingParent ? "new-password" : "off"} name="parent-password" type="password" placeholder={editingParent ? "Password baru (opsional)" : "Password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            <select name="parent-child" value={form.childId} onChange={(e) => setForm({ ...form, childId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700">
              <option value="">Pilih Anak</option>
              {availableChildren.map((child) => (
                <option key={child.id} value={child.id}>{child.label}</option>
              ))}
            </select>
            <GlassButton type="button" className="w-full" onClick={() => { void handleSubmit() }} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Simpan
            </GlassButton>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Akun Parent">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Yakin ingin menghapus akun parent ini?</p>
            <GlassButton type="button" variant="danger" className="w-full" onClick={() => { void handleDelete() }} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Hapus
            </GlassButton>
          </div>
        </GlassModal>

    </div>
  )
}
