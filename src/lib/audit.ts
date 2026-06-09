import { db } from "@/db";
import { auditLog } from "@/db/schema";

type AuditAction = "insert" | "update" | "delete";

interface WriteAuditLogInput {
  tenantId: string;
  actorId: string | null;
  action: AuditAction;
  entityTable: string;
  entityId?: string | null;
  diff?: unknown;
}

/**
 * Central audit writer for application-level mutations that are not covered by
 * the database `audit_log_trigger` (e.g. membership changes, exports). Rows are
 * append-only — RLS forbids UPDATE/DELETE — so this is write-once.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  await db.insert(auditLog).values({
    tenantId: input.tenantId,
    actorId: input.actorId,
    action: input.action,
    entityTable: input.entityTable,
    entityId: input.entityId ?? null,
    diff: input.diff === undefined ? null : (input.diff as object),
  });
}
