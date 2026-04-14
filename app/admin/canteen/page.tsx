"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Search, Store, Trash2, UserCog, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/

function normalizeWhatsappNumber(value: string) {
  return value.trim().replace(/[\s-]/g, "")
}

type Owner = {
  id: string
  name: string
  email: string
  phone?: string
  canteenName: string
  canteenId?: string
}

type OwnerForm = {
  name: string
  email: string
  phone: string
  password: string
  canteenName: string
}

const EMPTY_FORM: OwnerForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  canteenName: "",
}

export default function AdminCanteenPage() {
  const [admin, setAdmin] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [owners, setOwners] = useState<Owner[]>([])
  const [query, setQuery] = useState("")
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null)
  const [form, setForm] = useState<OwnerForm>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/admin/canteen-owners", { cache: "no-store" })
      if (!res.ok) throw new Error("Gagal memuat data kantin")
      const data = await res.json()
      setAdmin(data.admin || null)
      setOwners(Array.isArray(data.owners) ? data.owners : [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load().catch(() => toast.error("Gagal memuat data"))
  }, [])

  const filteredOwners = useMemo(() => {
    const q = query.toLowerCase()
    return owners.filter(
      (owner) =>
        owner.name.toLowerCase().includes(q) ||
        owner.email.toLowerCase().includes(q) ||
        owner.canteenName.toLowerCase().includes(q),
    )
  }, [owners, query])

  const openCreate = () => {
    setEditingOwner(null)
    setForm(EMPTY_FORM)
    setShowFormModal(true)
  }

  const openEdit = (owner: Owner) => {
    setEditingOwner(owner)
    setForm({
      name: owner.name,
      email: owner.email,
      phone: owner.phone || "",
      password: "",
      canteenName: owner.canteenName,
    })
    setShowFormModal(true)
  }

  const handleSubmit = async () => {
    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    const phone = normalizeWhatsappNumber(form.phone)
    const canteenName = form.canteenName.trim()

    if (!name || !email || !phone || !canteenName || (!editingOwner && !form.password)) {
      toast.error("Nama, email, nomor WhatsApp, nama kantin, dan password wajib diisi")
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      toast.error("Format email tidak valid")
      return
    }

    if (!WHATSAPP_REGEX.test(phone)) {
      toast.error("Format nomor WhatsApp Indonesia tidak valid")
      return
    }

    if (!editingOwner && form.password.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }

    if (editingOwner && form.password && form.password.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingOwner) {
        const res = await fetch(`/api/admin/canteen-owners/${editingOwner.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone,
            password: form.password || undefined,
            canteenName,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Gagal update pemilik kantin")
        await load()
        toast.success("Pemilik kantin berhasil diperbarui")
      } else {
        const res = await fetch("/api/admin/canteen-owners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone,
            password: form.password,
            canteenName,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Gagal membuat pemilik kantin")
        await load()
        toast.success("Pemilik kantin berhasil dibuat")
      }

      setShowFormModal(false)
      setEditingOwner(null)
      setForm(EMPTY_FORM)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedOwner) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/canteen-owners/${selectedOwner.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus pemilik kantin")
      await load()
      setShowDeleteModal(false)
      setSelectedOwner(null)
      toast.success("Pemilik kantin berhasil dihapus")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus data")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <RouteLoading />
  }

  const adminDisplay = admin || {
    name: "Admin",
    avatar: "/placeholder-user.jpg",
  }

  return (
    <DashboardLayout role="ADMIN" userName={adminDisplay.name} userAvatar={adminDisplay.avatar || "/placeholder-user.jpg"}>
      <div className="max-w-5xl mx-auto space-y-6 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Manajemen Kantin</h1>
            <p className="text-slate-500">Kelola akun pemilik kantin dan nama unit kantin</p>
          </div>
          <GlassButton onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Pemilik Kantin
          </GlassButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GlassCard className="p-4 text-center"><UserCog className="w-6 h-6 mx-auto mb-2 text-blue-600" /><p className="text-2xl font-bold text-slate-800">{owners.length}</p><p className="text-xs text-slate-500">Total Pemilik</p></GlassCard>
          <GlassCard className="p-4 text-center"><Store className="w-6 h-6 mx-auto mb-2 text-emerald-600" /><p className="text-2xl font-bold text-slate-800">{owners.length}</p><p className="text-xs text-slate-500">Total Kantin</p></GlassCard>
          <GlassCard className="p-4 text-center"><UtensilsCrossed className="w-6 h-6 mx-auto mb-2 text-amber-600" /><p className="text-2xl font-bold text-slate-800">Aktif</p><p className="text-xs text-slate-500">Status Unit</p></GlassCard>
        </div>

        <GlassCard className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <GlassInput placeholder="Cari pemilik, email, atau nama kantin..." className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-5 space-y-3">
          {filteredOwners.map((owner) => (
            <div key={owner.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{owner.name}</p>
                <p className="text-sm text-slate-500">{owner.email}</p>
                <p className="text-sm text-slate-500">WA: {owner.phone || "-"}</p>
                <p className="text-sm text-slate-600">Kantin: {owner.canteenName}</p>
              </div>
              <div className="flex gap-2">
                <GlassButton size="sm" variant="secondary" onClick={() => openEdit(owner)}>Edit</GlassButton>
                <GlassButton size="sm" variant="danger" onClick={() => { setSelectedOwner(owner); setShowDeleteModal(true) }}><Trash2 className="w-4 h-4" /></GlassButton>
              </div>
            </div>
          ))}
          {filteredOwners.length === 0 && <div className="text-center py-8 text-slate-500">Data pemilik kantin tidak ditemukan.</div>}
        </GlassCard>

        <GlassModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingOwner ? "Edit Pemilik Kantin" : "Tambah Pemilik Kantin"}>
          <form className="space-y-4" autoComplete="off" onSubmit={(event) => { event.preventDefault(); void handleSubmit() }}>
            <div className="space-y-1">
              <label htmlFor="canteen-owner-name" className="text-sm font-medium text-slate-700">Nama pemilik</label>
              <GlassInput id="canteen-owner-name" name="canteen_owner_name" placeholder="Masukkan nama lengkap" autoComplete="off" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="canteen-owner-email" className="text-sm font-medium text-slate-700">Email</label>
              <GlassInput id="canteen-owner-email" name="canteen_owner_email" type="email" placeholder="Masukkan email akun" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="canteen-owner-phone" className="text-sm font-medium text-slate-700">Nomor WhatsApp</label>
              <GlassInput id="canteen-owner-phone" name="canteen_owner_phone" type="tel" inputMode="tel" placeholder="Contoh: +6281234567890" autoComplete="off" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="canteen-owner-password" className="text-sm font-medium text-slate-700">{editingOwner ? "Password baru (opsional)" : "Password"}</label>
              <GlassInput id="canteen-owner-password" name="canteen_owner_password" type="password" autoComplete="new-password" placeholder={editingOwner ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="canteen-name" className="text-sm font-medium text-slate-700">Nama kantin</label>
              <GlassInput id="canteen-name" name="canteen_name" placeholder="Masukkan nama kantin" autoComplete="off" value={form.canteenName} onChange={(e) => setForm({ ...form, canteenName: e.target.value })} />
            </div>
            <GlassButton type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Simpan
            </GlassButton>
          </form>
        </GlassModal>

        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Pemilik Kantin">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Yakin ingin menghapus akun pemilik kantin ini?</p>
            <GlassButton variant="danger" className="w-full" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Hapus
            </GlassButton>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
