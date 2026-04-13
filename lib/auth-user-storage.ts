import type { UserRole } from "./data-model"

export interface StoredAuthUser {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  password: string
}

const runtimeAuthUsers: StoredAuthUser[] = []

export function getBaseAuthUsers() {
  return []
}

export function getStoredAuthUsers(): StoredAuthUser[] {
  return [...runtimeAuthUsers]
}

export function getAllAuthUsers() {
  return [...getBaseAuthUsers(), ...getStoredAuthUsers()]
}

export function upsertAuthUserCredential(user: StoredAuthUser) {
  const byId = runtimeAuthUsers.findIndex((item) => item.id === user.id)
  const byEmail = runtimeAuthUsers.findIndex((item) => item.email.toLowerCase() === user.email.toLowerCase())
  const index = byId >= 0 ? byId : byEmail

  if (index >= 0) {
    runtimeAuthUsers[index] = user
  } else {
    runtimeAuthUsers.push(user)
  }
}

export function removeAuthUserCredential(userId: string) {
  const index = runtimeAuthUsers.findIndex((item) => item.id === userId)
  if (index >= 0) {
    runtimeAuthUsers.splice(index, 1)
  }
}
