import { getDbAuditLogs, setDbAuditLogs, type AuditLog } from "@/lib/server/persistent-store"
import { appendDbAuditLogToSheet } from "@/lib/server/google-sheets-audit-logs"

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT"

interface LogAuditInput {
  actorId?: string
  action: AuditAction
  entityName: string
  entityId?: string
  oldValue?: unknown
  newValue?: unknown
}

export function logAudit(input: LogAuditInput): AuditLog {
  const logs = getDbAuditLogs()
  const entry: AuditLog = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actorId: input.actorId || "system",
    action: input.action,
    entityName: input.entityName,
    entityId: input.entityId || "-",
    oldValueJson: input.oldValue ? JSON.stringify(input.oldValue) : "",
    newValueJson: input.newValue ? JSON.stringify(input.newValue) : "",
    createdAt: new Date().toISOString(),
  }

  setDbAuditLogs([entry, ...logs])
  void appendDbAuditLogToSheet(entry).catch(() => {
    // Keep local audit logs as fallback if Sheets is unavailable.
  })
  return entry
}
