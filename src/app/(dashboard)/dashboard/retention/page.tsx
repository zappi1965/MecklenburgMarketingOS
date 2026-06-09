import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { retentionCampaigns } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { ToolGuard } from "@/components/shared/tool-guard";
import { RetentionAdmin } from "@/components/retention/retention-admin";

export default async function RetentionPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "retention:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const campaigns = await db
    .select()
    .from(retentionCampaigns)
    .where(eq(retentionCampaigns.tenantId, tenantId))
    .orderBy(desc(retentionCampaigns.createdAt));

  return (
    <ToolGuard toolKey="retention" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rückholaktionen</h1>
          <p className="text-sm text-muted-foreground">
            Inaktive Kunden von {ctx.tenant.name} zurückgewinnen.
          </p>
        </div>
        <RetentionAdmin
          campaigns={campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            inactiveDays: c.inactiveDays,
            bonusPoints: c.bonusPoints,
            sendEmail: c.sendEmail,
            status: c.status,
            targetedCount: c.targetedCount,
            lastRunAt: c.lastRunAt,
          }))}
          canManage={can(ctx, "retention:manage")}
        />
      </div>
    </ToolGuard>
  );
}
