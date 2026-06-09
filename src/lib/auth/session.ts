import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { tenantMemberships, tenants, userProfiles } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

export type TenantRole = "owner" | "admin" | "staff" | "viewer";

export interface SessionContext {
  userId: string;
  email: string;
  isSuperadmin: boolean;
  /** First active tenant membership, or null if the user has no store yet. */
  tenant: {
    id: string;
    name: string;
    slug: string;
    role: TenantRole;
  } | null;
}

/**
 * Resolves the signed-in user and their primary tenant context.
 * Returns null when there is no authenticated session.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Ensure a profile row exists (defensive — normally created at signup).
  const profileRows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);
  const profile = profileRows[0];

  const membership = await db
    .select({
      tenantId: tenantMemberships.tenantId,
      role: tenantMemberships.role,
      name: tenants.name,
      slug: tenants.slug,
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
    .where(
      and(
        eq(tenantMemberships.userId, user.id),
        eq(tenantMemberships.isActive, true),
      ),
    )
    .orderBy(asc(tenantMemberships.createdAt))
    .limit(1);

  return {
    userId: user.id,
    email: user.email ?? profile?.email ?? "",
    isSuperadmin: profile?.isSuperadmin ?? false,
    tenant: membership[0]
      ? {
          id: membership[0].tenantId,
          name: membership[0].name,
          slug: membership[0].slug,
          role: membership[0].role,
        }
      : null,
  };
}

/** Like {@link getSessionContext} but redirects to /login when unauthenticated. */
export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Requires an authenticated user that belongs to a tenant. */
export async function requireTenant(): Promise<
  SessionContext & { tenant: NonNullable<SessionContext["tenant"]> }
> {
  const ctx = await requireSession();
  if (!ctx.tenant) redirect("/onboarding");
  return ctx as SessionContext & {
    tenant: NonNullable<SessionContext["tenant"]>;
  };
}

/** True for owner/admin roles (or superadmin). */
export function isTenantAdmin(ctx: SessionContext): boolean {
  return (
    ctx.isSuperadmin ||
    ctx.tenant?.role === "owner" ||
    ctx.tenant?.role === "admin"
  );
}
