"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  consentRecords,
  loyaltyMembers,
  loyaltyRedemptions,
  loyaltyTransactions,
  qrScans,
  reviews,
  tenantMemberships,
  userProfiles,
} from "@/db/schema";
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

// =============================================================================
// DSGVO — DSAR export + deletion routines
// =============================================================================

const subjectSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail eingeben."),
});

export interface DsarExport {
  exportedAt: string;
  tenant: { id: string; name: string };
  subjectEmail: string;
  loyaltyMembers: unknown[];
  qrScans: unknown[];
  loyaltyTransactions: unknown[];
  loyaltyRedemptions: unknown[];
  reviews: unknown[];
  consentRecords: unknown[];
}

/**
 * DSGVO Art. 15 data subject access request: collects every record tied to a
 * subject's email within the current tenant. RBAC-gated on `dsar:export`.
 */
export async function dsarExport(
  input: z.input<typeof subjectSchema>,
): Promise<ActionResult<DsarExport>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "dsar:export");
  if (!guard.allowed) return err(guard.reason);

  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const email = parsed.data.email.toLowerCase();
  const tenantId = ctx.tenant.id;

  const members = await db
    .select()
    .from(loyaltyMembers)
    .where(
      and(eq(loyaltyMembers.tenantId, tenantId), eq(loyaltyMembers.email, email)),
    );
  const memberIds = members.map((m) => m.id);

  const [scans, txns, redemptions, subjectReviews, consents] =
    await Promise.all([
      memberIds.length
        ? db
            .select()
            .from(qrScans)
            .where(eq(qrScans.tenantId, tenantId))
            .then((rows) =>
              rows.filter((r) => r.memberId && memberIds.includes(r.memberId)),
            )
        : Promise.resolve([]),
      memberIds.length
        ? db
            .select()
            .from(loyaltyTransactions)
            .where(eq(loyaltyTransactions.tenantId, tenantId))
            .then((rows) => rows.filter((r) => memberIds.includes(r.memberId)))
        : Promise.resolve([]),
      memberIds.length
        ? db
            .select()
            .from(loyaltyRedemptions)
            .where(eq(loyaltyRedemptions.tenantId, tenantId))
            .then((rows) => rows.filter((r) => memberIds.includes(r.memberId)))
        : Promise.resolve([]),
      db
        .select()
        .from(reviews)
        .where(
          and(eq(reviews.tenantId, tenantId), eq(reviews.authorEmail, email)),
        ),
      db
        .select()
        .from(consentRecords)
        .where(
          and(
            eq(consentRecords.tenantId, tenantId),
            eq(consentRecords.subjectEmail, email),
          ),
        ),
    ]);

  await writeAuditLog({
    tenantId,
    actorId: ctx.userId,
    action: "insert",
    entityTable: "dsar_export",
    entityId: email,
    diff: { memberCount: members.length },
  });

  return ok({
    exportedAt: new Date().toISOString(),
    tenant: { id: tenantId, name: ctx.tenant.name },
    subjectEmail: email,
    loyaltyMembers: members,
    qrScans: scans,
    loyaltyTransactions: txns,
    loyaltyRedemptions: redemptions,
    reviews: subjectReviews,
    consentRecords: consents,
  });
}

/**
 * Soft-delete (DSGVO): flags a subject's loyalty members and reviews as deleted
 * without removing the immutable ledger. RBAC-gated on `dsar:export` (admins).
 */
export async function softDeleteSubject(
  input: z.input<typeof subjectSchema>,
): Promise<ActionResult<{ members: number; reviews: number }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "dsar:export");
  if (!guard.allowed) return err(guard.reason);

  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const email = parsed.data.email.toLowerCase();
  const tenantId = ctx.tenant.id;
  const now = new Date();

  const updatedMembers = await db
    .update(loyaltyMembers)
    .set({ deletedAt: now })
    .where(
      and(
        eq(loyaltyMembers.tenantId, tenantId),
        eq(loyaltyMembers.email, email),
        isNull(loyaltyMembers.deletedAt),
      ),
    )
    .returning({ id: loyaltyMembers.id });

  const updatedReviews = await db
    .update(reviews)
    .set({ deletedAt: now })
    .where(
      and(
        eq(reviews.tenantId, tenantId),
        eq(reviews.authorEmail, email),
        isNull(reviews.deletedAt),
      ),
    )
    .returning({ id: reviews.id });

  await writeAuditLog({
    tenantId,
    actorId: ctx.userId,
    action: "update",
    entityTable: "dsar_soft_delete",
    entityId: email,
    diff: { members: updatedMembers.length, reviews: updatedReviews.length },
  });

  revalidatePath("/dashboard/settings/privacy");
  return ok({ members: updatedMembers.length, reviews: updatedReviews.length });
}

/**
 * Hard-delete (DSGVO Art. 17): permanently removes a subject's personal rows.
 * Superadmin only — mirrors the RLS DELETE policy. Uses the privileged client.
 */
export async function hardDeleteSubject(
  input: z.input<typeof subjectSchema> & { tenantId?: string },
): Promise<ActionResult<{ members: number; reviews: number }>> {
  const ctx = await requireSession();
  if (!ctx.isSuperadmin) {
    return err("Nur Superadmins dürfen Daten endgültig löschen.");
  }
  const tenantId = input.tenantId ?? ctx.tenant?.id;
  if (!tenantId) return err("Kein Store-Kontext.");

  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const email = parsed.data.email.toLowerCase();

  const deletedReviews = await db
    .delete(reviews)
    .where(and(eq(reviews.tenantId, tenantId), eq(reviews.authorEmail, email)))
    .returning({ id: reviews.id });

  // Deleting members cascades to scans / transactions / redemptions via FKs.
  const deletedMembers = await db
    .delete(loyaltyMembers)
    .where(
      and(
        eq(loyaltyMembers.tenantId, tenantId),
        eq(loyaltyMembers.email, email),
      ),
    )
    .returning({ id: loyaltyMembers.id });

  await writeAuditLog({
    tenantId,
    actorId: ctx.userId,
    action: "delete",
    entityTable: "dsar_hard_delete",
    entityId: email,
    diff: { members: deletedMembers.length, reviews: deletedReviews.length },
  });

  revalidatePath("/dashboard/settings/privacy");
  return ok({ members: deletedMembers.length, reviews: deletedReviews.length });
}

export { ASSIGNABLE_ROLES };
