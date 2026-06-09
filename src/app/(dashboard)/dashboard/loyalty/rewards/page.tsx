import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { loyaltyPrograms, loyaltyRewards } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { RewardManager } from "@/components/loyalty/reward-manager";

export default async function RewardsPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "loyalty:read")) redirect("/dashboard");

  const [programs, rewards] = await Promise.all([
    db
      .select({ id: loyaltyPrograms.id, name: loyaltyPrograms.name })
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.tenantId, ctx.tenant.id)),
    db
      .select()
      .from(loyaltyRewards)
      .where(eq(loyaltyRewards.tenantId, ctx.tenant.id)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/loyalty"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Loyalty
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Rewards</h1>
        <p className="text-sm text-muted-foreground">
          Reward-Katalog für {ctx.tenant.name}.
        </p>
      </div>
      <RewardManager
        programs={programs}
        rewards={rewards.map((r) => ({
          id: r.id,
          programId: r.programId,
          name: r.name,
          description: r.description,
          pointsCost: r.pointsCost,
          isActive: r.isActive,
        }))}
      />
    </div>
  );
}
