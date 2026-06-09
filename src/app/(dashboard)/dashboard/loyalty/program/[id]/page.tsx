import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { loyaltyCampaigns, loyaltyPrograms, qrCodes } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { qrDataUrl, scanUrl } from "@/lib/qr";
import { QrManager, type QrItem } from "@/components/loyalty/qr-manager";
import { CampaignManager } from "@/components/loyalty/campaign-manager";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "loyalty:read")) redirect("/dashboard");

  const programRows = await db
    .select()
    .from(loyaltyPrograms)
    .where(
      and(
        eq(loyaltyPrograms.id, id),
        eq(loyaltyPrograms.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  const program = programRows[0];
  if (!program) notFound();

  const [codes, campaigns] = await Promise.all([
    db.select().from(qrCodes).where(eq(qrCodes.programId, program.id)),
    db
      .select()
      .from(loyaltyCampaigns)
      .where(eq(loyaltyCampaigns.programId, program.id)),
  ]);

  const qrs: QrItem[] = await Promise.all(
    codes.map(async (c) => ({
      id: c.id,
      token: c.token,
      label: c.label,
      targetType: c.targetType,
      isActive: c.isActive,
      scanUrl: scanUrl(c.token),
      dataUrl: await qrDataUrl(c.token),
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/loyalty"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Loyalty
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {program.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {program.pointsPerScan} Punkt(e)/Scan
          {program.stampsPerCard
            ? ` · ${program.stampsPerCard} Stempel/Karte`
            : ""}{" "}
          · Cooldown {program.scanCooldownMinutes} Min.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">QR-Codes</h2>
        <QrManager
          programId={program.id}
          qrs={qrs}
          canManage={can(ctx, "loyalty:manage")}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Kampagnen</h2>
        <CampaignManager
          programId={program.id}
          campaigns={campaigns}
          canManage={can(ctx, "loyalty:manage")}
        />
      </section>
    </div>
  );
}
