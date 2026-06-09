import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { loyaltyMembers } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { MemberTable } from "@/components/loyalty/member-table";

export default async function MembersPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "loyalty:read")) redirect("/dashboard");

  const members = await db
    .select({
      id: loyaltyMembers.id,
      displayName: loyaltyMembers.displayName,
      email: loyaltyMembers.email,
      pointsBalance: loyaltyMembers.pointsBalance,
      createdAt: loyaltyMembers.createdAt,
    })
    .from(loyaltyMembers)
    .where(
      and(
        eq(loyaltyMembers.tenantId, ctx.tenant.id),
        isNull(loyaltyMembers.deletedAt),
      ),
    )
    .orderBy(desc(loyaltyMembers.pointsBalance))
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/loyalty"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Loyalty
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Mitglieder</h1>
        <p className="text-sm text-muted-foreground">
          {members.length} Mitglied(er) · {ctx.tenant.name}
        </p>
      </div>
      <MemberTable members={members} canOperate={can(ctx, "loyalty:operate")} />
    </div>
  );
}
