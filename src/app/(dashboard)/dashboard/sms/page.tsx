import { redirect } from "next/navigation";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { smsCampaigns, smsContacts } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { ToolGuard } from "@/components/shared/tool-guard";
import { SmsAdmin } from "@/components/sms/sms-admin";

export default async function SmsPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "sms:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const [contactCount, campaigns] = await Promise.all([
    db
      .select({ value: count() })
      .from(smsContacts)
      .where(and(eq(smsContacts.tenantId, tenantId), isNull(smsContacts.deletedAt))),
    db
      .select()
      .from(smsCampaigns)
      .where(eq(smsCampaigns.tenantId, tenantId))
      .orderBy(desc(smsCampaigns.createdAt))
      .limit(50),
  ]);

  return (
    <ToolGuard toolKey="sms" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SMS-Marketing</h1>
          <p className="text-sm text-muted-foreground">
            SMS-Kampagnen für {ctx.tenant.name}.
          </p>
        </div>
        <SmsAdmin
          contactCount={contactCount[0]?.value ?? 0}
          campaigns={campaigns.map((c) => ({
            id: c.id,
            message: c.message,
            status: c.status,
            recipientCount: c.recipientCount,
            createdAt: c.createdAt,
          }))}
          canManage={can(ctx, "sms:manage")}
        />
      </div>
    </ToolGuard>
  );
}
