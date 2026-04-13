"use client"

import { useState } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassTextarea } from "@/components/atoms/glass-textarea"
import { 
  mockEmployees, 
  mockTasks, 
  mockTaskSubmissions,
  mockClasses,
  mockStudents,
  Task,
  TaskSubmission
} from "@/lib/mock-data"
import { 
  ClipboardList, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Star,
  Save,
  X,
  Upload
} from "lucide-react"

export default function TeacherTasksPage() {
  const teacher = mockEmployees[0]
  const [tasks, setTasks] = useState<Task[]>([...mockTasks.filter(t => t.teacherId === teacher.id)])
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([...mockTaskSubmissions])
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false)
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null)

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    classId: "c1",
    dueDate: "",
    maxScore: 100,
  })

  const [gradeForm, setGradeForm] = useState({
    score: 0,
    feedback: "",
  })

  const handleOpenCreateTask = () => {
    setEditingTask(null)
    setTaskForm({
      title: "",
      description: "",
      classId: "c1",
      dueDate: "",
      maxScore: 100,
    })
    setShowTaskModal(true)
  }

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description,
      classId: task.classId,
      dueDate: task.dueDate,
      maxScore: task.maxScore,
    })
    setShowTaskModal(true)
  }

  const handleSaveTask = () => {
    if (!taskForm.title || !taskForm.description || !taskForm.dueDate) {
      toast.error("Judul, deskripsi, dan deadline wajib diisi")
      return
    }

    if (editingTask) {
      setTasks(tasks.map(t => 
        t.id === editingTask.id 
          ? { ...t, ...taskForm, subject: teacher.subject }
          : t
      ))
      toast.success("Tugas berhasil diperbarui")
    } else {
      const newTask: Task = {
        id: `t${Date.now()}`,
        ...taskForm,
        subject: teacher.subject,
        teacherId: teacher.id,
        createdAt: new Date().toISOString().split('T')[0],
      }
      setTasks([...tasks, newTask])
      toast.success("Tugas berhasil dibuat")
    }
    setShowTaskModal(false)
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId))
    toast.success("Tugas berhasil dihapus")
  }

  const handleViewSubmissions = (task: Task) => {
    setSelectedTask(task)
    setShowSubmissionsModal(true)
  }

  const handleOpenGrade = (submission: TaskSubmission) => {
    setSelectedSubmission(submission)
    setGradeForm({
      score: submission.score || 0,
      feedback: submission.feedback || "",
    })
    setShowGradeModal(true)
  }

  const handleSaveGrade = () => {
    if (!selectedSubmission) return

    setSubmissions(submissions.map(s => 
      s.id === selectedSubmission.id 
        ? { ...s, score: gradeForm.score, feedback: gradeForm.feedback, status: "GRADED" as const }
        : s
    ))
    toast.success("Nilai berhasil disimpan")
    setShowGradeModal(false)
  }

  const getSubmissionCount = (taskId: string) => {
    return submissions.filter(s => s.taskId === taskId).length
  }

  const getGradedCount = (taskId: string) => {
    return submissions.filter(s => s.taskId === taskId && s.status === "GRADED").length
  }

  const getStudentName = (studentId: string) => {
    return mockStudents.find(s => s.id === studentId)?.name || "Unknown"
  }

  const getClassName = (classId: string) => {
    return mockClasses.find(c => c.id === classId)?.name || "Unknown"
  }

  const getStudentCount = (classId: string) => {
    return mockStudents.filter(s => s.classId === classId).length
  }

  const taskSubmissions = selectedTask 
    ? submissions.filter(s => s.taskId === selectedTask.id)
    : []

  return (
    <>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Manajemen Tugas</h1>
            <p className="text-sm text-slate-500">Buat dan kelola tugas untuk siswa</p>
          </div>
          <GlassButton onClick={handleOpenCreateTask} className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4 mr-2" />
            Buat Tugas
          </GlassButton>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-4">
            <ClipboardList className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-slate-800">{tasks.length}</p>
            <p className="text-xs text-slate-500">Total Tugas</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <FileText className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-slate-800">
              {submissions.filter(s => tasks.some(t => t.id === s.taskId)).length}
            </p>
            <p className="text-xs text-slate-500">Pengumpulan</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-slate-800">
              {submissions.filter(s => s.status === "GRADED" && tasks.some(t => t.id === s.taskId)).length}
            </p>
            <p className="text-xs text-slate-500">Sudah Dinilai</p>
          </GlassCard>
        </div>

        {/* Task List */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Daftar Tugas</h2>

          {tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada tugas</p>
              <p className="text-sm mt-1">Klik "Buat Tugas" untuk membuat tugas baru</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => {
                const submissionCount = getSubmissionCount(task.id)
                const gradedCount = getGradedCount(task.id)
                const totalStudents = getStudentCount(task.classId)
                const isOverdue = new Date(task.dueDate) < new Date()

                return (
                  <div
                    key={task.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                            <ClipboardList className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-800">{task.title}</h3>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Calendar className="w-3 h-3" />
                                Deadline: {task.dueDate}
                              </span>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                {getClassName(task.classId)}
                              </span>
                              {isOverdue && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Overdue
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="mt-3 p-3 bg-slate-100 rounded-xl">
                          <div className="flex justify-between text-xs text-slate-600 mb-2">
                            <span>Pengumpulan: {submissionCount}/{totalStudents}</span>
                            <span>Dinilai: {gradedCount}/{submissionCount}</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                              style={{ width: `${(submissionCount / totalStudents) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <GlassButton
                          size="sm"
                          onClick={() => handleViewSubmissions(task)}
                          className="flex-1 sm:flex-none justify-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          <span className="sm:hidden">Lihat</span>
                        </GlassButton>
                        <GlassButton
                          size="sm"
                          onClick={() => handleOpenEditTask(task)}
                          className="justify-center"
                        >
                          <Edit className="w-4 h-4" />
                        </GlassButton>
                        <GlassButton
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteTask(task.id)}
                          className="justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </GlassButton>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>

        {/* Create/Edit Task Modal */}
        <GlassModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          title={editingTask ? "Edit Tugas" : "Buat Tugas Baru"}
          size="lg"
        >
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Judul Tugas</label>
              <GlassInput
                placeholder="Contoh: Tugas Matematika Bab 3"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Deskripsi</label>
              <GlassTextarea
                placeholder="Jelaskan detail tugas..."
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Kelas</label>
              <select
                value={taskForm.classId}
                onChange={(e) => setTaskForm({ ...taskForm, classId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {mockClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Deadline</label>
                <GlassInput
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nilai Maksimal</label>
                <GlassInput
                  type="number"
                  value={taskForm.maxScore}
                  onChange={(e) => setTaskForm({ ...taskForm, maxScore: parseInt(e.target.value) || 100 })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowTaskModal(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton
                className="flex-1 justify-center"
                onClick={handleSaveTask}
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        {/* View Submissions Modal */}
        <GlassModal
          isOpen={showSubmissionsModal}
          onClose={() => setShowSubmissionsModal(false)}
          title={selectedTask ? `Pengumpulan: ${selectedTask.title}` : "Pengumpulan"}
          size="lg"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {taskSubmissions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Belum ada pengumpulan</p>
              </div>
            ) : (
              taskSubmissions.map(submission => {
                const student = mockStudents.find(s => s.id === submission.studentId)
                return (
                  <div
                    key={submission.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={student?.avatar || "/placeholder.svg"}
                          alt={student?.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow"
                        />
                        <div>
                          <p className="font-medium text-slate-800">{student?.name}</p>
                          <p className="text-xs text-slate-500">
                            Dikumpulkan: {submission.submittedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {submission.status === "GRADED" ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            {submission.score}/{selectedTask?.maxScore}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            Belum dinilai
                          </span>
                        )}
                      </div>
                    </div>

                    {submission.attachmentName && (
                      <div className="mt-3 p-2.5 bg-white rounded-lg border border-slate-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-slate-600 flex-1 truncate">{submission.attachmentName}</span>
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                          <Download className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    )}

                    {submission.feedback && (
                      <p className="mt-2 text-sm text-slate-500 italic">"{submission.feedback}"</p>
                    )}

                    <GlassButton
                      size="sm"
                      className="w-full mt-3 justify-center"
                      onClick={() => handleOpenGrade(submission)}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      {submission.status === "GRADED" ? "Edit Nilai" : "Beri Nilai"}
                    </GlassButton>
                  </div>
                )
              })
            )}
          </div>
        </GlassModal>

        {/* Grade Modal */}
        <GlassModal
          isOpen={showGradeModal}
          onClose={() => setShowGradeModal(false)}
          title="Beri Nilai"
        >
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nilai</label>
              <div className="flex items-center gap-3">
                <GlassInput
                  type="number"
                  min={0}
                  max={selectedTask?.maxScore || 100}
                  value={gradeForm.score}
                  onChange={(e) => setGradeForm({ ...gradeForm, score: parseInt(e.target.value) || 0 })}
                  className="flex-1"
                />
                <span className="text-slate-500 font-medium">/ {selectedTask?.maxScore || 100}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Feedback (Opsional)</label>
              <GlassTextarea
                placeholder="Berikan komentar untuk siswa..."
                value={gradeForm.feedback}
                onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowGradeModal(false)}
              >
                Batal
              </GlassButton>
              <GlassButton
                className="flex-1 justify-center"
                onClick={handleSaveGrade}
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan Nilai
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      </div>
    </>
  )
}
