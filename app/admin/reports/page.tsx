"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassTextarea } from "@/components/atoms/glass-textarea"
import { 
  mockAdmins,
  mockStudents,
  mockAssetReports,
  AssetReport,
  ReportStatus
} from "@/lib/mock-data"
import { 
  AlertTriangle, 
  Clock,
  CheckCircle,
  Wrench,
  FileText,
  Building,
  Package,
  Eye,
  Play,
  Check,
  MapPin,
  Calendar,
  User
} from "lucide-react"

const REPORT_TYPES = [
  { id: "KERUSAKAN", name: "Kerusakan", icon: AlertTriangle, color: "red" },
  { id: "FASILITAS", name: "Fasilitas", icon: Building, color: "blue" },
  { id: "LAINNYA", name: "Lainnya", icon: Package, color: "gray" },
]

const STATUS_OPTIONS: { id: ReportStatus; name: string; color: string }[] = [
  { id: "PENDING", name: "Menunggu", color: "yellow" },
  { id: "IN_PROGRESS", name: "Diproses", color: "blue" },
  { id: "RESOLVED", name: "Selesai", color: "green" },
]

export default function AdminReportsPage() {
  const admin = mockAdmins[0]
  const [reports, setReports] = useState<AssetReport[]>([...mockAssetReports])
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<AssetReport | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [resolution, setResolution] = useState("")

  const filteredReports = reports.filter(r => 
    filterStatus === "ALL" || r.status === filterStatus
  )

  const handleOpenDetail = (report: AssetReport) => {
    setSelectedReport(report)
    setShowDetailModal(true)
  }

  const handleOpenAction = (report: AssetReport) => {
    setSelectedReport(report)
    setResolution(report.resolution || "")
    setShowActionModal(true)
  }

  const handleUpdateStatus = (newStatus: ReportStatus) => {
    if (!selectedReport) return

    const updatedReport: AssetReport = {
      ...selectedReport,
      status: newStatus,
      handledBy: admin.id,
      handledAt: new Date().toISOString().split('T')[0],
      resolution: newStatus === "RESOLVED" ? resolution : undefined,
    }

    setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r))
    toast.success(`Status laporan diubah menjadi ${STATUS_OPTIONS.find(s => s.id === newStatus)?.name}`)
    setShowActionModal(false)
  }

  const getReportType = (typeId: string) => {
    return REPORT_TYPES.find(t => t.id === typeId)
  }

  const getReporterName = (reportedBy: string) => {
    return mockStudents.find(s => s.id === reportedBy)?.name || "Unknown"
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs">
            <Clock className="w-3 h-3" />
            Menunggu
          </span>
        )
      case "IN_PROGRESS":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs">
            <Wrench className="w-3 h-3" />
            Diproses
          </span>
        )
      case "RESOLVED":
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
            <CheckCircle className="w-3 h-3" />
            Selesai
          </span>
        )
      default:
        return null
    }
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar}>
      <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Manajemen Laporan</h1>
          <p className="text-sm text-white/60">Kelola laporan kerusakan dari siswa</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard className="text-center py-4">
            <FileText className="w-5 h-5 mx-auto mb-2 text-blue-400" />
            <p className="text-xl font-bold text-white">{reports.length}</p>
            <p className="text-xs text-white/60">Total Laporan</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <Clock className="w-5 h-5 mx-auto mb-2 text-yellow-400" />
            <p className="text-xl font-bold text-white">{reports.filter(r => r.status === "PENDING").length}</p>
            <p className="text-xs text-white/60">Menunggu</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <Wrench className="w-5 h-5 mx-auto mb-2 text-blue-400" />
            <p className="text-xl font-bold text-white">{reports.filter(r => r.status === "IN_PROGRESS").length}</p>
            <p className="text-xs text-white/60">Diproses</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <CheckCircle className="w-5 h-5 mx-auto mb-2 text-green-400" />
            <p className="text-xl font-bold text-white">{reports.filter(r => r.status === "RESOLVED").length}</p>
            <p className="text-xs text-white/60">Selesai</p>
          </GlassCard>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              filterStatus === "ALL"
                ? "bg-purple-500 text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            Semua
          </button>
          {STATUS_OPTIONS.map(status => (
            <button
              key={status.id}
              onClick={() => setFilterStatus(status.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filterStatus === status.id
                  ? "bg-purple-500 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {status.name}
            </button>
          ))}
        </div>

        {/* Reports List */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-white mb-4">Daftar Laporan</h2>
          
          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Tidak ada laporan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map(report => {
                const type = getReportType(report.type)
                const TypeIcon = type?.icon || Package
                return (
                  <div 
                    key={report.id}
                    className="p-4 bg-white/5 rounded-xl border border-white/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl bg-${type?.color || 'gray'}-500/20 shrink-0`}>
                        <TypeIcon className={`w-5 h-5 text-${type?.color || 'gray'}-400`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-semibold text-white">{report.title}</h3>
                          {getStatusBadge(report.status)}
                        </div>
                        <p className="text-sm text-white/60 mt-1 line-clamp-2">{report.description}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {report.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {report.reportedAt}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {getReporterName(report.reportedBy)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <GlassButton size="sm" onClick={() => handleOpenDetail(report)}>
                          <Eye className="w-4 h-4" />
                        </GlassButton>
                        <GlassButton size="sm" variant="secondary" onClick={() => handleOpenAction(report)}>
                          <Wrench className="w-4 h-4" />
                        </GlassButton>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>

        {/* Detail Modal */}
        <GlassModal 
          isOpen={showDetailModal} 
          onClose={() => setShowDetailModal(false)} 
          title="Detail Laporan"
        >
          {selectedReport && (
            <div className="space-y-4">
              {selectedReport.imageUrl && (
                <img 
                  src={selectedReport.imageUrl} 
                  alt={selectedReport.title}
                  className="w-full h-48 object-cover rounded-xl"
                />
              )}
              
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">{selectedReport.title}</h3>
                {getStatusBadge(selectedReport.status)}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <span className="text-white/50">Jenis:</span>
                  <span>{getReportType(selectedReport.type)?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <span className="text-white/50">Lokasi:</span>
                  <span>{selectedReport.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <span className="text-white/50">Pelapor:</span>
                  <span>{getReporterName(selectedReport.reportedBy)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <span className="text-white/50">Tanggal:</span>
                  <span>{selectedReport.reportedAt}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-white/50 mb-1">Deskripsi:</p>
                <p className="text-sm text-white/80">{selectedReport.description}</p>
              </div>

              {selectedReport.resolution && (
                <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/30">
                  <p className="text-sm text-green-300/80 mb-1">Resolusi:</p>
                  <p className="text-sm text-green-200">{selectedReport.resolution}</p>
                </div>
              )}

              <GlassButton 
                variant="secondary" 
                className="w-full justify-center" 
                onClick={() => setShowDetailModal(false)}
              >
                Tutup
              </GlassButton>
            </div>
          )}
        </GlassModal>

        {/* Action Modal */}
        <GlassModal 
          isOpen={showActionModal} 
          onClose={() => setShowActionModal(false)} 
          title="Update Status Laporan"
        >
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white">{selectedReport.title}</h3>
                <p className="text-sm text-white/60">{selectedReport.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-white/50">Status saat ini:</span>
                {getStatusBadge(selectedReport.status)}
              </div>

              {selectedReport.status !== "RESOLVED" && (
                <GlassTextarea
                  label="Resolusi/Catatan"
                  placeholder="Jelaskan penanganan yang dilakukan..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                />
              )}

              <div className="grid grid-cols-3 gap-2">
                {selectedReport.status === "PENDING" && (
                  <GlassButton 
                    className="flex-1 justify-center bg-blue-500/20 hover:bg-blue-500/30"
                    onClick={() => handleUpdateStatus("IN_PROGRESS")}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Proses
                  </GlassButton>
                )}
                {selectedReport.status !== "RESOLVED" && (
                  <GlassButton 
                    className="flex-1 justify-center bg-green-500/20 hover:bg-green-500/30 col-span-2"
                    onClick={() => handleUpdateStatus("RESOLVED")}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Selesaikan
                  </GlassButton>
                )}
              </div>

              <GlassButton 
                variant="secondary" 
                className="w-full justify-center" 
                onClick={() => setShowActionModal(false)}
              >
                Tutup
              </GlassButton>
            </div>
          )}
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
