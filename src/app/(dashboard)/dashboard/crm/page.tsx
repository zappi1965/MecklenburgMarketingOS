import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { crmContacts, crmDeals } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { ToolGuard } from "@/components/shared/tool-guard";
import { CrmBoard } from "@/components/crm/crm-board";

export default async function CrmPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "crm:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const [contacts, deals] = await Promise.all([
    db
      .select()
      .from(crmContacts)
      .where(and(eq(crmContacts.tenantId, tenantId), isNull(crmContacts.deletedAt)))
      .orderBy(desc(crmContacts.createdAt))
      .limit(200),
    db
      .select({
        id: crmDeals.id,
        title: crmDeals.title,
        valueCents: crmDeals.valueCents,
        stage: crmDeals.stage,
        contactName: crmContacts.name,
      })
      .from(crmDeals)
      .leftJoin(crmContacts, eq(crmDeals.contactId, crmContacts.id))
      .where(and(eq(crmDeals.tenantId, tenantId), isNull(crmDeals.deletedAt)))
      .orderBy(desc(crmDeals.createdAt))
      .limit(300),
  ]);

  return (
    <ToolGuard toolKey="crm" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM & Leads</h1>
          <p className="text-sm text-muted-foreground">
            Kontakte und Deal-Pipeline für {ctx.tenant.name}.
          </p>
        </div>
        <CrmBoard
          contacts={contacts.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            company: c.company,
          }))}
          deals={deals.map((d) => ({
            id: d.id,
            title: d.title,
            valueCents: d.valueCents,
            stage: d.stage,
            contactName: d.contactName,
          }))}
          canManage={can(ctx, "crm:manage")}
        />
      </div>
    </ToolGuard>
  );
}
