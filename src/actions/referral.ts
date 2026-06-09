"use server";

import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  loyaltyMembers,
  loyaltyTransactions,
  referralCodes,
  referralPrograms,
  referrals,
  tenants,
  tenantTools,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { generateShortCode } from "@/lib/nanoid";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const TOOL_KEY = "referral";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function referralActive(tenantId: string): Promise<boolean> {
  const rows = await db
    .select({ status: tenantTools.status })
    .from(tenantTools)
    .where(
      and(eq(tenantTools.tenantId, tenantId), eq(tenantTools.toolKey, TOOL_KEY)),
    )
    .limit(1);
  const s = rows[0]?.status;
  return s === "active" || s === "trial";
}

// =============================================================================
// Admin: configure the program (referral:manage)
// =============================================================================

const programSchema = z.object({
  referrerBonus: z.coerce.number().int().min(0).max(100000),
  refereeBonus: z.coerce.number().int().min(0).max(100000),
  isActive: z.boolean().default(true),
});

export async function upsertReferralProgram(
  input: z.input<typeof programSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "referral:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = programSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [program] = await db
    .insert(referralPrograms)
    .values({
      tenantId: ctx.tenant.id,
      referrerBonus: parsed.data.referrerBonus,
      refereeBonus: parsed.data.refereeBonus,
      isActive: parsed.data.isActive,
    })
    .onConflictDoUpdate({
      target: referralPrograms.tenantId,
      set: {
        referrerBonus: parsed.data.referrerBonus,
        refereeBonus: parsed.data.refereeBonus,
        isActive: parsed.data.isActive,
      },
    })
    .returning({ id: referralPrograms.id });

  revalidatePath("/dashboard/referral");
  return ok({ id: program.id });
}

// =============================================================================
// Public: get a member's share link, view landing, claim
// =============================================================================

export async function getOrCreateReferralCode(
  memberId: string,
): Promise<ActionResult<{ code: string; url: string }>> {
  const memberRows = await db
    .select()
    .from(loyaltyMembers)
    .where(and(eq(loyaltyMembers.id, memberId), isNull(loyaltyMembers.deletedAt)))
    .limit(1);
  const member = memberRows[0];
  if (!member) return err("Mitglied nicht gefunden.");
  if (!(await referralActive(member.tenantId))) {
    return err("Empfehlungsprogramm ist nicht aktiv.");
  }

  const existing = await db
    .select({ code: referralCodes.code })
    .from(referralCodes)
    .where(eq(referralCodes.memberId, memberId))
    .limit(1);
  if (existing[0]) {
    return ok({ code: existing[0].code, url: `${appUrl()}/refer/${existing[0].code}` });
  }

  // Generate a unique code (retry on the rare collision).
  let code = generateShortCode(8);
  for (let i = 0; i < 5; i++) {
    const inserted = await db
      .insert(referralCodes)
      .values({ tenantId: member.tenantId, memberId, code })
      .onConflictDoNothing()
      .returning({ code: referralCodes.code });
    if (inserted[0]) {
      return ok({ code: inserted[0].code, url: `${appUrl()}/refer/${inserted[0].code}` });
    }
    // memberId unique conflict → a code was created concurrently; fetch it.
    const again = await db
      .select({ code: referralCodes.code })
      .from(referralCodes)
      .where(eq(referralCodes.memberId, memberId))
      .limit(1);
    if (again[0]) {
      return ok({ code: again[0].code, url: `${appUrl()}/refer/${again[0].code}` });
    }
    code = generateShortCode(8);
  }
  return err("Empfehlungslink konnte nicht erstellt werden.");
}

export type ReferralLanding = {
  tenantName: string;
  referrerBonus: number;
  refereeBonus: number;
};

export async function getReferralLanding(
  code: string,
): Promise<ActionResult<ReferralLanding>> {
  const rows = await db
    .select({ tenantId: referralCodes.tenantId })
    .from(referralCodes)
    .where(eq(referralCodes.code, code))
    .limit(1);
  if (!rows[0]) return err("Ungültiger Empfehlungslink.");
  const tenantId = rows[0].tenantId;

  if (!(await referralActive(tenantId))) {
    return err("Empfehlungsprogramm ist nicht aktiv.");
  }

  const [tenant, program] = await Promise.all([
    db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1),
    db
      .select()
      .from(referralPrograms)
      .where(eq(referralPrograms.tenantId, tenantId))
      .limit(1),
  ]);
  if (!program[0] || !program[0].isActive) {
    return err("Empfehlungsprogramm ist nicht aktiv.");
  }

  return ok({
    tenantName: tenant[0]?.name ?? "Store",
    referrerBonus: program[0].referrerBonus,
    refereeBonus: program[0].refereeBonus,
  });
}

const claimSchema = z.object({
  code: z.string().min(1),
  refereeMemberId: z.string().uuid().optional(),
});

export type ClaimResult = { refereeMemberId: string; refereeBonus: number; balance: number };

/**
 * Public referral claim. Credits the referee and the referrer with loyalty
 * points and records the referral. A customer can only be rewarded as a
 * referee once per tenant (enforced by a unique index + an explicit check).
 */
export async function claimReferral(
  input: z.input<typeof claimSchema>,
): Promise<ActionResult<ClaimResult>> {
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const codeRows = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.code, parsed.data.code))
    .limit(1);
  const codeRow = codeRows[0];
  if (!codeRow) return err("Ungültiger Empfehlungslink.");
  const tenantId = codeRow.tenantId;

  if (!(await referralActive(tenantId))) {
    return err("Empfehlungsprogramm ist nicht aktiv.");
  }

  const programRows = await db
    .select()
    .from(referralPrograms)
    .where(eq(referralPrograms.tenantId, tenantId))
    .limit(1);
  const program = programRows[0];
  if (!program || !program.isActive) return err("Empfehlungsprogramm ist nicht aktiv.");

  const referrerRows = await db
    .select()
    .from(loyaltyMembers)
    .where(and(eq(loyaltyMembers.id, codeRow.memberId), isNull(loyaltyMembers.deletedAt)))
    .limit(1);
  const referrer = referrerRows[0];
  if (!referrer) return err("Empfehlender nicht gefunden.");

  // Resolve the referee member.
  let refereeId = parsed.data.refereeMemberId;
  if (refereeId) {
    if (refereeId === referrer.id) {
      return err("Du kannst dich nicht selbst empfehlen.");
    }
    const ok2 = await db
      .select({ id: loyaltyMembers.id })
      .from(loyaltyMembers)
      .where(
        and(
          eq(loyaltyMembers.id, refereeId),
          eq(loyaltyMembers.tenantId, tenantId),
          isNull(loyaltyMembers.deletedAt),
        ),
      )
      .limit(1);
    if (!ok2[0]) refereeId = undefined;
  }
  if (!refereeId) {
    const [created] = await db
      .insert(loyaltyMembers)
      .values({
        tenantId,
        programId: referrer.programId,
        pointsBalance: 0,
      })
      .returning({ id: loyaltyMembers.id });
    refereeId = created.id;
  }

  // One reward per referee.
  const existing = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(
      and(eq(referrals.tenantId, tenantId), eq(referrals.refereeMemberId, refereeId)),
    )
    .limit(1);
  if (existing[0]) {
    return err("Dieser Kunde wurde bereits geworben.");
  }

  // Credit both sides via the loyalty ledger.
  await db.insert(loyaltyTransactions).values([
    {
      tenantId,
      memberId: referrer.id,
      type: "bonus",
      points: program.referrerBonus,
      reason: "Empfehlungsbonus (Werber)",
    },
    {
      tenantId,
      memberId: refereeId,
      type: "bonus",
      points: program.refereeBonus,
      reason: "Empfehlungsbonus (Neukunde)",
    },
  ]);
  await db
    .update(loyaltyMembers)
    .set({ pointsBalance: sql`${loyaltyMembers.pointsBalance} + ${program.referrerBonus}` })
    .where(eq(loyaltyMembers.id, referrer.id));
  const [updatedReferee] = await db
    .update(loyaltyMembers)
    .set({ pointsBalance: sql`${loyaltyMembers.pointsBalance} + ${program.refereeBonus}` })
    .where(eq(loyaltyMembers.id, refereeId))
    .returning({ balance: loyaltyMembers.pointsBalance });

  await db.insert(referrals).values({
    tenantId,
    referrerMemberId: referrer.id,
    refereeMemberId: refereeId,
    referrerBonus: program.referrerBonus,
    refereeBonus: program.refereeBonus,
  });

  await writeAuditLog({
    tenantId,
    actorId: null,
    action: "insert",
    entityTable: "referrals",
    entityId: refereeId,
    diff: { referrer: referrer.id, refereeBonus: program.refereeBonus },
  });

  return ok({
    refereeMemberId: refereeId,
    refereeBonus: program.refereeBonus,
    balance: updatedReferee.balance,
  });
}
