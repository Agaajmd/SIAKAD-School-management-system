import type { ClassRoom, Student } from "@/lib/data-model"

type SeatAssignableStudent = Student & { classId: string }

function toSeatKey(row: number, col: number) {
  return `${row}:${col}`
}

function isValidSeat(row: number, col: number, rows: number, cols: number) {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && col >= 0 && row < rows && col < cols
}

export function assignStudentSeatsToClasses(classes: ClassRoom[], students: SeatAssignableStudent[]) {
  const nextById = new Map<string, SeatAssignableStudent>()

  for (const classRoom of classes) {
    const classStudents = students.filter((student) => student.classId === classRoom.id)
    if (classStudents.length === 0) continue

    const rows = Math.max(Number(classRoom.rows || 0), 1)
    const cols = Math.max(Number(classRoom.cols || 0), 1)
    const occupied = new Set<string>()
    const pending = [...classStudents]

    for (const student of classStudents) {
      const row = Number(student.seatRow)
      const col = Number(student.seatCol)
      const seatKey = toSeatKey(row, col)
      if (isValidSeat(row, col, rows, cols) && !occupied.has(seatKey)) {
        nextById.set(student.id, { ...student, seatRow: row, seatCol: col })
        occupied.add(seatKey)
        const index = pending.findIndex((item) => item.id === student.id)
        if (index >= 0) pending.splice(index, 1)
      }
    }

    let seatIndex = 0
    const nextSeat = () => {
      while (seatIndex < rows * cols) {
        const row = Math.floor(seatIndex / cols)
        const col = seatIndex % cols
        seatIndex += 1
        const key = toSeatKey(row, col)
        if (!occupied.has(key)) {
          occupied.add(key)
          return { row, col }
        }
      }
      return null
    }

    for (const student of pending) {
      const seat = nextSeat()
      if (!seat) {
        nextById.set(student.id, student)
        continue
      }
      nextById.set(student.id, { ...student, seatRow: seat.row, seatCol: seat.col })
    }
  }

  return students.map((student) => nextById.get(student.id) || student)
}