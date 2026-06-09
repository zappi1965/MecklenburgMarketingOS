"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tenantMemberships, userProfiles } from "@/db/schema";
import {
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { checkPermission, ASSIGNABLE_ROLES } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const roleEnum = z.enum(["owner", "admin", "staff", "viewer"]);

const inviteSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail eingeben."),
  role: roleEnum,
});

/**
 * Invites a user to the current tenant with a role. Creates (or reuses) the
 * auth user via the service role, mirrors the profile, and adds an active
 * membership. RBAC-gated on `members:invite`.
 */
export async function inviteMember(
  input: z.input<typeof inviteSchema>,
): Promise<ActionResult<{ membershipId: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "members:invite");
  if (!guard.allowed) return err(guard.reason);

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const service = createSupabaseServiceClient();
  const email = parsed.data.email.toLowerCase();

  // Reuse an existing profile if the user already exists.
  const existingProfile = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.email, email))
    .limit(1);

  let userId: string;
  if (existingProfile[0]) {
    userId = existingProfile[0].id;
  } else {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? undefined;
    const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: appUrl ? `${appUrl}/login` : undefined,
    });
    if (error || !data.user) {
      return err("Einladung konnte nicht versendet werden.");
    }
    userId = data.user.id;
    await service.from("user_profiles").upsert(
      { id: userId, email },
      { onConflict: "id" },
    );
  }

  // Prevent duplicate memberships.
  const existingMembership = await db
    .select({ id: tenantMemberships.id })
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.tenantId, ctx.tenant.id),
        eq(tenantMemberships.userId, userId),
      ),
    )
    .limit(1);
  if (existingMembership[0]) {
    return err("Dieser Nutzer ist bereits Mitglied des Stores.");
  }

  const [membership] = await db
    .insert(tenantMemberships)
    .values({
      tenantId: ctx.tenant.id,
      userId,
      role: parsed.data.role,
      isActive: true,
    })
    .returning({ id: tenantMemberships.id });

  await writeAuditLog({
    tenantId: ctx.tenant.id,
    actorId: ctx.userId,
    action: "insert",
    entityTable: "tenant_memberships",
    entityId: membership.id,
    diff: { email, role: parsed.data.role },
  });

  revalidatePath("/dashboard/settings/team");
  return ok({ membershipId: membership.id });
}

const updateRoleSchema = z.object({
  membershipId: z.string().uuid(),
  role: roleEnum,
});

/** Changes a member's role. RBAC-gated on `members:update_role`. */
export async function updateMemberRole(
  input: z.input<typeof updateRoleSchema>,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "members:update_role");
  if (!guard.allowed) return err(guard.reason);

  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const rows = await db
    .select()
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.id, parsed.data.membershipId),
        eq(tenantMemberships.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  const target = rows[0];
  if (!target) return err("Mitglied nicht gefunden.");

  // Do not allow demoting the last owner.
  if (target.role === "owner" && parsed.data.role !== "owner") {
    const owners = await db
      .select({ id: tenantMemberships.id })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, ctx.tenant.id),
          eq(tenantMemberships.role, "owner"),
          eq(tenantMemberships.isActive, true),
        ),
      );
    if (owners.length <= 1) {
      return err("Der letzte Owner kann nicht herabgestuft werden.");
    }
  }

  await db
    .update(tenantMemberships)
    .set({ role: parsed.data.role })
    .where(eq(tenantMemberships.id, parsed.data.membershipId));

  await writeAuditLog({
    tenantId: ctx.tenant.id,
    actorId: ctx.userId,
    action: "update",
    entityTable: "tenant_memberships",
    entityId: parsed.data.membershipId,
    diff: { from: target.role, to: parsed.data.role },
  });

  revalidatePath("/dashboard/settings/team");
  return ok(undefined);
}

const removeSchema = z.object({ membershipId: z.string().uuid() });

/** Deactivates a membership (soft remove). RBAC-gated on `members:remove`. */
export async function removeMember(
  input: z.input<typeof removeSchema>,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "members:remove");
  if (!guard.allowed) return err(guard.reason);

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const rows = await db
    .select()
    .from(tenantMemberships)
    .where(
      and(
        eq(tenantMemberships.id, parsed.data.membershipId),
        eq(tenantMemberships.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  const target = rows[0];
  if (!target) return err("Mitglied nicht gefunden.");
  if (target.userId === ctx.userId) {
    return err("Du kannst dich nicht selbst entfernen.");
  }
  if (target.role === "owner") {
    const owners = await db
      .select({ id: tenantMemberships.id })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, ctx.tenant.id),
          eq(tenantMemberships.role, "owner"),
          eq(tenantMemberships.isActive, true),
        ),
      );
    if (owners.length <= 1) {
      return err("Der letzte Owner kann nicht entfernt werden.");
    }
  }

  await db
    .update(tenantMemberships)
    .set({ isActive: false })
    .where(eq(tenantMemberships.id, parsed.data.membershipId));

  await writeAuditLog({
    tenantId: ctx.tenant.id,
    actorId: ctx.userId,
    action: "delete",
    entityTable: "tenant_memberships",
    entityId: parsed.data.membershipId,
  });

  revalidatePath("/dashboard/settings/team");
  return ok(undefined);
}

export { ASSIGNABLE_ROLES };
