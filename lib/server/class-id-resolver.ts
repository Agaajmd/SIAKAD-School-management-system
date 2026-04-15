import type { ClassRoom } from "@/lib/data-model"

export interface ClassIdResolver {
  resolveClassId: (rawClassId?: string) => string
  sameClass: (left?: string, right?: string) => boolean
}

export function createClassIdResolver(classes: ClassRoom[]): ClassIdResolver {
  const classIdSet = new Set(classes.map((item) => item.id))
  const classAliasToId = new Map<string, string>()

  for (const classItem of classes) {
    const aliases = [
      classItem.id,
      classItem.name,
      classItem.grade,
      `${classItem.name} ${classItem.grade}`,
      `${classItem.grade} ${classItem.name}`,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)

    for (const alias of aliases) {
      const normalized = alias.toLowerCase()
      const loose = normalized.replace(/[^a-z0-9]/g, "")
      classAliasToId.set(normalized, classItem.id)
      classAliasToId.set(loose, classItem.id)
    }
  }

  const resolveClassId = (rawClassId?: string) => {
    const value = String(rawClassId || "").trim()
    if (!value) return ""
    if (classIdSet.has(value)) return value

    const normalized = value.toLowerCase()
    const loose = normalized.replace(/[^a-z0-9]/g, "")
    return classAliasToId.get(normalized) || classAliasToId.get(loose) || value
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
