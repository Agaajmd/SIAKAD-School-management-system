"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Wallet, Clock3, CheckCircle2, XCircle, RefreshCw, QrCode, CreditCard } from "lucide-react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import type { UserRole, WalletTopupMethod, WalletTopupStatus } from "@/lib/data-model"

type AdminUser = {
  name: string
  avatar: string
}

type AdminWalletTopupItem = {
  id: string
  userId: string
  userName: string
  userRole: UserRole
  amount: number
  method: WalletTopupMethod
  status: WalletTopupStatus
  requestedAt: string
  processedAt?: string
  proofReference?: string
  proofUrl?: string
  adminNote?: string
}

type WalletTopupMethodMeta = {
  code: WalletTopupMethod
  label: string
  accountNumber: string
  accountName: string
  description: string
}

type AdminWalletTopupsResponse = {
  topups: AdminWalletTopupItem[]
  methods: WalletTopupMethodMeta[]
  qrisImagePath: string
  summary: {
    pendingCount: number
    approvedCount: number
    rejectedCount: number
    pendingAmount: number
    approvedAmount: number
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

function statusBadge(status: WalletTopupStatus) {
  switch (status) {
    case "APPROVED":
      return { className: "bg-emerald-100 text-emerald-700", label: "Disetujui", icon: CheckCircle2 }
    case "REJECTED":
      return { className: "bg-rose-100 text-rose-700", label: "Ditolak", icon: XCircle }
    default:
      return { className: "bg-amber-100 text-amber-700", label: "Menunggu", icon: Clock3 }
  }
}

export default function AdminWalletTopupsPage() {
  const [admin, setAdmin] = useState<AdminUser>({ name: "", avatar: "/placeholder-user.jpg" })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null)

  const [topups, setTopups] = useState<AdminWalletTopupItem[]>([])
  const [methods, setMethods] = useState<WalletTopupMethodMeta[]>([])
  const [qrisImagePath, setQrisImagePath] = useState("/QRISPAYMENT.PNG")
  const [summary, setSummary] = useState<AdminWalletTopupsResponse["summary"]>({
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
  })
  const [noteById, setNoteById] = useState<Record<string, string>>({})

  const loadData = useCallback(async (withSpinner = false) => {
    if (withSpinner) {
      setIsRefreshing(true)
    }

    try {
      const [profileRes, topupsRes] = await Promise.all([
        fetch("/api/dashboard/admin", { cache: "no-store" }),
        fetch("/api/admin/wallet-topups", { cache: "no-store" }),
      ])

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        if (profileData?.admin) {
          setAdmin({
            name: String(profileData.admin.name || "Admin"),
            avatar: String(profileData.admin.avatar || "/placeholder-user.jpg"),
          })
        }
      }

      if (!topupsRes.ok) {
        const errorData = await topupsRes.json().catch(() => ({}))
        throw new Error(String(errorData?.error || "Gagal memuat data topup"))
      }

      const topupsData = (await topupsRes.json()) as AdminWalletTopupsResponse
      setTopups(Array.isArray(topupsData.topups) ? topupsData.topups : [])
      setMethods(Array.isArray(topupsData.methods) ? topupsData.methods : [])
      setQrisImagePath(topupsData.qrisImagePath || "/QRISPAYMENT.PNG")
      if (topupsData.summary) {
        setSummary({
          pendingCount: Number(topupsData.summary.pendingCount || 0),
          approvedCount: Number(topupsData.summary.approvedCount || 0),
          rejectedCount: Number(topupsData.summary.rejectedCount || 0),
          pendingAmount: Number(topupsData.summary.pendingAmount || 0),
          approvedAmount: Number(topupsData.summary.approvedAmount || 0),
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat data topup")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const pendingTopups = useMemo(() => topups.filter((item) => item.status === "PENDING"), [topups])
  const processedTopups = useMemo(() => topups.filter((item) => item.status !== "PENDING"), [topups])

  const handleStatusUpdate = async (id: string, status: Extract<WalletTopupStatus, "APPROVED" | "REJECTED">) => {
    setIsSubmittingId(id)
    try {
      const res = await fetch("/api/admin/wallet-topups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status,
          adminNote: (noteById[id] || "").trim() || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(String(data?.error || "Gagal memperbarui status topup"))
      }

      toast.success(status === "APPROVED" ? "Topup disetujui" : "Topup ditolak")
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui status")
    } finally {
      setIsSubmittingId(null)
    }
  }

  if (isLoading) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name || "Admin"} userAvatar={admin.avatar || "/placeholder-user.jpg"}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Konfirmasi Topup Dompet Sekolah</h1>
            <p className="text-sm text-slate-500">Verifikasi topup dari siswa, guru, orang tua, dan kepala sekolah.</p>
          </div>
          <GlassButton
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => void loadData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Muat Ulang
          </GlassButton>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <GlassCard className="p-3">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-xl font-bold text-amber-600">{summary.pendingCount}</p>
          </GlassCard>
          <GlassCard className="p-3">
            <p className="text-xs text-slate-500">Disetujui</p>
            <p className="text-xl font-bold text-emerald-600">{summary.approvedCount}</p>
          </GlassCard>
          <GlassCard className="p-3">
            <p className="text-xs text-slate-500">Ditolak</p>
            <p className="text-xl font-bold text-rose-600">{summary.rejectedCount}</p>
          </GlassCard>
          <GlassCard className="p-3 col-span-2 md:col-span-1">
            <p className="text-xs text-slate-500">Nominal Pending</p>
            <p className="text-sm font-semibold text-amber-700">{formatCurrency(summary.pendingAmount)}</p>
          </GlassCard>
          <GlassCard className="p-3 col-span-2 md:col-span-1">
            <p className="text-xs text-slate-500">Nominal Approved</p>
            <p className="text-sm font-semibold text-emerald-700">{formatCurrency(summary.approvedAmount)}</p>
          </GlassCard>
        </div>

        <GlassCard className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Metode Pembayaran Resmi
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {methods.map((method) => (
              <div key={method.code} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                  {method.code === "QRIS" ? <QrCode className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                  {method.label}
                </p>
                <p className="text-slate-500 text-xs mt-1">{method.description}</p>
                {method.accountNumber !== "-" ? <p className="text-slate-700 mt-1">No Tujuan: {method.accountNumber}</p> : null}
                <p className="text-slate-700">Atas Nama: {method.accountName}</p>
              </div>
            ))}
          </div>
          <img src={qrisImagePath} alt="QRIS Payment" className="w-full max-w-sm rounded-xl border border-slate-200" />
        </GlassCard>

        <GlassCard className="space-y-3">
          <h2 className="text-base font-semibold text-slate-800">Antrian Topup Pending</h2>
          {pendingTopups.length === 0 ? (
            <p className="text-sm text-slate-500">Tidak ada topup yang menunggu konfirmasi.</p>
          ) : (
            <div className="space-y-3">
              {pendingTopups.map((item) => {
                const badge = statusBadge(item.status)
                const Icon = badge.icon
                return (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">{item.userName} ({item.userRole})</p>
                        <p className="text-sm text-slate-600">{formatCurrency(item.amount)} • {item.method}</p>
                        <p className="text-xs text-slate-500 mt-1">Dikirim: {new Date(item.requestedAt).toLocaleString("id-ID")}</p>
                        {item.proofReference ? <p className="text-xs text-slate-600 mt-1">Ref: {item.proofReference}</p> : null}
                        {item.proofUrl ? (
                          <a
                            href={item.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block text-xs text-blue-600 hover:text-blue-700 mt-1"
                          >
                            Lihat bukti transfer
                          </a>
                        ) : null}
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {badge.label}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <GlassInput
                        placeholder="Catatan admin (opsional)"
                        value={noteById[item.id] || ""}
                        onChange={(e) => setNoteById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                      <GlassButton
                        type="button"
                        className="sm:w-auto w-full"
                        disabled={isSubmittingId === item.id}
                        onClick={() => void handleStatusUpdate(item.id, "APPROVED")}
                      >
                        Setujui
                      </GlassButton>
                      <GlassButton
                        type="button"
                        variant="danger"
                        className="sm:w-auto w-full"
                        disabled={isSubmittingId === item.id}
                        onClick={() => void handleStatusUpdate(item.id, "REJECTED")}
                      >
                        Tolak
                      </GlassButton>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>

        <GlassCard className="space-y-3">
          <h2 className="text-base font-semibold text-slate-800">Riwayat Konfirmasi</h2>
          {processedTopups.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada topup yang diproses.</p>
          ) : (
            <div className="space-y-2">
              {processedTopups.slice(0, 20).map((item) => {
                const badge = statusBadge(item.status)
                const Icon = badge.icon
                return (
                  <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-700">{item.userName} • {formatCurrency(item.amount)}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${badge.className}`}>
                        <Icon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.method} • {new Date(item.requestedAt).toLocaleString("id-ID")}
                    </p>
                    {item.adminNote ? <p className="text-xs text-slate-600 mt-1">Catatan: {item.adminNote}</p> : null}
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  )
}
