"use server";

import { z } from "zod";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  loyaltyMembers,
  loyaltyTransactions,
  qrScans,
  retentionCampaigns,
  retentionTargets,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { checkConsent } from "@/lib/consent";
import { sendMail } from "@/lib/mail";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Returns the loyalty member ids that count as "inactive": created before the
 * cutoff and with no points-earning scan since the cutoff.
 */
async function inactiveMemberIds(
  tenantId: string,
  inactiveDays: number,
): Promise<string[]> {
  const cutoff = new Date(Date.now() - inactiveDays * DAY_MS);

  const members = await db
    .select({ id: loyaltyMembers.id, createdAt: loyaltyMembers.createdAt })
    .from(loyaltyMembers)
    .where(
      and(
        eq(loyaltyMembers.tenantId, tenantId),
        isNull(loyaltyMembers.deletedAt),
        lt(loyaltyMembers.createdAt, cutoff),
      ),
    );

  const recentScans = await db
    .select({ memberId: qrScans.memberId })
    .from(qrScans)
    .where(and(eq(qrScans.tenantId, tenantId), gte(qrScans.createdAt, cutoff)));
  const active = new Set(
    recentScans.map((s) => s.memberId).filter((id): id is string => Boolean(id)),
  );

  return members.filter((m) => !active.has(m.id)).map((m) => m.id);
}

// =============================================================================
// Campaign CRUD (retention:manage)
// =============================================================================

const campaignSchema = z.object({
  name: z.string().min(2).max(80),
  inactiveDays: z.coerce.number().int().min(7).max(730),
  bonusPoints: z.coerce.number().int().min(0).max(100000),
  sendEmail: z.boolean().default(true),
  message: z.string().max(500).optional(),
});

export async function createRetentionCampaign(
  input: z.input<typeof campaignSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "retention:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [campaign] = await db
    .insert(retentionCampaigns)
    .values({
      tenantId: ctx.tenant.id,
      name: parsed.data.name,
      inactiveDays: parsed.data.inactiveDays,
      bonusPoints: parsed.data.bonusPoints,
      sendEmail: parsed.data.sendEmail,
      message: parsed.data.message || null,
    })
    .returning({ id: retentionCampaigns.id });

  revalidatePath("/dashboard/retention");
  return ok({ id: campaign.id });
}

export async function deleteRetentionCampaign(
  campaignId: string,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "retention:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .delete(retentionCampaigns)
    .where(
      and(
        eq(retentionCampaigns.id, campaignId),
        eq(retentionCampaigns.tenantId, ctx.tenant.id),
        eq(retentionCampaigns.status, "draft"),
      ),
    );
  revalidatePath("/dashboard/retention");
  return ok(undefined);
}

/** Preview how many members would currently be targeted at a threshold. */
export async function previewInactive(
  inactiveDays: number,
): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "retention:read");
  if (!guard.allowed) return err(guard.reason);

  const days = Math.min(Math.max(Math.round(inactiveDays) || 60, 7), 730);
  const ids = await inactiveMemberIds(ctx.tenant.id, days);
  return ok({ count: ids.length });
}

/**
 * Runs a win-back campaign: credits bonus points to newly-inactive members
 * (not previously targeted by this campaign) and emails consented ones.
 */
export async function runRetentionCampaign(
  campaignId: string,
): Promise<ActionResult<{ targeted: number; emailed: number }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "retention:manage");
  if (!guard.allowed) return err(guard.reason);
  const tenantId = ctx.tenant.id;

  const rows = await db
    .select()
    .from(retentionCampaigns)
    .where(
      and(
        eq(retentionCampaigns.id, campaignId),
        eq(retentionCampaigns.tenantId, tenantId),
      ),
    )
    .limit(1);
  const campaign = rows[0];
  if (!campaign) return err("Kampagne nicht gefunden.");

  const candidateIds = await inactiveMemberIds(tenantId, campaign.inactiveDays);
  if (candidateIds.length === 0) {
    await db
      .update(retentionCampaigns)
      .set({ status: "sent", lastRunAt: new Date() })
      .where(eq(retentionCampaigns.id, campaign.id));
    revalidatePath("/dashboard/retention");
    return ok({ targeted: 0, emailed: 0 });
  }

  // Exclude members already targeted by this campaign.
  const already = await db
    .select({ memberId: retentionTargets.memberId })
    .from(retentionTargets)
    .where(eq(retentionTargets.campaignId, campaign.id));
  const alreadySet = new Set(already.map((a) => a.memberId));
  const targetIds = candidateIds.filter((id) => !alreadySet.has(id));

  let targeted = 0;
  let emailed = 0;

  for (const memberId of targetIds) {
    const memberRows = await db
      .select()
      .from(loyaltyMembers)
      .where(eq(loyaltyMembers.id, memberId))
      .limit(1);
    const member = memberRows[0];
    if (!member) continue;

    // Credit the comeback bonus.
    if (campaign.bonusPoints > 0) {
      await db.insert(loyaltyTransactions).values({
        tenantId,
        memberId,
        type: "bonus",
        points: campaign.bonusPoints,
        reason: `Rückholaktion: ${campaign.name}`,
      });
      await db
        .update(loyaltyMembers)
        .set({
          pointsBalance: sql`${loyaltyMembers.pointsBalance} + ${campaign.bonusPoints}`,
        })
        .where(eq(loyaltyMembers.id, memberId));
    }

    // Email consented members.
    let didEmail = false;
    if (campaign.sendEmail && member.email) {
      const consented = await checkConsent({
        tenantId,
        purpose: "marketing_email",
        subjectEmail: member.email,
      });
      if (consented) {
        const result = await sendMail({
          to: member.email,
          subject: "Wir vermissen dich!",
          html: `<p>Hallo${member.displayName ? ` ${member.displayName}` : ""},</p>
            <p>${campaign.message ?? "Schön wäre es, dich bald wiederzusehen!"}</p>
            ${campaign.bonusPoints > 0 ? `<p>Wir haben dir <strong>${campaign.bonusPoints} Bonus-Punkte</strong> gutgeschrieben.</p>` : ""}`,
        });
        didEmail = result.sent;
        if (didEmail) emailed++;
      }
    }

    await db.insert(retentionTargets).values({
      tenantId,
      campaignId: campaign.id,
      memberId,
      emailed: didEmail,
    });
    targeted++;
  }

  await db
    .update(retentionCampaigns)
    .set({
      status: "sent",
      lastRunAt: new Date(),
      targetedCount: sql`${retentionCampaigns.targetedCount} + ${targeted}`,
    })
    .where(eq(retentionCampaigns.id, campaign.id));

  await writeAuditLog({
    tenantId,
    actorId: ctx.userId,
    action: "update",
    entityTable: "retention_campaigns",
    entityId: campaign.id,
    diff: { targeted, emailed },
  });

  revalidatePath("/dashboard/retention");
  return ok({ targeted, emailed });
}
