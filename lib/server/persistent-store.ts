import "server-only"

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import type {
  ClassRoom,
  Employee,
  Order,
  Product,
  Student,
  Parent,
  Canteen,
  CanteenOwner,
  Schedule,
  Task,
  TaskSubmission,
  PiketSchedule,
  User,
  ActivityPoint,
  AttendanceRecord,
  StudentGrade,
  StudentPayment,
  WalletTopup,
} from "@/lib/data-model"

export interface StudentReport {
  id: string
  studentId: string
  assetId: string
  assetName: string
  damageType: string
  description: string
  imageUrl?: string
  status: "pending" | "in_progress" | "resolved"
  createdAt: string
  location: string
  assignedTo?: string
  resolvedAt?: string
  resolution?: string
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

type PersistedDb = {
  orders: Order[]
  products: Product[]
  activityPoints: ActivityPoint[]
  attendance: AttendanceRecord[]
  grades: StudentGrade[]
  payments: StudentPayment[]
  auditLogs: AuditLog[]
  teachers: Employee[]
  admins: User[]
  superAdmins: User[]
  schedules: Schedule[]
  piketSchedules: PiketSchedule[]
  tasks: Task[]
  taskSubmissions: TaskSubmission[]
  classes: ClassRoom[]
  studentReports: StudentReport[]
  students: Student[]
  parents: Parent[]
  canteens: Canteen[]
  canteenOwners: CanteenOwner[]
  walletTopups: WalletTopup[]
}

const STORE_DIR = path.join(process.cwd(), ".data")
const STORE_FILE = path.join(STORE_DIR, "persistent-store.json")

let dbCache: PersistedDb | null = null

const createEmptyDb = (): PersistedDb => ({
  orders: [],
  products: [],
  activityPoints: [],
  attendance: [],
  grades: [],
  payments: [],
  auditLogs: [],
  teachers: [],
  admins: [],
  superAdmins: [],
  schedules: [],
  piketSchedules: [],
  tasks: [],
  taskSubmissions: [],
  classes: [],
  studentReports: [],
  students: [],
  parents: [],
  canteens: [],
  canteenOwners: [],
  walletTopups: [],
})

function ensureStoreDir() {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true })
  }
}

function mergeWithDefaults(raw: Partial<PersistedDb> | null | undefined): PersistedDb {
  const empty = createEmptyDb()
  if (!raw || typeof raw !== "object") {
    return empty
  }

  return {
    ...empty,
    ...raw,
    orders: Array.isArray(raw.orders) ? raw.orders : empty.orders,
    products: Array.isArray(raw.products) ? raw.products : empty.products,
    activityPoints: Array.isArray(raw.activityPoints) ? raw.activityPoints : empty.activityPoints,
    attendance: Array.isArray(raw.attendance) ? raw.attendance : empty.attendance,
    grades: Array.isArray(raw.grades) ? raw.grades : empty.grades,
    payments: Array.isArray(raw.payments) ? raw.payments : empty.payments,
    auditLogs: Array.isArray(raw.auditLogs) ? raw.auditLogs : empty.auditLogs,
    teachers: Array.isArray(raw.teachers) ? raw.teachers : empty.teachers,
    admins: Array.isArray(raw.admins) ? raw.admins : empty.admins,
    superAdmins: Array.isArray(raw.superAdmins) ? raw.superAdmins : empty.superAdmins,
    schedules: Array.isArray(raw.schedules) ? raw.schedules : empty.schedules,
    piketSchedules: Array.isArray(raw.piketSchedules) ? raw.piketSchedules : empty.piketSchedules,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : empty.tasks,
    taskSubmissions: Array.isArray(raw.taskSubmissions) ? raw.taskSubmissions : empty.taskSubmissions,
    classes: Array.isArray(raw.classes) ? raw.classes : empty.classes,
    studentReports: Array.isArray(raw.studentReports) ? raw.studentReports : empty.studentReports,
    students: Array.isArray(raw.students) ? raw.students : empty.students,
    parents: Array.isArray(raw.parents) ? raw.parents : empty.parents,
    canteens: Array.isArray(raw.canteens) ? raw.canteens : empty.canteens,
    canteenOwners: Array.isArray(raw.canteenOwners) ? raw.canteenOwners : empty.canteenOwners,
    walletTopups: Array.isArray(raw.walletTopups) ? raw.walletTopups : empty.walletTopups,
  }
}

function loadDb(): PersistedDb {
  if (dbCache) {
    return dbCache
  }

  try {
    if (!existsSync(STORE_FILE)) {
      dbCache = createEmptyDb()
      return dbCache
    }

    const raw = readFileSync(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as Partial<PersistedDb>
    dbCache = mergeWithDefaults(parsed)
    return dbCache
  } catch {
    dbCache = createEmptyDb()
    return dbCache
  }
}

function persistDb(next: PersistedDb) {
  ensureStoreDir()
  dbCache = next
  writeFileSync(STORE_FILE, JSON.stringify(next), "utf8")
}

function readCollection<K extends keyof PersistedDb>(key: K): PersistedDb[K] {
  const db = loadDb()
  return db[key]
}

function writeCollection<K extends keyof PersistedDb>(key: K, value: PersistedDb[K]) {
  const current = loadDb()
  const next: PersistedDb = {
    ...current,
    [key]: value,
  }
  persistDb(next)
}

export const getDbOrders = () => readCollection("orders")
export const setDbOrders = (orders: Order[]) => {
  writeCollection("orders", orders)
}

export const getDbProducts = () => readCollection("products")
export const setDbProducts = (products: Product[]) => {
  writeCollection("products", products)
}

export const getDbActivityPoints = () => readCollection("activityPoints")
export const setDbActivityPoints = (activityPoints: ActivityPoint[]) => {
  writeCollection("activityPoints", activityPoints)
}

export const getDbAttendance = () => readCollection("attendance")
export const setDbAttendance = (attendance: AttendanceRecord[]) => {
  writeCollection("attendance", attendance)
}

export const getDbGrades = () => readCollection("grades")
export const setDbGrades = (grades: StudentGrade[]) => {
  writeCollection("grades", grades)
}

export const getDbPayments = () => readCollection("payments")

export const getDbAuditLogs = () => readCollection("auditLogs")
export const setDbAuditLogs = (auditLogs: AuditLog[]) => {
  writeCollection("auditLogs", auditLogs)
}

export const getDbTeachers = () => readCollection("teachers")
export const setDbTeachers = (teachers: Employee[]) => {
  writeCollection("teachers", teachers)
}

export const getDbAdmins = () => readCollection("admins")
export const setDbAdmins = (admins: User[]) => {
  writeCollection("admins", admins)
}

export const getDbSuperAdmins = () => readCollection("superAdmins")
export const setDbSuperAdmins = (superAdmins: User[]) => {
  writeCollection("superAdmins", superAdmins)
}

export const getDbSchedules = () => readCollection("schedules")
export const setDbSchedules = (schedules: Schedule[]) => {
  writeCollection("schedules", schedules)
}

export const getDbPiketSchedules = () => readCollection("piketSchedules")
export const setDbPiketSchedules = (piketSchedules: PiketSchedule[]) => {
  writeCollection("piketSchedules", piketSchedules)
}

export const getDbTasks = () => readCollection("tasks")
export const setDbTasks = (tasks: Task[]) => {
  writeCollection("tasks", tasks)
}

export const getDbTaskSubmissions = () => readCollection("taskSubmissions")
export const setDbTaskSubmissions = (taskSubmissions: TaskSubmission[]) => {
  writeCollection("taskSubmissions", taskSubmissions)
}

export const getDbClasses = () => readCollection("classes")
export const setDbClasses = (classes: ClassRoom[]) => {
  writeCollection("classes", classes)
}

export const getDbStudents = () => readCollection("students")
export const setDbStudents = (students: Student[]) => {
  writeCollection("students", students)
}

export const getDbParents = () => readCollection("parents")
export const setDbParents = (parents: Parent[]) => {
  writeCollection("parents", parents)
}

export const getDbCanteens = () => readCollection("canteens")
export const setDbCanteens = (canteens: Canteen[]) => {
  writeCollection("canteens", canteens)
}

export const getDbCanteenOwners = () => readCollection("canteenOwners")
export const setDbCanteenOwners = (canteenOwners: CanteenOwner[]) => {
  writeCollection("canteenOwners", canteenOwners)
}

export const getDbStudentReports = () => readCollection("studentReports")
export const setDbStudentReports = (studentReports: StudentReport[]) => {
  writeCollection("studentReports", studentReports)
}

export const getDbWalletTopups = () => readCollection("walletTopups")
export const setDbWalletTopups = (walletTopups: WalletTopup[]) => {
  writeCollection("walletTopups", walletTopups)
}
