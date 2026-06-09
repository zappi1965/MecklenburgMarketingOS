import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  loyaltyMembers,
  loyaltyPrograms,
  loyaltyRedemptions,
  qrScans,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgramForm } from "@/components/loyalty/program-form";
import { RedemptionConfirm } from "@/components/loyalty/redemption-confirm";
import { ToolGuard } from "@/components/shared/tool-guard";

export default async function LoyaltyPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "loyalty:read")) redirect("/dashboard");
  const tenantId = ctx.tenant.id;

  const [programs, scanCount, memberCount, pendingCount] = await Promise.all([
    db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.tenantId, tenantId)),
    db
      .select({ value: count() })
      .from(qrScans)
      .where(eq(qrScans.tenantId, tenantId)),
    db
      .select({ value: count() })
      .from(loyaltyMembers)
      .where(
        and(
          eq(loyaltyMembers.tenantId, tenantId),
          isNull(loyaltyMembers.deletedAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(loyaltyRedemptions)
      .where(
        and(
          eq(loyaltyRedemptions.tenantId, tenantId),
          eq(loyaltyRedemptions.status, "pending"),
        ),
      ),
  ]);

  const stats = [
    { label: "Scans gesamt", value: scanCount[0]?.value ?? 0 },
    { label: "Mitglieder", value: memberCount[0]?.value ?? 0 },
    { label: "Offene Einlösungen", value: pendingCount[0]?.value ?? 0 },
  ];

  return (
    <ToolGuard toolKey="loyalty" tenantId={tenantId}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loyalty</h1>
            <p className="text-sm text-muted-foreground">
              Programme, QR-Codes und Rewards von {ctx.tenant.name}.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/loyalty/rewards">
              <Button variant="outline" size="sm">
                Rewards
              </Button>
            </Link>
            <Link href="/dashboard/loyalty/members">
              <Button variant="outline" size="sm">
                Mitglieder
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-3xl">{s.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {can(ctx, "loyalty:operate") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reward einlösen (Kasse)</CardTitle>
              <CardDescription>
                Code des Kunden eingeben, um den Reward zu bestätigen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RedemptionConfirm />
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Programme</h2>
            {can(ctx, "loyalty:manage") && <ProgramForm />}
          </div>
          {programs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Noch keine Programme. Lege dein erstes Loyalty-Programm an.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {programs.map((p) => (
                <Link key={p.id} href={`/dashboard/loyalty/program/${p.id}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription>
                        {p.pointsPerScan} Punkt(e)/Scan
                        {p.stampsPerCard
                          ? ` · ${p.stampsPerCard} Stempel/Karte`
                          : ""}
                        {p.isActive ? "" : " · inaktiv"}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolGuard>
  );
}
