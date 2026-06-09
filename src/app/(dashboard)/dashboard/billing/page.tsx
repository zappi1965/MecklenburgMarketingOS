import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants, tenantTools } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { BillingTools } from "@/components/shared/billing-tools";

type ToolStatus =
  | "active"
  | "trial"
  | "past_due"
  | "cancelled"
  | "inactive";

export default async function BillingPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "billing:read")) redirect("/dashboard");

  const rows = await db
    .select({ toolKey: tenantTools.toolKey, status: tenantTools.status })
    .from(tenantTools)
    .where(eq(tenantTools.tenantId, ctx.tenant.id));

  const statuses: Record<string, ToolStatus | undefined> = {};
  for (const r of rows) statuses[r.toolKey] = r.status;

  const tenantRows = await db
    .select({ stripeCustomerId: tenants.stripeCustomerId })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenant.id))
    .limit(1);
  const hasCustomer = Boolean(tenantRows[0]?.stripeCustomerId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Tool-Pakete für {ctx.tenant.name} verwalten.
        </p>
      </div>
      <BillingTools
        statuses={statuses}
        canManage={can(ctx, "billing:manage")}
        hasCustomer={hasCustomer}
      />
    </div>
  );
}
