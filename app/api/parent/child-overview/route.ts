import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbActivityPointsFromSheet } from "@/lib/server/google-sheets-activity-points"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbAttendance,
  getDbClasses,
  getDbGrades,
  getDbParents,
  getDbPayments,
  getDbSchedules,
} from "@/lib/server/persistent-store"

async function loadActivityPointsFromSheet() {
  try {
    return await getAllDbActivityPointsFromSheet()
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const users = await getAllDbUsers()
  const sessionUser = await getSessionUser()
  const parentUsers = users.filter((user) => user.role === "PARENT" && user.isActive)
  const parentId =
    url.searchParams.get("parentId") ||
    (sessionUser?.role === "PARENT" ? sessionUser.id : undefined) ||
    parentUsers[0]?.id

  const parentUser = parentUsers.find((user) => user.id === parentId) || parentUsers[0]
  if (!parentUser) {
    return NextResponse.json({ error: "Parent tidak ditemukan" }, { status: 404 })
  }

  const parentMap = getDbParents().find((item) => item.id === parentUser.id || item.email === parentUser.email) || null
  const studentUsers = users.filter((user) => user.role === "STUDENT" && user.isActive)
  const teacherUsers = users.filter((user) => user.role === "EMPLOYEE" && user.isActive)

  const childIds = parentMap?.childrenIds || []
  const children = studentUsers.filter((student) => childIds.includes(student.id))
  const selectedChildId = url.searchParams.get("childId") || children[0]?.id
  const selectedChild = children.find((child) => child.id === selectedChildId) || children[0] || null

  const childClass = selectedChild
    ? getDbClasses().find((classRoom) => classRoom.id === selectedChild.classId) || null
    : null
  const schedules = selectedChild
    ? getDbSchedules().filter((schedule) => schedule.classId === selectedChild.classId)
    : []
  const classmates = selectedChild
    ? studentUsers.filter((student) => student.classId === selectedChild.classId)
    : []
  const allActivityPoints = await loadActivityPointsFromSheet()
  const pointSummaryByStudentId = allActivityPoints.reduce((acc, point) => {
    const bucket = acc[point.studentId] || { positivePoints: 0, negativePoints: 0 }
    if (point.type === "NEGATIVE") {
      bucket.negativePoints += Math.abs(Number(point.points) || 0)
    } else {
      bucket.positivePoints += Math.abs(Number(point.points) || 0)
    }
    acc[point.studentId] = bucket
    return acc
  }, {} as Record<string, { positivePoints: number; negativePoints: number }>)

  const childrenWithPoints = children.map((child) => ({
    ...child,
    ...(pointSummaryByStudentId[child.id] || { positivePoints: 0, negativePoints: 0 }),
  }))

  const selectedChildWithPoints = selectedChild
    ? {
        ...selectedChild,
        ...(pointSummaryByStudentId[selectedChild.id] || { positivePoints: 0, negativePoints: 0 }),
      }
    : null

  const classmatesWithPoints = classmates.map((child) => ({
    ...child,
    ...(pointSummaryByStudentId[child.id] || { positivePoints: 0, negativePoints: 0 }),
  }))
  const grades = selectedChild ? getDbGrades().filter((grade) => grade.studentId === selectedChild.id) : []
  const teacherIds = [...new Set(grades.map((grade) => grade.teacherId))]
  const teachers = teacherUsers.filter((teacher) => teacherIds.includes(teacher.id))

  const attendance = selectedChild ? getDbAttendance().filter((item) => item.studentId === selectedChild.id) : []
  const activityPoints = selectedChild
    ? allActivityPoints.filter((item) => item.studentId === selectedChild.id)
    : []
  const payments = selectedChild ? getDbPayments().filter((item) => item.studentId === selectedChild.id) : []

  const parent = {
    id: parentUser.id,
    name: parentUser.name,
    email: parentUser.email,
    avatar: parentUser.avatar,
    role: "PARENT" as const,
    phone: parentUser.phone || parentMap?.phone || "",
    childrenIds: childIds,
  }

  return NextResponse.json({
    parent,
    children: childrenWithPoints,
    selectedChild: selectedChildWithPoints,
    childClass,
    schedules,
    classmates: classmatesWithPoints,
    teachers,
    grades,
    attendance,
    activityPoints,
    payments,
  })
}
