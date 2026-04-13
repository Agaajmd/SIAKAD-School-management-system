import {
  mockAdmins,
  mockOrders,
  mockClasses,
  mockEmployees,
  mockSuperAdmins,
  mockSchedule,
  mockTasks,
  mockTaskSubmissions,
  mockPiketSchedule,
  mockProducts,
  mockStudents,
  mockParents,
  mockCanteenOwners,
  mockCanteens,
  mockActivityPoints,
  mockAttendanceRecords,
  mockStudentGrades,
  mockStudentPayments,
  type ClassRoom,
  type Employee,
  type Order,
  type Product,
  type Student,
  type Parent,
  type Canteen,
  type CanteenOwner,
  type Schedule,
  type Task,
  type TaskSubmission,
  type PiketSchedule,
  type User,
  type ActivityPoint,
  type AttendanceRecord,
  type StudentGrade,
  type StudentPayment,
} from "@/lib/data-model"

export interface StudentReport {
  id: string
  studentId: string
  assetId: string
  assetName: string
  damageType: string
  description: string
  status: "pending" | "in_progress" | "resolved"
  createdAt: string
  location: string
}

export interface AuditLog {
  id: string
  actorId: string
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT"
  entityName: string
  entityId: string
  oldValueJson: string
  newValueJson: string
  createdAt: string
}

// Module-scoped memory store for API routes during dev/runtime.
const db = {
  orders: [...mockOrders] as Order[],
  products: [...mockProducts] as Product[],
  activityPoints: [...mockActivityPoints] as ActivityPoint[],
  attendance: [...mockAttendanceRecords] as AttendanceRecord[],
  grades: [...mockStudentGrades] as StudentGrade[],
  payments: [...mockStudentPayments] as StudentPayment[],
  auditLogs: [] as AuditLog[],
  teachers: [...mockEmployees] as Employee[],
  admins: [...mockAdmins] as User[],
  superAdmins: [...mockSuperAdmins] as User[],
  schedules: [...mockSchedule] as Schedule[],
  piketSchedules: [...mockPiketSchedule] as PiketSchedule[],
  tasks: [...mockTasks] as Task[],
  taskSubmissions: [...mockTaskSubmissions] as TaskSubmission[],
  classes: [...mockClasses] as ClassRoom[],
  studentReports: [] as StudentReport[],
  students: [...mockStudents] as Student[],
  parents: [...mockParents] as Parent[],
  canteens: [...mockCanteens] as Canteen[],
  canteenOwners: [...mockCanteenOwners] as CanteenOwner[],
}

export const getDbOrders = () => db.orders
export const setDbOrders = (orders: Order[]) => {
  db.orders = orders
}

export const getDbProducts = () => db.products
export const setDbProducts = (products: Product[]) => {
  db.products = products
}

export const getDbActivityPoints = () => db.activityPoints
export const setDbActivityPoints = (activityPoints: ActivityPoint[]) => {
  db.activityPoints = activityPoints
}

export const getDbAttendance = () => db.attendance
export const getDbGrades = () => db.grades
export const setDbGrades = (grades: StudentGrade[]) => {
  db.grades = grades
}

export const getDbPayments = () => db.payments

export const getDbAuditLogs = () => db.auditLogs
export const setDbAuditLogs = (auditLogs: AuditLog[]) => {
  db.auditLogs = auditLogs
}

export const getDbTeachers = () => db.teachers
export const setDbTeachers = (teachers: Employee[]) => {
  db.teachers = teachers
}

export const getDbAdmins = () => db.admins
export const setDbAdmins = (admins: User[]) => {
  db.admins = admins
}

export const getDbSuperAdmins = () => db.superAdmins
export const setDbSuperAdmins = (superAdmins: User[]) => {
  db.superAdmins = superAdmins
}
export const getDbSchedules = () => db.schedules
export const setDbSchedules = (schedules: Schedule[]) => {
  db.schedules = schedules
}
export const getDbPiketSchedules = () => db.piketSchedules
export const setDbPiketSchedules = (piketSchedules: PiketSchedule[]) => {
  db.piketSchedules = piketSchedules
}
export const getDbTasks = () => db.tasks
export const setDbTasks = (tasks: Task[]) => {
  db.tasks = tasks
}
export const getDbTaskSubmissions = () => db.taskSubmissions
export const setDbTaskSubmissions = (taskSubmissions: TaskSubmission[]) => {
  db.taskSubmissions = taskSubmissions
}
export const getDbClasses = () => db.classes
export const setDbClasses = (classes: ClassRoom[]) => {
  db.classes = classes
}

export const getDbStudents = () => db.students
export const setDbStudents = (students: Student[]) => {
  db.students = students
}

export const getDbParents = () => db.parents
export const setDbParents = (parents: Parent[]) => {
  db.parents = parents
}

export const getDbCanteens = () => db.canteens
export const setDbCanteens = (canteens: Canteen[]) => {
  db.canteens = canteens
}

export const getDbCanteenOwners = () => db.canteenOwners
export const setDbCanteenOwners = (canteenOwners: CanteenOwner[]) => {
  db.canteenOwners = canteenOwners
}

export const getDbStudentReports = () => db.studentReports
export const setDbStudentReports = (studentReports: StudentReport[]) => {
  db.studentReports = studentReports
}
