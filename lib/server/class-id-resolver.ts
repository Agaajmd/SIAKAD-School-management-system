import type { ClassRoom } from "@/lib/data-model"

export interface ClassIdResolver {
  resolveClassId: (rawClassId?: string) => string
  sameClass: (left?: string, right?: string) => boolean
}

export function createClassIdResolver(classes: ClassRoom[]): ClassIdResolver {
  const classIdSet = new Set(classes.map((item) => item.id))
  const classNameToId = new Map(classes.map((item) => [item.name.trim().toLowerCase(), item.id]))

  const resolveClassId = (rawClassId?: string) => {
    const value = String(rawClassId || "").trim()
    if (!value) return ""
    if (classIdSet.has(value)) return value
    return classNameToId.get(value.toLowerCase()) || value
  }

  const sameClass = (left?: string, right?: string) => {
    const resolvedLeft = resolveClassId(left)
    const resolvedRight = resolveClassId(right)
    return Boolean(resolvedLeft) && resolvedLeft === resolvedRight
  }

  return {
    resolveClassId,
    sameClass,
  }
}
