"use server";

import { z } from "zod";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  loyaltyMembers,
  loyaltyPrograms,
  loyaltyRedemptions,
  loyaltyRewards,
  loyaltyTransactions,
  qrCodes,
  qrScans,
  tenantTools,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { generateShortCode, generateToken } from "@/lib/nanoid";
import { hashIp } from "@/lib/consent";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const TOOL_KEY = "loyalty";
const REDEEM_TTL_MS = 1000 * 60 * 60 * 24; // 24h to redeem at the counter

/** True when the tenant currently has the loyalty tool active or in trial. */
async function loyaltyActive(tenantId: string): Promise<boolean> {
  const rows = await db
    .select({ status: tenantTools.status })
    .from(tenantTools)
    .where(
      and(eq(tenantTools.tenantId, tenantId), eq(tenantTools.toolKey, TOOL_KEY)),
    )
    .limit(1);
  const status = rows[0]?.status;
  return status === "active" || status === "trial";
}

// =============================================================================
// Admin actions (RBAC loyalty:manage)
// =============================================================================

const programSchema = z.object({
  name: z.string().min(2, "Bitte einen Namen eingeben.").max(80),
  description: z.string().max(280).optional(),
  pointsPerScan: z.coerce.number().int().min(1).max(100).default(1),
  stampsPerCard: z.coerce.number().int().min(1).max(100).optional(),
  scanCooldownMinutes: z.coerce.number().int().min(0).max(1440).default(60),
});

export async function createProgram(
  input: z.input<typeof programSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "loyalty:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = programSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [program] = await db
    .insert(loyaltyPrograms)
    .values({
      tenantId: ctx.tenant.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      pointsPerScan: parsed.data.pointsPerScan,
      stampsPerCard: parsed.data.stampsPerCard ?? null,
      scanCooldownMinutes: parsed.data.scanCooldownMinutes,
    })
    .returning({ id: loyaltyPrograms.id });

  revalidatePath("/dashboard/loyalty");
  return ok({ id: program.id });
}

const qrSchema = z.object({
  programId: z.string().uuid(),
  label: z.string().max(80).optional(),
  targetType: z.enum(["stamp", "reward", "review"]).default("stamp"),
  pointsOverride: z.coerce.number().int().min(0).max(100).optional(),
});

export async function createQrCode(
  input: z.input<typeof qrSchema>,
): Promise<ActionResult<{ id: string; token: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "loyalty:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = qrSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  // Verify the program belongs to the tenant.
  const program = await db
    .select({ id: loyaltyPrograms.id })
    .from(loyaltyPrograms)
    .where(
      and(
        eq(loyaltyPrograms.id, parsed.data.programId),
        eq(loyaltyPrograms.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  if (!program[0]) return err("Programm nicht gefunden.");

  const token = generateToken();
  const [qr] = await db
    .insert(qrCodes)
    .values({
      tenantId: ctx.tenant.id,
      programId: parsed.data.programId,
      token,
      label: parsed.data.label ?? null,
      targetType: parsed.data.targetType,
      pointsOverride: parsed.data.pointsOverride ?? null,
    })
    .returning({ id: qrCodes.id, token: qrCodes.token });

  revalidatePath(`/dashboard/loyalty/program/${parsed.data.programId}`);
  return ok({ id: qr.id, token: qr.token });
}

export async function setQrActive(
  qrCodeId: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "loyalty:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(qrCodes)
    .set({ isActive })
    .where(
      and(eq(qrCodes.id, qrCodeId), eq(qrCodes.tenantId, ctx.tenant.id)),
    );
  revalidatePath("/dashboard/loyalty");
  return ok(undefined);
}

const rewardSchema = z.object({
  programId: z.string().uuid(),
  name: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  pointsCost: z.coerce.number().int().min(1).max(100000),
  inventory: z.coerce.number().int().min(0).max(1000000).optional(),
});

export async function createReward(
  input: z.input<typeof rewardSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "loyalty:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = rewardSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [reward] = await db
    .insert(loyaltyRewards)
    .values({
      tenantId: ctx.tenant.id,
      programId: parsed.data.programId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      pointsCost: parsed.data.pointsCost,
      inventory: parsed.data.inventory ?? null,
    })
    .returning({ id: loyaltyRewards.id });

  revalidatePath("/dashboard/loyalty/rewards");
  return ok({ id: reward.id });
}

export async function setRewardActive(
  rewardId: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "loyalty:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(loyaltyRewards)
    .set({ isActive })
    .where(
      and(eq(loyaltyRewards.id, rewardId), eq(loyaltyRewards.tenantId, ctx.tenant.id)),
    );
  revalidatePath("/dashboard/loyalty/rewards");
  return ok(undefined);
}

// =============================================================================
// Public customer flow (no session — token / id validated, privileged client)
// =============================================================================

async function requestMeta() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  return { ipHash: hashIp(ip), userAgent: h.get("user-agent") };
}

const scanSchema = z.object({
  token: z.string().min(1),
  memberId: z.string().uuid().optional(),
});

export type ScanResult = {
  memberId: string;
  awarded: number;
  balance: number;
  throttled: boolean;
  stampsPerCard: number | null;
  programName: string;
};

/**
 * Public scan handler. Resolves the QR token, awards points (respecting the
 * per-member cooldown), and returns the updated balance. Creates an anonymous
 * UUID-based member when none is supplied so no PII is required.
 */
export async function processScan(
  input: z.input<typeof scanSchema>,
): Promise<ActionResult<ScanResult>> {
  const parsed = scanSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const qr = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.token, parsed.data.token), eq(qrCodes.isActive, true)))
    .limit(1);
  if (!qr[0]) return err("Dieser QR-Code ist ungültig oder deaktiviert.");
  const code = qr[0];

  const programRows = await db
    .select()
    .from(loyaltyPrograms)
    .where(eq(loyaltyPrograms.id, code.programId))
    .limit(1);
  const program = programRows[0];
  if (!program || !program.isActive) {
    return err("Dieses Programm ist derzeit nicht aktiv.");
  }
  if (!(await loyaltyActive(code.tenantId))) {
    return err("Dieses Angebot ist derzeit nicht verfügbar.");
  }

  // Resolve or create the member.
  let memberId = parsed.data.memberId;
  if (memberId) {
    const existing = await db
      .select({ id: loyaltyMembers.id })
      .from(loyaltyMembers)
      .where(
        and(
          eq(loyaltyMembers.id, memberId),
          eq(loyaltyMembers.tenantId, code.tenantId),
          isNull(loyaltyMembers.deletedAt),
        ),
      )
      .limit(1);
    if (!existing[0]) memberId = undefined;
  }
  if (!memberId) {
    const [created] = await db
      .insert(loyaltyMembers)
      .values({
        tenantId: code.tenantId,
        programId: code.programId,
        pointsBalance: 0,
      })
      .returning({ id: loyaltyMembers.id });
    memberId = created.id;
  }

  const meta = await requestMeta();

  // Cooldown: was there a points-earning scan within the window?
  let throttled = false;
  if (program.scanCooldownMinutes > 0) {
    const since = new Date(Date.now() - program.scanCooldownMinutes * 60_000);
    const recent = await db
      .select({ id: qrScans.id })
      .from(qrScans)
      .where(
        and(
          eq(qrScans.memberId, memberId),
          eq(qrScans.tenantId, code.tenantId),
          gte(qrScans.createdAt, since),
          gte(qrScans.pointsAwarded, 1),
        ),
      )
      .limit(1);
    throttled = recent.length > 0;
  }

  const points = throttled ? 0 : code.pointsOverride ?? program.pointsPerScan;

  await db.insert(qrScans).values({
    tenantId: code.tenantId,
    qrCodeId: code.id,
    memberId,
    pointsAwarded: points,
    rejectedByCooldown: throttled,
    ipHash: meta.ipHash,
    userAgent: meta.userAgent,
  });

  let balance: number;
  if (points > 0) {
    await db.insert(loyaltyTransactions).values({
      tenantId: code.tenantId,
      memberId,
      type: "scan",
      points,
      reason: "QR-Scan",
    });
    const [updated] = await db
      .update(loyaltyMembers)
      .set({ pointsBalance: sql`${loyaltyMembers.pointsBalance} + ${points}` })
      .where(eq(loyaltyMembers.id, memberId))
      .returning({ balance: loyaltyMembers.pointsBalance });
    balance = updated.balance;
  } else {
    const row = await db
      .select({ balance: loyaltyMembers.pointsBalance })
      .from(loyaltyMembers)
      .where(eq(loyaltyMembers.id, memberId))
      .limit(1);
    balance = row[0]?.balance ?? 0;
  }

  return ok({
    memberId,
    awarded: points,
    balance,
    throttled,
    stampsPerCard: program.stampsPerCard,
    programName: program.name,
  });
}

export type PublicReward = {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
};

/** Public: active rewards for the program a scan token belongs to. */
export async function listRewardsForToken(
  token: string,
): Promise<ActionResult<PublicReward[]>> {
  const qr = await db
    .select({ programId: qrCodes.programId, tenantId: qrCodes.tenantId })
    .from(qrCodes)
    .where(and(eq(qrCodes.token, token), eq(qrCodes.isActive, true)))
    .limit(1);
  if (!qr[0]) return err("Ungültiger Code.");

  const rewards = await db
    .select({
      id: loyaltyRewards.id,
      name: loyaltyRewards.name,
      description: loyaltyRewards.description,
      pointsCost: loyaltyRewards.pointsCost,
    })
    .from(loyaltyRewards)
    .where(
      and(
        eq(loyaltyRewards.programId, qr[0].programId),
        eq(loyaltyRewards.isActive, true),
      ),
    )
    .orderBy(loyaltyRewards.pointsCost);
  return ok(rewards);
}

const redeemSchema = z.object({
  rewardId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export type RedeemResult = { code: string; pointsSpent: number; balance: number };

/**
 * Public reward claim. Debits points immediately and creates a pending
 * redemption with a short counter code (refunded if cancelled/expired).
 */
export async function redeemReward(
  input: z.input<typeof redeemSchema>,
): Promise<ActionResult<RedeemResult>> {
  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const rewardRows = await db
    .select()
    .from(loyaltyRewards)
    .where(
      and(
        eq(loyaltyRewards.id, parsed.data.rewardId),
        eq(loyaltyRewards.isActive, true),
      ),
    )
    .limit(1);
  const reward = rewardRows[0];
  if (!reward) return err("Reward nicht verfügbar.");

  const memberRows = await db
    .select()
    .from(loyaltyMembers)
    .where(
      and(
        eq(loyaltyMembers.id, parsed.data.memberId),
        eq(loyaltyMembers.tenantId, reward.tenantId),
        isNull(loyaltyMembers.deletedAt),
      ),
    )
    .limit(1);
  const member = memberRows[0];
  if (!member) return err("Mitglied nicht gefunden.");
  if (member.pointsBalance < reward.pointsCost) {
    return err("Nicht genügend Punkte für diesen Reward.");
  }

  // Debit and create pending redemption.
  const [txn] = await db
    .insert(loyaltyTransactions)
    .values({
      tenantId: reward.tenantId,
      memberId: member.id,
      type: "redemption",
      points: -reward.pointsCost,
      reason: `Einlösung: ${reward.name}`,
    })
    .returning({ id: loyaltyTransactions.id });

  const [updated] = await db
    .update(loyaltyMembers)
    .set({
      pointsBalance: sql`${loyaltyMembers.pointsBalance} - ${reward.pointsCost}`,
    })
    .where(eq(loyaltyMembers.id, member.id))
    .returning({ balance: loyaltyMembers.pointsBalance });

  const code = generateShortCode();
  await db.insert(loyaltyRedemptions).values({
    tenantId: reward.tenantId,
    memberId: member.id,
    rewardId: reward.id,
    code,
    status: "pending",
    pointsSpent: reward.pointsCost,
    transactionId: txn.id,
    expiresAt: new Date(Date.now() + REDEEM_TTL_MS),
  });

  return ok({ code, pointsSpent: reward.pointsCost, balance: updated.balance });
}

// =============================================================================
// Counter actions (RBAC loyalty:operate)
// =============================================================================

export async function confirmRedemption(
  code: string,
): Promise<ActionResult<{ rewardName: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "loyalty:operate");
  if (!guard.allowed) return err(guard.reason);

  const rows = await db
    .select({
      redemption: loyaltyRedemptions,
      rewardName: loyaltyRewards.name,
    })
    .from(loyaltyRedemptions)
    .innerJoin(
      loyaltyRewards,
      eq(loyaltyRedemptions.rewardId, loyaltyRewards.id),
    )
    .where(
      and(
        eq(loyaltyRedemptions.code, code.trim()),
        eq(loyaltyRedemptions.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return err("Code nicht gefunden.");
  const r = row.redemption;
  if (r.status !== "pending") return err(`Bereits ${r.status}.`);
  if (r.expiresAt && r.expiresAt.getTime() < Date.now()) {
    return err("Dieser Code ist abgelaufen.");
  }

  await db
    .update(loyaltyRedemptions)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(eq(loyaltyRedemptions.id, r.id));

  await writeAuditLog({
    tenantId: ctx.tenant.id,
    actorId: ctx.userId,
    action: "update",
    entityTable: "loyalty_redemptions",
    entityId: r.id,
    diff: { status: "confirmed" },
  });

  revalidatePath("/dashboard/loyalty");
  return ok({ rewardName: row.rewardName });
}

export async function cancelRedemption(
  code: string,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "loyalty:operate");
  if (!guard.allowed) return err(guard.reason);

  const rows = await db
    .select()
    .from(loyaltyRedemptions)
    .where(
      and(
        eq(loyaltyRedemptions.code, code.trim()),
        eq(loyaltyRedemptions.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  const r = rows[0];
  if (!r) return err("Code nicht gefunden.");
  if (r.status !== "pending") return err(`Bereits ${r.status}.`);

  // Refund the points.
  await db.insert(loyaltyTransactions).values({
    tenantId: ctx.tenant.id,
    memberId: r.memberId,
    type: "adjustment",
    points: r.pointsSpent,
    reason: "Storno Einlösung",
  });
  await db
    .update(loyaltyMembers)
    .set({
      pointsBalance: sql`${loyaltyMembers.pointsBalance} + ${r.pointsSpent}`,
    })
    .where(eq(loyaltyMembers.id, r.memberId));
  await db
    .update(loyaltyRedemptions)
    .set({ status: "cancelled" })
    .where(eq(loyaltyRedemptions.id, r.id));

  revalidatePath("/dashboard/loyalty");
  return ok(undefined);
}

const adjustSchema = z.object({
  memberId: z.string().uuid(),
  points: z.coerce.number().int().refine((n) => n !== 0, "Wert darf nicht 0 sein."),
  reason: z.string().max(140).optional(),
});

/** Manual points adjustment by staff. RBAC loyalty:operate. */
export async function adjustPoints(
  input: z.input<typeof adjustSchema>,
): Promise<ActionResult<{ balance: number }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "loyalty:operate");
  if (!guard.allowed) return err(guard.reason);

  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const member = await db
    .select()
    .from(loyaltyMembers)
    .where(
      and(
        eq(loyaltyMembers.id, parsed.data.memberId),
        eq(loyaltyMembers.tenantId, ctx.tenant.id),
        isNull(loyaltyMembers.deletedAt),
      ),
    )
    .limit(1);
  if (!member[0]) return err("Mitglied nicht gefunden.");
  if (member[0].pointsBalance + parsed.data.points < 0) {
    return err("Das würde ein negatives Guthaben ergeben.");
  }

  await db.insert(loyaltyTransactions).values({
    tenantId: ctx.tenant.id,
    memberId: parsed.data.memberId,
    type: "adjustment",
    points: parsed.data.points,
    reason: parsed.data.reason ?? "Manuelle Anpassung",
  });
  const [updated] = await db
    .update(loyaltyMembers)
    .set({
      pointsBalance: sql`${loyaltyMembers.pointsBalance} + ${parsed.data.points}`,
    })
    .where(eq(loyaltyMembers.id, parsed.data.memberId))
    .returning({ balance: loyaltyMembers.pointsBalance });

  revalidatePath("/dashboard/loyalty/members");
  return ok({ balance: updated.balance });
}
