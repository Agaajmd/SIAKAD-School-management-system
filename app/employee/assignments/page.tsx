"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassModal } from "@/components/molecules/glass-modal"
import { 
  mockEmployees, 
  mockTasks, 
  mockTaskSubmissions,
  getTasksByTeacher,
  getSubmissionsByTask,
  mockClasses,
  type Task,
  type TaskSubmission
} from "@/lib/mock-data"
import { 
  FileText, 
  Plus,
  Clock, 
  CheckCircle2, 
  Users,
  Calendar,
  BookOpen,
  ChevronRight,
  X,
  Trash2,
  Edit3,
  Eye,
  Send
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type TabType = "active" | "past"

export default function EmployeeAssignmentsPage() {
  const employee = mockEmployees[0]
  const [activeTab, setActiveTab] = useState<TabType>("active")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: employee.subject,
    classId: "c1",
    dueDate: "",
    maxScore: 100
  })

  // Get tasks by this teacher
  const teacherTasks = getTasksByTeacher(employee.id)
  
  const now = new Date()
  const activeTasks = teacherTasks.filter(t => new Date(t.dueDate) >= now)
  const pastTasks = teacherTasks.filter(t => new Date(t.dueDate) < now)

  const getTaskList = () => activeTab === "active" ? activeTasks : pastTasks

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", { 
      day: "numeric", 
      month: "short", 
      year: "numeric"
    })
  }

  const getSubmissionStats = (taskId: string) => {
    const submissions = getSubmissionsByTask(taskId)
    const total = 30 // Assume 30 students in class
    const submitted = submissions.filter(s => s.status !== "PENDING").length
    const graded = submissions.filter(s => s.status === "GRADED").length
    return { submitted, graded, total }
  }

  const handleCreate = () => {
    if (!formData.title || !formData.description || !formData.dueDate) {
      toast.error("Harap isi semua field yang diperlukan")
      return
    }
    
    toast.success("Tugas berhasil dibuat!", {
      description: formData.title
    })
    setShowCreateModal(false)
    setFormData({
      title: "",
      description: "",
      subject: employee.subject,
      classId: "c1",
      dueDate: "",
      maxScore: 100
    })
  }

  const handleDelete = (task: Task) => {
    toast.success("Tugas berhasil dihapus", {
      description: task.title
    })
  }

  const handleViewSubmissions = (task: Task) => {
    setSelectedTask(task)
    setShowDetailModal(true)
  }

  const tabs = [
    { id: "active" as TabType, label: "Aktif", count: activeTasks.length },
    { id: "past" as TabType, label: "Selesai", count: pastTasks.length },
  ]

  return (
    <DashboardLayout role="EMPLOYEE" userName={employee.name} userAvatar={employee.avatar}>
      <div className="max-w-2xl mx-auto space-y-5 px-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Kelola Tugas</h1>
            <p className="text-slate-500 text-sm">Buat dan kelola tugas untuk siswa</p>
          </div>
          <GlassButton onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Buat Tugas
          </GlassButton>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              {tab.label}
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs",
                activeTab === tab.id ? "bg-white/20" : "bg-slate-100"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {getTaskList().length === 0 ? (
            <GlassCard className="text-center py-8">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Belum ada tugas</p>
              <GlassButton 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCreateModal(true)}
                className="mt-3"
              >
                <Plus className="w-4 h-4 mr-1" />
                Buat Tugas Pertama
              </GlassButton>
            </GlassCard>
          ) : (
            getTaskList().map(task => {
              const stats = getSubmissionStats(task.id)
              const className = mockClasses.find(c => c.id === task.classId)?.name || "Unknown"
              
              return (
                <GlassCard key={task.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-slate-800">{task.title}</h3>
                          <p className="text-sm text-slate-500">{task.subject} • {className}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(task.dueDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {stats.submitted}/{stats.total} dikumpulkan
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {stats.graded} dinilai
                        </span>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleViewSubmissions(task)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Submission
                        </button>
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(task)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )
            })
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      <GlassModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        title="Buat Tugas Baru"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Judul Tugas</label>
            <input
              type="text"
              placeholder="Contoh: Tugas Matematika Bab 5"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Deskripsi</label>
            <textarea
              placeholder="Jelaskan detail tugas..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[100px] resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Kelas</label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({...formData, classId: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {mockClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nilai Maksimal</label>
              <input
                type="number"
                value={formData.maxScore}
                onChange={(e) => setFormData({...formData, maxScore: parseInt(e.target.value)})}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tenggat Waktu</label>
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Buat Tugas
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Submissions Detail Modal */}
      <GlassModal 
        isOpen={showDetailModal && !!selectedTask} 
        onClose={() => setShowDetailModal(false)} 
        title="Submission"
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="font-medium text-slate-800">{selectedTask.title}</p>
              <p className="text-sm text-slate-500 mt-1">{selectedTask.subject}</p>
            </div>
            
            <div className="space-y-3">
              {(() => {
                const submissions = getSubmissionsByTask(selectedTask.id)
                if (submissions.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Belum ada yang mengumpulkan</p>
                    </div>
                  )
                }
                return submissions.map(sub => (
                  <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <img
                      src="/placeholder.svg?height=40&width=40&query=student"
                      alt="Student"
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">Siswa {sub.studentId}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(sub.submittedAt)}
                      </p>
                    </div>
                    {sub.status === "GRADED" ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">
                        {sub.score}/{selectedTask.maxScore}
                      </span>
                    ) : (
                      <button className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors">
                        Nilai
                      </button>
                    )}
                  </div>
                ))
              })()}
            </div>
          </div>
        )}
      </GlassModal>
    </DashboardLayout>
  )
}
