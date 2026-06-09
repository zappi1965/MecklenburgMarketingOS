import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { referralPrograms, referrals } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToolGuard } from "@/components/shared/tool-guard";
import { ReferralAdmin } from "@/components/referral/referral-admin";

export default async function ReferralPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "referral:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const [programRows, referralCount, recent] = await Promise.all([
    db
      .select()
      .from(referralPrograms)
      .where(eq(referralPrograms.tenantId, tenantId))
      .limit(1),
    db
      .select({ value: count() })
      .from(referrals)
      .where(eq(referrals.tenantId, tenantId)),
    db
      .select()
      .from(referrals)
      .where(eq(referrals.tenantId, tenantId))
      .orderBy(desc(referrals.createdAt))
      .limit(20),
  ]);

  const program = programRows[0]
    ? {
        referrerBonus: programRows[0].referrerBonus,
        refereeBonus: programRows[0].refereeBonus,
        isActive: programRows[0].isActive,
      }
    : null;

  return (
    <ToolGuard toolKey="referral" tenantId={tenantId}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Empfehlungen</h1>
          <p className="text-sm text-muted-foreground">
            Kunden werben Kunden für {ctx.tenant.name}.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Empfehlungen gesamt</CardDescription>
              <CardTitle className="text-3xl">
                {referralCount[0]?.value ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {can(ctx, "referral:manage") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Programm konfigurieren</CardTitle>
              <CardDescription>
                Bonus-Punkte für Werber und geworbene Neukunden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReferralAdmin program={program} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Letzte Empfehlungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine.</p>
            ) : (
              recent.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-b pb-2 text-sm last:border-0 last:pb-0"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    #{r.refereeMemberId.slice(0, 8)}
                  </span>
                  <span className="text-muted-foreground">
                    +{r.referrerBonus}/+{r.refereeBonus} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString("de-DE")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </ToolGuard>
  );
}
