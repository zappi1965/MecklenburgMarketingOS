import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { automationFlows } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { ToolGuard } from "@/components/shared/tool-guard";
import { AutomationAdmin } from "@/components/automation/automation-admin";

export default async function AutomationPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "automation:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const flows = await db
    .select()
    .from(automationFlows)
    .where(eq(automationFlows.tenantId, tenantId))
    .orderBy(desc(automationFlows.createdAt));

  return (
    <ToolGuard toolKey="automation" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automation</h1>
          <p className="text-sm text-muted-foreground">
            Wenn-Dann-Flows für {ctx.tenant.name}.
          </p>
        </div>
        <AutomationAdmin
          flows={flows.map((f) => ({
            id: f.id,
            name: f.name,
            triggerType: f.triggerType,
            threshold: f.threshold,
            actionType: f.actionType,
            actionPoints: f.actionPoints,
            isActive: f.isActive,
            runCount: f.runCount,
            lastRunAt: f.lastRunAt,
          }))}
          canManage={can(ctx, "automation:manage")}
        />
      </div>
    </ToolGuard>
  );
}
