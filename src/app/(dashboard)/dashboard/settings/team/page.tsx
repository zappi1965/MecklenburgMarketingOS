import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenantMemberships, userProfiles } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { TeamManager } from "@/components/shared/team-manager";

export default async function TeamPage() {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  if (!can(ctx, "members:read")) redirect("/dashboard/settings");

  const members = await db
    .select({
      membershipId: tenantMemberships.id,
      userId: tenantMemberships.userId,
      role: tenantMemberships.role,
      isActive: tenantMemberships.isActive,
      email: userProfiles.email,
      fullName: userProfiles.fullName,
    })
    .from(tenantMemberships)
    .innerJoin(userProfiles, eq(tenantMemberships.userId, userProfiles.id))
    .where(eq(tenantMemberships.tenantId, ctx.tenant.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Mitglieder von {ctx.tenant.name} verwalten.
        </p>
      </div>
      <TeamManager
        members={members.filter((m) => m.isActive)}
        currentUserId={ctx.userId}
        canInvite={can(ctx, "members:invite")}
        canUpdateRole={can(ctx, "members:update_role")}
        canRemove={can(ctx, "members:remove")}
      />
    </div>
  );
}
