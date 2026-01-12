"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { 
  mockEmployees, 
  mockClasses,
  mockStudents,
} from "@/lib/mock-data"
import { 
  LayoutGrid, 
  Save,
  RotateCcw,
  Users,
  Grid3X3,
  Maximize2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X,
  Shuffle,
  Eye,
  Edit3,
  ChevronDown
} from "lucide-react"

interface SeatPosition {
  studentId: string | null
  row: number
  col: number
}

export default function TeacherClassLayoutPage() {
  const teacher = mockEmployees[0]
  const homeroomClass = mockClasses.find(c => c.id === teacher.homeroomClassId)
  const classStudents = mockStudents.filter(s => s.classId === teacher.homeroomClassId)

  // Default 5 rows, 6 columns
  const [rows, setRows] = useState(5)
  const [cols, setCols] = useState(6)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  // Initialize seats with students
  const initializeSeats = () => {
    const seats: SeatPosition[] = []
    let studentIndex = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        seats.push({
          studentId: studentIndex < classStudents.length ? classStudents[studentIndex].id : null,
          row: r,
          col: c,
        })
        studentIndex++
      }
    }
    return seats
  }

  const [seats, setSeats] = useState<SeatPosition[]>(initializeSeats())
  const [selectedSeat, setSelectedSeat] = useState<SeatPosition | null>(null)
  const [showStudentPicker, setShowStudentPicker] = useState(false)

  const getStudent = (studentId: string | null) => {
    if (!studentId) return null
    return classStudents.find(s => s.id === studentId)
  }

  const getAssignedStudentIds = () => {
    return seats.filter(s => s.studentId !== null).map(s => s.studentId)
  }

  const getUnassignedStudents = () => {
    const assigned = getAssignedStudentIds()
    return classStudents.filter(s => !assigned.includes(s.id))
  }

  const handleSeatClick = (seat: SeatPosition) => {
    if (!isEditMode) return
    setSelectedSeat(seat)
    setShowStudentPicker(true)
  }

  const handleAssignStudent = (studentId: string | null) => {
    if (!selectedSeat) return

    // If selecting a student already assigned elsewhere, swap seats
    if (studentId) {
      const existingSeat = seats.find(s => s.studentId === studentId)
      if (existingSeat) {
        setSeats(seats.map(s => {
          if (s.row === existingSeat.row && s.col === existingSeat.col) {
            return { ...s, studentId: selectedSeat.studentId }
          }
          if (s.row === selectedSeat.row && s.col === selectedSeat.col) {
            return { ...s, studentId: studentId }
          }
          return s
        }))
        toast.success("Posisi siswa ditukar")
        setShowStudentPicker(false)
        setSelectedSeat(null)
        return
      }
    }

    setSeats(seats.map(s => 
      s.row === selectedSeat.row && s.col === selectedSeat.col
        ? { ...s, studentId: studentId }
        : s
    ))
    setShowStudentPicker(false)
    setSelectedSeat(null)
    if (studentId) {
      toast.success("Siswa berhasil ditempatkan")
    } else {
      toast.success("Bangku dikosongkan")
    }
  }

  const handleShuffle = () => {
    const shuffled = [...classStudents].sort(() => Math.random() - 0.5)
    const newSeats: SeatPosition[] = []
    let studentIndex = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newSeats.push({
          studentId: studentIndex < shuffled.length ? shuffled[studentIndex].id : null,
          row: r,
          col: c,
        })
        studentIndex++
      }
    }
    setSeats(newSeats)
    toast.success("Posisi duduk diacak!")
  }

  const handleReset = () => {
    setSeats(initializeSeats())
    toast.success("Layout direset ke posisi awal")
  }

  const handleSaveLayout = () => {
    // In a real app, this would save to backend
    toast.success("Layout bangku berhasil disimpan!")
    setIsEditMode(false)
  }

  const handleUpdateGrid = (newRows: number, newCols: number) => {
    const newSeats: SeatPosition[] = []
    let studentIndex = 0
    const assignedStudents = seats
      .filter(s => s.studentId !== null)
      .map(s => s.studentId)

    for (let r = 0; r < newRows; r++) {
      for (let c = 0; c < newCols; c++) {
        newSeats.push({
          studentId: studentIndex < assignedStudents.length ? assignedStudents[studentIndex] : null,
          row: r,
          col: c,
        })
        studentIndex++
      }
    }
    
    setRows(newRows)
    setCols(newCols)
    setSeats(newSeats)
    setShowSettingsModal(false)
    toast.success("Ukuran layout diperbarui")
  }

  const assignedCount = seats.filter(s => s.studentId !== null).length

  return (
    <DashboardLayout role="EMPLOYEE" userName={teacher.name} userAvatar={teacher.avatar}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Layout Kelas</h1>
            <p className="text-sm text-white/60">
              {homeroomClass ? `Denah Bangku ${homeroomClass.name}` : "Kelola denah bangku siswa"}
            </p>
          </div>
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <GlassButton variant="secondary" size="sm" onClick={() => setIsEditMode(false)}>
                  <X className="w-4 h-4 mr-1" />
                  Batal
                </GlassButton>
                <GlassButton size="sm" onClick={handleSaveLayout}>
                  <Save className="w-4 h-4 mr-1" />
                  Simpan
                </GlassButton>
              </>
            ) : (
              <GlassButton onClick={() => setIsEditMode(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Layout
              </GlassButton>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-4">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-bold text-white">{classStudents.length}</p>
            <p className="text-xs text-white/60">Total Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <Grid3X3 className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold text-white">{rows * cols}</p>
            <p className="text-xs text-white/60">Total Bangku</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <Maximize2 className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-2xl font-bold text-white">{assignedCount}</p>
            <p className="text-xs text-white/60">Terisi</p>
          </GlassCard>
        </div>

        {/* Toolbar (only in edit mode) */}
        {isEditMode && (
          <GlassCard>
            <div className="flex flex-wrap gap-2">
              <GlassButton size="sm" variant="secondary" onClick={handleShuffle}>
                <Shuffle className="w-4 h-4 mr-1" />
                Acak
              </GlassButton>
              <GlassButton size="sm" variant="secondary" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </GlassButton>
              <GlassButton size="sm" variant="secondary" onClick={() => setShowSettingsModal(true)}>
                <Grid3X3 className="w-4 h-4 mr-1" />
                Ubah Ukuran ({rows}×{cols})
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* Class Layout */}
        <GlassCard>
          {/* Teacher's Desk */}
          <div className="mb-6 text-center">
            <div className="inline-block px-8 py-3 bg-purple-500/20 border border-purple-500/30 rounded-xl">
              <p className="text-sm font-medium text-purple-300">Meja Guru</p>
            </div>
          </div>

          {/* Seat Grid */}
          <div className="overflow-x-auto pb-4">
            <div 
              className="grid gap-2 mx-auto"
              style={{ 
                gridTemplateColumns: `repeat(${cols}, minmax(70px, 1fr))`,
                maxWidth: `${cols * 80}px`
              }}
            >
              {Array.from({ length: rows }).map((_, rowIndex) => (
                Array.from({ length: cols }).map((_, colIndex) => {
                  const seat = seats.find(s => s.row === rowIndex && s.col === colIndex)
                  const student = seat ? getStudent(seat.studentId) : null
                  const isSelected = selectedSeat?.row === rowIndex && selectedSeat?.col === colIndex

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => seat && handleSeatClick(seat)}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 transition-all ${
                        student 
                          ? 'bg-blue-500/20 border-2 border-blue-500/30' 
                          : 'bg-white/5 border-2 border-dashed border-white/10'
                      } ${
                        isEditMode 
                          ? 'cursor-pointer hover:border-purple-500/50 hover:bg-white/10' 
                          : ''
                      } ${
                        isSelected ? 'ring-2 ring-purple-500' : ''
                      }`}
                    >
                      {student ? (
                        <>
                          <img
                            src={student.avatar}
                            alt={student.name}
                            className="w-8 h-8 rounded-full object-cover border border-white/20"
                          />
                          <p className="text-[9px] text-white/80 text-center mt-1 line-clamp-1 px-1">
                            {student.name.split(' ')[0]}
                          </p>
                        </>
                      ) : (
                        <span className="text-[10px] text-white/30">Kosong</span>
                      )}
                    </div>
                  )
                })
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500/20 border border-blue-500/30" />
              <span className="text-xs text-white/60">Terisi</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white/5 border border-dashed border-white/20" />
              <span className="text-xs text-white/60">Kosong</span>
            </div>
          </div>
        </GlassCard>

        {/* Unassigned Students */}
        {getUnassignedStudents().length > 0 && (
          <GlassCard className="border-yellow-500/30 bg-yellow-500/5">
            <h3 className="font-medium text-yellow-200 mb-3">
              Siswa Belum Ditempatkan ({getUnassignedStudents().length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {getUnassignedStudents().map(student => (
                <div
                  key={student.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg"
                >
                  <img
                    src={student.avatar}
                    alt={student.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-sm text-white/80">{student.name}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Student Picker Modal */}
        <GlassModal
          isOpen={showStudentPicker}
          onClose={() => {
            setShowStudentPicker(false)
            setSelectedSeat(null)
          }}
          title="Pilih Siswa"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Pilih siswa untuk bangku baris {(selectedSeat?.row || 0) + 1}, kolom {(selectedSeat?.col || 0) + 1}
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {/* Option to empty seat */}
              <button
                onClick={() => handleAssignStudent(null)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 transition-colors text-left border border-red-200"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-sm font-medium text-red-600">Kosongkan Bangku</span>
              </button>

              {/* All students */}
              {classStudents.map(student => {
                const isAssigned = getAssignedStudentIds().includes(student.id)
                const isCurrentSeat = selectedSeat && seats.find(s => 
                  s.row === selectedSeat.row && s.col === selectedSeat.col
                )?.studentId === student.id

                return (
                  <button
                    key={student.id}
                    onClick={() => handleAssignStudent(student.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left border ${
                      isCurrentSeat
                        ? 'bg-blue-50 border-blue-500 shadow-sm'
                        : isAssigned
                        ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700">{student.name}</span>
                      {isAssigned && !isCurrentSeat && (
                        <p className="text-xs text-amber-600">Sudah ada di bangku lain (tukar)</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </GlassModal>

        {/* Grid Settings Modal */}
        <GlassModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          title="Ubah Ukuran Layout"
        >
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Jumlah Baris</label>
              <div className="flex gap-2">
                {[3, 4, 5, 6, 7].map(r => (
                  <button
                    key={r}
                    onClick={() => setRows(r)}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                      rows === r
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Jumlah Kolom</label>
              <div className="flex gap-2">
                {[4, 5, 6, 7, 8].map(c => (
                  <button
                    key={c}
                    onClick={() => setCols(c)}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                      cols === c
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm text-slate-600">
                Layout: <span className="text-slate-800 font-semibold">{rows} × {cols} = {rows * cols} bangku</span>
              </p>
              {rows * cols < classStudents.length && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  ⚠️ Jumlah bangku kurang dari jumlah siswa ({classStudents.length})
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowSettingsModal(false)}
              >
                Batal
              </GlassButton>
              <GlassButton
                className="flex-1 justify-center"
                onClick={() => handleUpdateGrid(rows, cols)}
              >
                <Save className="w-4 h-4 mr-2" />
                Terapkan
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
