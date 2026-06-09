import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants, tenantTools } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { listInvoices } from "@/actions/billing";
import { BillingTools } from "@/components/shared/billing-tools";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/lib/tools";

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

  const invoicesResult = await listInvoices();
  const invoices = invoicesResult.ok ? invoicesResult.data : [];

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rechnungen</CardTitle>
          <CardDescription>
            Rechnungen werden von Stripe erstellt und automatisch per E-Mail
            versendet. Hier kannst du die PDFs herunterladen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Rechnungen.
            </p>
          ) : (
            <div className="divide-y">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {inv.number ?? inv.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.created * 1000).toLocaleDateString("de-DE")}{" "}
                      · {inv.status}
                    </p>
                  </div>
                  <span className="whitespace-nowrap">
                    {formatPrice(inv.amount)}
                  </span>
                  {inv.pdfUrl ? (
                    <a
                      href={inv.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      PDF
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
