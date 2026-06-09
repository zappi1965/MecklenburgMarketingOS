import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { AuditLogViewer } from "@/components/shared/audit-log-viewer";

export default async function AuditPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "audit:read")) redirect("/dashboard/settings");

  const entries = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityTable: auditLog.entityTable,
      entityId: auditLog.entityId,
      actorId: auditLog.actorId,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.tenantId, ctx.tenant.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit-Log</h1>
        <p className="text-sm text-muted-foreground">
          Unveränderlicher Änderungsverlauf für {ctx.tenant.name}.
        </p>
      </div>
      <AuditLogViewer entries={entries} />
    </div>
  );
}
