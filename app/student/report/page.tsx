"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassTextarea } from "@/components/atoms/glass-textarea"
import { GlassButton } from "@/components/atoms/glass-button"
import {
  Camera,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Package,
  X,
} from "lucide-react"
import { toast } from "sonner"

type ClassOption = {
  id: string
  name: string
  grade?: string
}

export default function StudentReportPage() {
  const [student, setStudent] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"form" | "history">("form")
  const [assetId, setAssetId] = useState("")
  const [damageType, setDamageType] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [imageDataUrl, setImageDataUrl] = useState("")
  const [imageName, setImageName] = useState("")
  const [isReadingImage, setIsReadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [selectedReport, setSelectedReport] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const overviewRes = await fetch("/api/student/overview", { cache: "no-store" })
        if (!overviewRes.ok) {
          throw new Error("Gagal memuat data siswa")
        }
        const overview = await overviewRes.json()
        if (!overview.student?.id) {
          throw new Error("Data siswa tidak ditemukan")
        }
        setStudent(overview.student)
        if (overview.student.classId) {
          setLocation(String(overview.student.classId))
        }

        const classesRes = await fetch("/api/admin/classes", { cache: "no-store" })
        if (classesRes.ok) {
          const classPayload = await classesRes.json()
          const classList = Array.isArray(classPayload.classes) ? (classPayload.classes as ClassOption[]) : []
          setClasses(classList)

          const studentClassId = String(overview.student.classId || "")
          const studentClass = classList.find((item) => item.id === studentClassId)
          const studentLocation = studentClass
            ? `${studentClass.name}${studentClass.grade ? ` - Grade ${studentClass.grade}` : ""}`
            : String(studentClassId || "")
          if (studentLocation) {
            setLocation(studentLocation)
          }
        }

        const reportsRes = await fetch(`/api/student/reports?studentId=${overview.student.id}`, {
          cache: "no-store",
        })
        if (reportsRes.ok) {
          const reportsData = await reportsRes.json()
          setReports(Array.isArray(reportsData.reports) ? reportsData.reports : [])
        } else {
          setReports([])
        }
      } catch {
        setLoadError("Data laporan aset belum bisa dimuat.")
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar")
      event.target.value = ""
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error("Ukuran gambar maksimal 5MB")
      event.target.value = ""
      return
    }

    setIsReadingImage(true)
    const reader = new FileReader()
    reader.onload = () => {
      setImageDataUrl(String(reader.result || ""))
      setImageName(file.name)
      setIsReadingImage(false)
    }
    reader.onerror = () => {
      setIsReadingImage(false)
      toast.error("Gagal membaca file gambar")
      event.target.value = ""
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!assetId || !damageType || !description || !location) {
      toast.error("Mohon isi semua field")
      return
    }

    if (!student?.id) {
      toast.error("Data siswa belum siap")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/student/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          assetId,
          assetName: assetId,
          damageType,
          description,
          location,
          imageUrl: imageDataUrl || undefined,
        }),
      })

      if (!res.ok) {
        toast.error("Gagal mengirim laporan")
        return
      }

      const data = await res.json()
      setReports((prev) => [data.report, ...prev])
      setAssetId("")
      setDamageType("")
      setDescription("")
      setImageDataUrl("")
      setImageName("")
      toast.success("Laporan berhasil dikirim")
    } catch {
      toast.error("Gagal mengirim laporan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            Menunggu
          </span>
        )
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            <AlertCircle className="w-3 h-3" />
            Diproses
          </span>
        )
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />
            Selesai
          </span>
        )
      default:
        return null
    }
  }

  const getDamageTypeLabel = (type: string) => {
    switch (type) {
      case "broken":
        return "Rusak/Patah"
      case "malfunctioning":
        return "Tidak Berfungsi"
      case "missing":
        return "Bagian Hilang"
      case "wear":
        return "Aus Normal"
      default:
        return "Lainnya"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return <RouteLoading />
  }

  if (!student) {
    return (
      <DashboardLayout role="STUDENT" userName="-" userAvatar="/placeholder-user.jpg">
        <div className="max-w-md mx-auto">
          <GlassCard className="p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-800">Data siswa tidak tersedia</h2>
            <p className="text-slate-500 mt-2">{loadError || "Silakan login ulang atau hubungi admin."}</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar || "/placeholder-user.jpg"}>
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Laporan Aset</h1>
          <p className="text-slate-500">Laporkan kerusakan fasilitas sekolah</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "form"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Buat Laporan
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Riwayat ({reports.length})
          </button>
        </div>

        {/* Form Tab */}
        {activeTab === "form" && (
          <GlassCard className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                id="asset-image"
                className="hidden"
                onChange={handleImageChange}
              />
              <label
                htmlFor="asset-image"
                className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {imageDataUrl ? (
                  <img
                    src={imageDataUrl}
                    alt="Preview kerusakan"
                    className="w-full max-h-56 object-cover rounded-lg mb-3"
                  />
                ) : (
                  <div className="p-4 bg-blue-100 rounded-full mb-4">
                    <Camera className="w-10 h-10 text-blue-500" />
                  </div>
                )}
                <p className="text-sm font-medium text-slate-700 mb-1">
                  {imageDataUrl ? "Gambar berhasil dipilih" : "Upload Foto Kerusakan"}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  {isReadingImage
                    ? "Memproses gambar..."
                    : imageName
                      ? imageName
                      : "Klik untuk memilih gambar"}
                </p>
                <GlassButton type="button" variant="outline" size="sm" disabled={isReadingImage}>
                  <Camera className="w-4 h-4 mr-2" />
                  {imageDataUrl ? "Ganti Gambar" : "Pilih Gambar"}
                </GlassButton>
              </label>
              {imageDataUrl ? (
                <GlassButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setImageDataUrl("")
                    setImageName("")
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Hapus Gambar
                </GlassButton>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID Aset</label>
                <GlassInput
                  placeholder="contoh: MEJA-A101-001"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih lokasi kelas...</option>
                  {classes.map((classItem) => {
                    const label = `${classItem.name}${classItem.grade ? ` - Grade ${classItem.grade}` : ""}`
                    return (
                      <option key={classItem.id} value={label}>
                        {label}
                      </option>
                    )
                  })}
                  <option value="Area Umum Sekolah">Area Umum Sekolah</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Kerusakan</label>
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih jenis kerusakan...</option>
                  <option value="broken">Rusak/Patah</option>
                  <option value="malfunctioning">Tidak Berfungsi</option>
                  <option value="missing">Bagian Hilang</option>
                  <option value="wear">Aus Normal</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <GlassTextarea
                  placeholder="Jelaskan kerusakan secara detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <GlassButton type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Mengirim...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    Kirim Laporan
                  </span>
                )}
              </GlassButton>
            </form>
          </GlassCard>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <GlassCard className="p-6 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500">Belum ada laporan aset</p>
                <p className="text-xs text-slate-400">Silakan kirim laporan pertama melalui tab Buat Laporan.</p>
              </GlassCard>
            ) : (
              reports.map((report) => (
                <GlassCard
                  key={report.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setSelectedReport(report)}
                >
                  {report.imageUrl ? (
                    <img
                      src={report.imageUrl}
                      alt={`Foto laporan ${report.assetName}`}
                      className="w-full h-36 object-cover rounded-lg mb-3"
                    />
                  ) : null}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800">{report.assetName}</h3>
                        <p className="text-xs text-slate-400">{report.assetId}</p>
                        <p className="text-sm text-slate-500 mt-1">{report.location}</p>
                      </div>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">{formatDate(report.createdAt)}</p>
                </GlassCard>
              ))
            )}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <GlassModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Detail Laporan"
        size="md"
      >
        {selectedReport && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                {getStatusBadge(selectedReport.status)}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">ID Laporan</p>
                <p className="font-medium text-slate-800">{selectedReport.id}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Aset</p>
                <p className="font-medium text-slate-800">{selectedReport.assetName}</p>
                <p className="text-sm text-slate-500">{selectedReport.assetId}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Lokasi</p>
                <p className="font-medium text-slate-800">{selectedReport.location}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Jenis Kerusakan</p>
                <p className="font-medium text-slate-800">{getDamageTypeLabel(selectedReport.damageType)}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Deskripsi</p>
                <p className="text-slate-800">{selectedReport.description}</p>
              </div>

              {selectedReport.imageUrl ? (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-400 mb-2">Foto Kerusakan</p>
                  <img
                    src={selectedReport.imageUrl}
                    alt={`Foto laporan ${selectedReport.assetName}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              ) : null}

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Tanggal Laporan</p>
                <p className="font-medium text-slate-800">{formatDate(selectedReport.createdAt)}</p>
              </div>
            </div>

            <GlassButton
              variant="ghost"
              className="w-full mt-6"
              onClick={() => setSelectedReport(null)}
            >
              Tutup
            </GlassButton>
          </>
        )}
      </GlassModal>
    </DashboardLayout>
  )
}
