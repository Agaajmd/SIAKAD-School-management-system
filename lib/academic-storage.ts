import type { ActivityPoint, StudentGrade } from "@/lib/data-model"
const runtimeGrades: StudentGrade[] = []
const runtimeActivityPoints: ActivityPoint[] = []

export const getStoredStudentGrades = (): StudentGrade[] => {
  return [...runtimeGrades]
}

export const setStoredStudentGrades = (grades: StudentGrade[]) => {
  runtimeGrades.splice(0, runtimeGrades.length, ...grades)
}

export const getStoredGradesByStudent = (studentId: string): StudentGrade[] => {
  return getStoredStudentGrades().filter((grade) => grade.studentId === studentId)
}

export const getStoredGradesByTeacher = (teacherId: string): StudentGrade[] => {
  return getStoredStudentGrades().filter((grade) => grade.teacherId === teacherId)
}

export const getStoredActivityPoints = (): ActivityPoint[] => {
  return [...runtimeActivityPoints]
}

export const setStoredActivityPoints = (points: ActivityPoint[]) => {
  runtimeActivityPoints.splice(0, runtimeActivityPoints.length, ...points)
}

export const addStoredActivityPoint = (point: ActivityPoint) => {
  const currentPoints = getStoredActivityPoints()
  const nextPoints = [point, ...currentPoints]
  setStoredActivityPoints(nextPoints)
}

export const getStoredActivityPointsByStudent = (studentId: string): ActivityPoint[] => {
  return getStoredActivityPoints().filter((point) => point.studentId === studentId)
}
