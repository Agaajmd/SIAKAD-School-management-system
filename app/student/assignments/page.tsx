"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { 
  mockStudents, 
  mockTasks, 
  mockTaskSubmissions,
  getTasksByClass,
  getSubmissionsByStudent,
  type Task,
  type TaskSubmission
} from "@/lib/mock-data"
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Upload,
  Calendar,
  BookOpen,
  ChevronRight,
  Paperclip
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type TabType = "pending" | "submitted" | "graded"

export default function StudentAssignmentsPage() {
  const student = mockStudents[0]
  const [activeTab, setActiveTab] = useState<TabType>("pending")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  // Get tasks for student's class
  const classTasks = getTasksByClass(student.classId || "c1")
  const studentSubmissions = getSubmissionsByStudent(student.id)

  // Categorize tasks
  const getTaskWithSubmission = (task: Task) => {
    const submission = studentSubmissions.find(s => s.taskId === task.id)
    return { task, submission }
  }

  const pendingTasks = classTasks.filter(task => {
    const submission = studentSubmissions.find(s => s.taskId === task.id)
    return !submission || submission.status === "PENDING"
  })

  const submittedTasks = classTasks.filter(task => {
    const submission = studentSubmissions.find(s => s.taskId === task.id)
    return submission && submission.status === "SUBMITTED"
  })

  const gradedTasks = classTasks.filter(task => {
    const submission = studentSubmissions.find(s => s.taskId === task.id)
    return submission && submission.status === "GRADED"
  })

  const getTaskList = () => {
    switch (activeTab) {
      case "pending": return pendingTasks
      case "submitted": return submittedTasks
      case "graded": return gradedTasks
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", { 
      day: "numeric", 
      month: "short", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const handleSubmit = () => {
    if (!uploadFile) {
      toast.error("Pilih file terlebih dahulu")
      return
    }
    // Simulate submission
    toast.success("Tugas berhasil dikumpulkan!", {
      description: `${selectedTask?.title} - ${uploadFile.name}`
    })
    setShowUploadModal(false)
    setUploadFile(null)
    setSelectedTask(null)
  }

  const tabs = [
    { id: "pending" as TabType, label: "Belum Dikerjakan", count: pendingTasks.length, icon: Clock },
    { id: "submitted" as TabType, label: "Dikumpulkan", count: submittedTasks.length, icon: Upload },
    { id: "graded" as TabType, label: "Dinilai", count: gradedTasks.length, icon: CheckCircle2 },
  ]

  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar}>
      <div className="max-w-2xl mx-auto space-y-5 px-1">
        {/* Header */}
        <div className="pb-2">
          <h1 className="text-xl font-bold text-slate-800">Tugas Saya</h1>
          <p className="text-slate-500 text-sm">Kelola dan kumpulkan tugas sekolah</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <tab.icon className="w-4 h-4" />
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
              <p className="text-slate-500">Tidak ada tugas</p>
            </GlassCard>
          ) : (
            getTaskList().map(task => {
              const { submission } = getTaskWithSubmission(task)
              const overdue = isOverdue(task.dueDate) && !submission
              
              return (
                <GlassCard 
                  key={task.id}
                  className={cn(
                    "cursor-pointer hover:shadow-md",
                    overdue && "border-red-200 bg-red-50/50"
                  )}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      activeTab === "graded" 
                        ? "bg-emerald-100 text-emerald-600"
                        : activeTab === "submitted"
                        ? "bg-blue-100 text-blue-600"
                        : overdue
                        ? "bg-red-100 text-red-500"
                        : "bg-slate-100 text-slate-600"
                    )}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-slate-800 truncate">{task.title}</h3>
                          <p className="text-sm text-slate-500">{task.subject}</p>
                        </div>
                        {submission?.status === "GRADED" && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg shrink-0">
                            {submission.score}/{task.maxScore}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={cn(
                          "flex items-center gap-1",
                          overdue ? "text-red-500" : "text-slate-400"
                        )}>
                          {overdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>
                </GlassCard>
              )
            })
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      <GlassModal
        isOpen={!!selectedTask && !showUploadModal}
        onClose={() => setSelectedTask(null)}
        title="Detail Tugas"
        size="lg"
      >
        {selectedTask && (
          <>
            <div className="space-y-4">
              <div>
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                  {selectedTask.subject}
                </span>
                <h3 className="text-xl font-bold text-slate-800 mt-2">{selectedTask.title}</h3>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span>Tenggat: {formatDate(selectedTask.dueDate)}</span>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">Deskripsi</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {selectedTask.description}
                </p>
              </div>
              
              {selectedTask.attachmentUrl && (
                <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                  <Paperclip className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-700">Lampiran Tugas</p>
                    <p className="text-xs text-blue-500">materi-tugas.pdf</p>
                  </div>
                </div>
              )}
              
              {/* Submission Status */}
              {(() => {
                const submission = studentSubmissions.find(s => s.taskId === selectedTask.id)
                if (submission?.status === "GRADED") {
                  return (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-emerald-700">Nilai</span>
                        <span className="text-2xl font-bold text-emerald-600">
                          {submission.score}/{selectedTask.maxScore}
                        </span>
                      </div>
                      {submission.feedback && (
                        <p className="text-sm text-emerald-600">{submission.feedback}</p>
                      )}
                    </div>
                  )
                }
                if (submission?.status === "SUBMITTED") {
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">Tugas Sudah Dikumpulkan</span>
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        Dikumpulkan pada {formatDate(submission.submittedAt)}
                      </p>
                    </div>
                  )
                }
                return null
              })()}
            </div>
            
            {/* Actions */}
            {!studentSubmissions.find(s => s.taskId === selectedTask.id) && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                <GlassButton
                  onClick={() => setShowUploadModal(true)}
                  className="w-full justify-center"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Kumpulkan Tugas
                </GlassButton>
              </div>
            )}
          </>
        )}
      </GlassModal>

      {/* Upload Modal */}
      <GlassModal
        isOpen={showUploadModal && !!selectedTask}
        onClose={() => setShowUploadModal(false)}
        title="Kumpulkan Tugas"
        size="md"
      >
        {selectedTask && (
          <>
            <p className="text-sm text-slate-500 mb-4">{selectedTask.title}</p>
            
            {/* Upload Area */}
            <label className="block border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
              <input
                type="file"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Paperclip className="w-5 h-5" />
                  <span className="font-medium">{uploadFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Klik untuk pilih file</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, DOC, atau gambar (maks 10MB)</p>
                </>
              )}
            </label>
            
            <div className="flex gap-3 mt-4">
              <GlassButton
                variant="secondary"
                onClick={() => setShowUploadModal(false)}
                className="flex-1 justify-center"
              >
                Batal
              </GlassButton>
              <GlassButton
                onClick={handleSubmit}
                className="flex-1 justify-center"
                disabled={!uploadFile}
              >
                Kirim
              </GlassButton>
            </div>
          </>
        )}
      </GlassModal>
    </DashboardLayout>
  )
}
