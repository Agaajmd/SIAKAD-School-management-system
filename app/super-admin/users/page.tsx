"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import {
  mockAdmins,
  mockStudents,
  mockEmployees,
  mockSuperAdmins,
  mockClasses,
  type User,
  type Student,
  type Employee,
} from "@/lib/mock-data"
import {
  Search,
  Filter,
  UserPlus,
  GraduationCap,
  Briefcase,
  Shield,
  Crown,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  AlertTriangle,
} from "lucide-react"

type UserType = "all" | "students" | "employees" | "admins"

export default function SuperAdminUsersPage() {
  const superAdmin = mockSuperAdmins[0]
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<UserType>("all")
  const [selectedUser, setSelectedUser] = useState<User | Student | Employee | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [students, setStudents] = useState([...mockStudents])
  const [employees, setEmployees] = useState([...mockEmployees])
  const [admins, setAdmins] = useState([...mockAdmins])

  const [newUser, setNewUser] = useState({
    type: "student" as "student" | "employee" | "admin",
    name: "",
    email: "",
    classId: "c1",
    subject: "",
  })

  const [editUser, setEditUser] = useState({
    id: "",
    type: "student" as "student" | "employee" | "admin",
    name: "",
    email: "",
    classId: "",
    subject: "",
  })

  const filters: { id: UserType; label: string; icon: typeof GraduationCap; count: number }[] = [
    {
      id: "all",
      label: "Semua",
      icon: Filter,
      count: students.length + employees.length + admins.length + mockSuperAdmins.length,
    },
    { id: "students", label: "Siswa", icon: GraduationCap, count: students.length },
    { id: "employees", label: "Guru", icon: Briefcase, count: employees.length },
    { id: "admins", label: "Admin", icon: Shield, count: admins.length + mockSuperAdmins.length },
  ]

  const getFilteredUsers = () => {
    let users: (User | Student | Employee)[] = []

    switch (selectedFilter) {
      case "students":
        users = students
        break
      case "employees":
        users = employees
        break
      case "admins":
        users = [...admins, ...mockSuperAdmins]
        break
      default:
        users = [...students, ...employees, ...admins, ...mockSuperAdmins]
    }

    if (searchQuery) {
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    return users
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "STUDENT":
        return <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
      case "EMPLOYEE":
        return <Briefcase className="w-3 h-3 sm:w-4 sm:h-4" />
      case "ADMIN":
        return <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
      case "SUPER_ADMIN":
        return <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
      default:
        return null
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "STUDENT":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30"
      case "EMPLOYEE":
        return "bg-green-500/20 text-green-300 border-green-500/30"
      case "ADMIN":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30"
      case "SUPER_ADMIN":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30"
    }
  }

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Nama dan email wajib diisi")
      return
    }

    if (newUser.type === "student") {
      const newStudent: Student = {
        id: `s${students.length + 10}`,
        name: newUser.name,
        email: newUser.email,
        avatar: "/placeholder.svg",
        role: "STUDENT",
        classId: newUser.classId,
        coins: 0,
        level: 1,
        xp: 0,
        streak: 0,
        paymentStatus: "UNPAID",
        behaviorScore: 100,
        attendance: "PRESENT",
        seatRow: 0,
        seatCol: 0,
      }
      setStudents([...students, newStudent])
    } else if (newUser.type === "employee") {
      const newEmployee: Employee = {
        id: `e${employees.length + 10}`,
        name: newUser.name,
        email: newUser.email,
        avatar: "/placeholder.svg",
        role: "EMPLOYEE",
        subject: newUser.subject || "General",
        rating: 4.5,
        classesCount: 0,
      }
      setEmployees([...employees, newEmployee])
    } else {
      const newAdmin: User = {
        id: `a${admins.length + 10}`,
        name: newUser.name,
        email: newUser.email,
        avatar: "/placeholder.svg",
        role: "ADMIN",
      }
      setAdmins([...admins, newAdmin])
    }

    toast.success("Pengguna berhasil ditambahkan")
    setShowAddModal(false)
    setNewUser({ type: "student", name: "", email: "", classId: "c1", subject: "" })
  }

  const openEditModal = (user: User | Student | Employee) => {
    const isStudent = user.role === "STUDENT"
    const isEmployee = user.role === "EMPLOYEE"
    
    setEditUser({
      id: user.id,
      type: isStudent ? "student" : isEmployee ? "employee" : "admin",
      name: user.name,
      email: user.email,
      classId: isStudent ? (user as Student).classId || "" : "",
      subject: isEmployee ? (user as Employee).subject : "",
    })
    setShowEditModal(true)
  }

  const handleEditUser = () => {
    if (!editUser.name || !editUser.email) {
      toast.error("Nama dan email wajib diisi")
      return
    }

    if (editUser.type === "student") {
      setStudents(students.map(s => 
        s.id === editUser.id 
          ? { ...s, name: editUser.name, email: editUser.email, classId: editUser.classId }
          : s
      ))
    } else if (editUser.type === "employee") {
      setEmployees(employees.map(e => 
        e.id === editUser.id 
          ? { ...e, name: editUser.name, email: editUser.email, subject: editUser.subject }
          : e
      ))
    } else {
      setAdmins(admins.map(a => 
        a.id === editUser.id 
          ? { ...a, name: editUser.name, email: editUser.email }
          : a
      ))
    }

    toast.success("Data pengguna berhasil diperbarui")
    setShowEditModal(false)
  }

  const handleDeleteUser = () => {
    if (!selectedUser) return

    if (selectedUser.role === "STUDENT") {
      setStudents(students.filter(s => s.id !== selectedUser.id))
    } else if (selectedUser.role === "EMPLOYEE") {
      setEmployees(employees.filter(e => e.id !== selectedUser.id))
    } else if (selectedUser.role === "ADMIN") {
      setAdmins(admins.filter(a => a.id !== selectedUser.id))
    }

    toast.success("Pengguna berhasil dihapus")
    setShowDeleteModal(false)
    setSelectedUser(null)
  }

  const users = getFilteredUsers()

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={superAdmin.name} userAvatar={superAdmin.avatar}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Manajemen Pengguna</h1>
            <p className="text-sm sm:text-base text-slate-500">Kelola semua pengguna sistem</p>
          </div>
          <GlassButton className="w-full sm:w-auto justify-center" onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Tambah Pengguna
          </GlassButton>
        </div>

        {/* Search */}
        <GlassCard>
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            <GlassInput
              placeholder="Cari pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-12 text-sm sm:text-base"
            />
          </div>
        </GlassCard>

        {/* Filters */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {filters.map((filter) => {
            const Icon = filter.icon
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  selectedFilter === filter.id
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{filter.label}</span>
                <span className="ml-1 px-1.5 sm:px-2 py-0.5 bg-white/20 rounded-full text-[10px] sm:text-xs">
                  {filter.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Users List */}
        <GlassCard>
          <div className="space-y-2 sm:space-y-3">
            {users.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <p className="text-sm sm:text-base text-slate-500">Tidak ada pengguna</p>
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={user.avatar || "/placeholder.svg"}
                      alt={user.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{user.name}</p>
                      <p className="text-xs sm:text-sm text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                    <span
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs border ${getRoleColor(user.role)}`}
                    >
                      {getRoleIcon(user.role)}
                      <span className="hidden xs:inline">{user.role.replace("_", " ")}</span>
                    </span>

                    {user.role !== "SUPER_ADMIN" && (
                      <div className="relative group">
                        <button className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                          <MoreVertical className="w-4 h-4 text-slate-600" />
                        </button>

                        <div className="absolute right-0 top-full mt-2 w-36 sm:w-40 py-2 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button
                            onClick={() => {
                              setSelectedUser(user)
                              setShowUserModal(true)
                            }}
                            className="flex items-center gap-2 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Lihat Detail
                          </button>
                          <button 
                            onClick={() => openEditModal(user)}
                            className="flex items-center gap-2 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Edit
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedUser(user)
                              setShowDeleteModal(true)
                            }}
                            className="flex items-center gap-2 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Add User Modal */}
        <GlassModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Pengguna Baru">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Tipe Pengguna</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: "student" as const, label: "Siswa", icon: GraduationCap },
                  { type: "employee" as const, label: "Guru", icon: Briefcase },
                  { type: "admin" as const, label: "Admin", icon: Shield },
                ].map(item => (
                  <button
                    key={item.type}
                    onClick={() => setNewUser({ ...newUser, type: item.type })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                      newUser.type === item.type
                        ? "bg-purple-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nama</label>
              <GlassInput
                placeholder="Nama lengkap"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
              <GlassInput
                type="email"
                placeholder="email@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>

            {newUser.type === "student" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Kelas</label>
                <select
                  value={newUser.classId}
                  onChange={(e) => setNewUser({ ...newUser, classId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                >
                  {mockClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {newUser.type === "employee" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Mata Pelajaran</label>
                <GlassInput
                  placeholder="Contoh: Matematika"
                  value={newUser.subject}
                  onChange={(e) => setNewUser({ ...newUser, subject: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowAddModal(false)}
              >
                Batal
              </GlassButton>
              <GlassButton
                className="flex-1 justify-center"
                onClick={handleAddUser}
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        {/* Edit User Modal */}
        <GlassModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Pengguna">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nama</label>
              <GlassInput
                placeholder="Nama lengkap"
                value={editUser.name}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
              <GlassInput
                type="email"
                placeholder="email@example.com"
                value={editUser.email}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
              />
            </div>

            {editUser.type === "student" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Kelas</label>
                <select
                  value={editUser.classId}
                  onChange={(e) => setEditUser({ ...editUser, classId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                >
                  {mockClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {editUser.type === "employee" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Mata Pelajaran</label>
                <GlassInput
                  placeholder="Contoh: Matematika"
                  value={editUser.subject}
                  onChange={(e) => setEditUser({ ...editUser, subject: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowEditModal(false)}
              >
                Batal
              </GlassButton>
              <GlassButton
                className="flex-1 justify-center"
                onClick={handleEditUser}
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        {/* Delete Modal */}
        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Pengguna">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-medium text-slate-800">Konfirmasi Penghapusan</p>
                <p className="text-sm text-slate-600">
                  Apakah Anda yakin ingin menghapus <strong className="text-red-600">{selectedUser?.name}</strong>?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowDeleteModal(false)}
              >
                Batal
              </GlassButton>
              <GlassButton
                variant="danger"
                className="flex-1 justify-center"
                onClick={handleDeleteUser}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        {/* User Detail Modal */}
        <GlassModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Detail Pengguna">
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src={selectedUser.avatar || "/placeholder.svg"}
                  alt={selectedUser.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{selectedUser.name}</h3>
                  <p className="text-sm text-slate-500 truncate">{selectedUser.email}</p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs border mt-2 ${getRoleColor(selectedUser.role)}`}
                  >
                    {getRoleIcon(selectedUser.role)}
                    {selectedUser.role.replace("_", " ")}
                  </span>
                </div>
              </div>

              {"coins" in selectedUser && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-400">Coins</p>
                    <p className="font-semibold text-slate-800 text-sm sm:text-base">{selectedUser.coins}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-400">Level</p>
                    <p className="font-semibold text-slate-800 text-sm sm:text-base">{selectedUser.level}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-400">Pembayaran</p>
                    <p
                      className={`font-semibold text-sm sm:text-base ${selectedUser.paymentStatus === "PAID" ? "text-green-600" : "text-red-600"}`}
                    >
                      {selectedUser.paymentStatus === "PAID" ? "Lunas" : "Belum"}
                    </p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-400">Skor Perilaku</p>
                    <p className="font-semibold text-slate-800 text-sm sm:text-base">{selectedUser.behaviorScore}</p>
                  </div>
                </div>
              )}

              {"subject" in selectedUser && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-400">Mata Pelajaran</p>
                    <p className="font-semibold text-slate-800 text-sm sm:text-base">{selectedUser.subject}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-400">Rating</p>
                    <p className="font-semibold text-slate-800 text-sm sm:text-base">{selectedUser.rating}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
