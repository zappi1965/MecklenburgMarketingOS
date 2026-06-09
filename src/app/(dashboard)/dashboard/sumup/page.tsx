import { redirect } from "next/navigation";
import { and, desc, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { sumupTransactions } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { formatPrice } from "@/lib/tools";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToolGuard } from "@/components/shared/tool-guard";
import { SumUpAdmin } from "@/components/sumup/sumup-admin";

export default async function SumUpPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "sumup:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const [txns, paidSum] = await Promise.all([
    db
      .select()
      .from(sumupTransactions)
      .where(eq(sumupTransactions.tenantId, tenantId))
      .orderBy(desc(sumupTransactions.createdAt))
      .limit(200),
    db
      .select({ total: sum(sumupTransactions.amountCents) })
      .from(sumupTransactions)
      .where(
        and(
          eq(sumupTransactions.tenantId, tenantId),
          eq(sumupTransactions.status, "paid"),
        ),
      ),
  ]);

  const revenue = Number(paidSum[0]?.total ?? 0);

  return (
    <ToolGuard toolKey="sumup" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            SumUp — Umsatz & Payments
          </h1>
          <p className="text-sm text-muted-foreground">
            Umsätze und Payment-Links für {ctx.tenant.name}.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Umsatz (bezahlt)</CardDescription>
              <CardTitle className="text-3xl">{formatPrice(revenue)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Transaktionen</CardDescription>
              <CardTitle className="text-3xl">{txns.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <SumUpAdmin
          transactions={txns.map((t) => ({
            id: t.id,
            reference: t.reference,
            amountCents: t.amountCents,
            description: t.description,
            status: t.status,
            source: t.source,
            createdAt: t.createdAt,
          }))}
          canManage={can(ctx, "sumup:manage")}
        />
      </div>
    </ToolGuard>
  );
}
