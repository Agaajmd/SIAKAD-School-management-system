"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassModal } from "@/components/molecules/glass-modal"
import { CalendarClock, Edit, Loader2, Plus, ReceiptText, ShieldCheck, ToggleLeft, ToggleRight, Trash2 } from "lucide-react"

type SppDefault = {
  id: string
  grade: string
  amount: number
  dueDay: number
  isActive: boolean
}

type FormState = {
  grade: string
  amount: string
  dueDay: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  grade: "",
  amount: "",
  dueDay: "10",
  isActive: true,
}

export default function SuperAdminSppPage() {
  const [superAdmin, setSuperAdmin] = useState<{ name: string; avatar: string } | null>(null)
  const [defaults, setDefaults] = useState<SppDefault[]>([])
  const [gradeOptions, setGradeOptions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingDefault, setEditingDefault] = useState<SppDefault | null>(null)
  const [selectedDefault, setSelectedDefault] = useState<SppDefault | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const load = async (withLoader = false) => {
    if (withLoader) {
      setIsLoading(true)
    }
    try {
      const [dashboardRes, defaultsRes] = await Promise.all([
        fetch("/api/dashboard/super-admin", { cache: "no-store" }),
        fetch("/api/super-admin/spp-defaults", { cache: "no-store" }),
      ])

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json()
        setSuperAdmin(dashboardData.superAdmin || null)
      }

      if (!defaultsRes.ok) {
        const data = await defaultsRes.json().catch(() => ({}))
        throw new Error(data?.error || "Gagal memuat default SPP")
      }

      const defaultsData = await defaultsRes.json()
      setDefaults(Array.isArray(defaultsData.defaults) ? defaultsData.defaults : [])
      setGradeOptions(Array.isArray(defaultsData.grades) ? defaultsData.grades : [])
    } finally {
      if (withLoader) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    load(true).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Gagal memuat data default SPP")
    })
  }, [])

  const sortedDefaults = useMemo(() => {
    return [...defaults].sort((left, right) => {
      const leftNumeric = Number(left.grade)
      const rightNumeric = Number(right.grade)
      if (Number.isFinite(leftNumeric) && Number.isFinite(rightNumeric)) {
        return leftNumeric - rightNumeric
      }
      return left.grade.localeCompare(right.grade)
    })
  }, [defaults])

  const activeDefaults = useMemo(() => sortedDefaults.filter((item) => item.isActive), [sortedDefaults])
  const monthlyPotential = useMemo(
    () => activeDefaults.reduce((acc, item) => acc + Number(item.amount || 0), 0),
    [activeDefaults],
  )

  const openCreate = () => {
    setEditingDefault(null)
    setForm(EMPTY_FORM)
    setShowFormModal(true)
  }

  const openEdit = (item: SppDefault) => {
    setEditingDefault(item)
    setForm({
      grade: item.grade,
      amount: String(item.amount),
      dueDay: String(item.dueDay),
      isActive: item.isActive,
    })
    setShowFormModal(true)
  }

  const handleSave = async () => {
    const grade = String(form.grade || "").trim().toUpperCase()
    const amount = Number(form.amount || 0)
    const dueDay = Number(form.dueDay || 10)

    if (!grade) {
      toast.error("Grade wajib diisi")
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Nominal SPP harus lebih dari 0")
      return
    }

    if (!Number.isFinite(dueDay) || dueDay < 1 || dueDay > 31) {
      toast.error("Tanggal jatuh tempo harus 1 - 31")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        grade,
        amount,
        dueDay,
        isActive: form.isActive,
      }

      const res = await fetch("/api/super-admin/spp-defaults", {
        method: editingDefault ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDefault ? { ...payload, id: editingDefault.id } : payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan default SPP")
      }

      await load(false)
      setShowFormModal(false)
      setEditingDefault(null)
      setForm(EMPTY_FORM)
      toast.success(editingDefault ? "Default SPP berhasil diperbarui" : "Default SPP berhasil dibuat")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan default SPP")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (item: SppDefault) => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/super-admin/spp-defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Gagal memperbarui status default SPP")
      await load(false)
      toast.success("Status default SPP diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui status default SPP")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedDefault) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/super-admin/spp-defaults?id=${encodeURIComponent(selectedDefault.id)}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus default SPP")
      await load(false)
      setShowDeleteModal(false)
      setSelectedDefault(null)
      toast.success("Default SPP berhasil dihapus")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus default SPP")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <RouteLoading />
  }

  const superAdminDisplay = superAdmin || { name: "Kepala Sekolah", avatar: "/placeholder-user.jpg" }

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={superAdminDisplay.name} userAvatar={superAdminDisplay.avatar}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Default Biaya SPP</h1>
            <p className="text-sm text-slate-500">Atur nominal SPP per grade untuk tagihan otomatis orang tua</p>
          </div>
          <GlassButton onClick={openCreate} className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Default SPP
          </GlassButton>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard className="p-4 text-center">
            <ReceiptText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{sortedDefaults.length}</p>
            <p className="text-xs text-slate-500">Total Grade</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <ShieldCheck className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{activeDefaults.length}</p>
            <p className="text-xs text-slate-500">Aktif</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <CalendarClock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{Math.round(
              activeDefaults.reduce((acc, item) => acc + item.dueDay, 0) / Math.max(activeDefaults.length, 1),
            )}</p>
            <p className="text-xs text-slate-500">Rata2 Jatuh Tempo</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <ReceiptText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xl font-bold text-slate-800">Rp {monthlyPotential.toLocaleString("id-ID")}</p>
            <p className="text-xs text-slate-500">Nominal / Bulan</p>
          </GlassCard>
        </div>

        <GlassCard className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Daftar Default SPP Per Grade</h2>
          <div className="space-y-3">
            {sortedDefaults.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Grade {item.grade}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                      {item.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-800">Rp {Number(item.amount || 0).toLocaleString("id-ID")}</p>
                  <p className="text-sm text-slate-500">Jatuh tempo tiap tanggal {item.dueDay}</p>
                </div>
                <div className="flex gap-2">
                  <GlassButton type="button" size="sm" variant="secondary" onClick={() => handleToggle(item)} disabled={isSubmitting}>
                    {item.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </GlassButton>
                  <GlassButton type="button" size="sm" onClick={() => openEdit(item)} disabled={isSubmitting}>
                    <Edit className="w-4 h-4" />
                  </GlassButton>
                  <GlassButton
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setSelectedDefault(item)
                      setShowDeleteModal(true)
                    }}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </GlassButton>
                </div>
              </div>
            ))}
            {sortedDefaults.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                Belum ada default SPP. Tambahkan nominal per grade terlebih dahulu.
              </div>
            )}
          </div>
        </GlassCard>

        <GlassModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingDefault ? "Edit Default SPP" : "Tambah Default SPP"}>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Grade</label>
              <GlassInput
                list="spp-grade-options"
                placeholder="Contoh: 10, 11, 12"
                value={form.grade}
                onChange={(event) => setForm((prev) => ({ ...prev, grade: event.target.value }))}
              />
              <datalist id="spp-grade-options">
                {[...new Set(gradeOptions)].map((grade) => (
                  <option key={grade} value={grade} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Nominal SPP</label>
              <GlassInput
                type="number"
                min={1}
                placeholder="Contoh: 250000"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Tanggal Jatuh Tempo (1-31)</label>
              <GlassInput
                type="number"
                min={1}
                max={31}
                value={form.dueDay}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDay: event.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Aktifkan default ini
            </label>
            <GlassButton type="button" className="w-full" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Simpan
            </GlassButton>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Default SPP">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Yakin ingin menghapus default SPP ini?</p>
            <GlassButton type="button" variant="danger" className="w-full" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Hapus
            </GlassButton>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
