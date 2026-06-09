"use server";

import { z } from "zod";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  automationFlows,
  automationRuns,
  loyaltyMembers,
  loyaltyTransactions,
  qrScans,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { checkConsent } from "@/lib/consent";
import { sendMail } from "@/lib/mail";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

// --- Flow CRUD (automation:manage) -----------------------------------------

const flowSchema = z
  .object({
    name: z.string().min(2).max(80),
    triggerType: z.enum(["first_scan", "points_reached"]),
    threshold: z.coerce.number().int().min(1).max(1000000).optional(),
    actionType: z.enum(["add_points", "send_email"]),
    actionPoints: z.coerce.number().int().min(1).max(100000).optional(),
    emailSubject: z.string().max(160).optional(),
    emailBody: z.string().max(4000).optional(),
  })
  .refine(
    (d) => d.triggerType !== "points_reached" || (d.threshold ?? 0) > 0,
    { message: "Schwelle erforderlich.", path: ["threshold"] },
  )
  .refine(
    (d) => d.actionType !== "add_points" || (d.actionPoints ?? 0) > 0,
    { message: "Bonus-Punkte erforderlich.", path: ["actionPoints"] },
  )
  .refine(
    (d) =>
      d.actionType !== "send_email" ||
      (!!d.emailSubject?.trim() && !!d.emailBody?.trim()),
    { message: "Betreff und Text erforderlich.", path: ["emailSubject"] },
  );

export async function createFlow(
  input: z.input<typeof flowSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "automation:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = flowSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [flow] = await db
    .insert(automationFlows)
    .values({
      tenantId: ctx.tenant.id,
      name: parsed.data.name,
      triggerType: parsed.data.triggerType,
      threshold: parsed.data.threshold ?? null,
      actionType: parsed.data.actionType,
      actionPoints: parsed.data.actionPoints ?? null,
      emailSubject: parsed.data.emailSubject || null,
      emailBody: parsed.data.emailBody || null,
    })
    .returning({ id: automationFlows.id });

  revalidatePath("/dashboard/automation");
  return ok({ id: flow.id });
}

export async function setFlowActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "automation:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(automationFlows)
    .set({ isActive })
    .where(
      and(eq(automationFlows.id, id), eq(automationFlows.tenantId, ctx.tenant.id)),
    );
  revalidatePath("/dashboard/automation");
  return ok(undefined);
}

export async function deleteFlow(id: string): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "automation:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .delete(automationFlows)
    .where(
      and(eq(automationFlows.id, id), eq(automationFlows.tenantId, ctx.tenant.id)),
    );
  revalidatePath("/dashboard/automation");
  return ok(undefined);
}

// --- Engine (automation:manage) --------------------------------------------

/**
 * Evaluates all active flows and fires the action for newly-qualifying members
 * (idempotent per member+flow). Intended to run on a schedule; exposed as a
 * manual "run now" action for the MVP.
 */
export async function runAutomations(): Promise<
  ActionResult<{ executed: number }>
> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "automation:manage");
  if (!guard.allowed) return err(guard.reason);
  const tenantId = ctx.tenant.id;

  const flows = await db
    .select()
    .from(automationFlows)
    .where(
      and(
        eq(automationFlows.tenantId, tenantId),
        eq(automationFlows.isActive, true),
      ),
    );

  let executed = 0;

  for (const flow of flows) {
    // Determine candidate members for the trigger.
    let candidateIds: string[] = [];
    if (flow.triggerType === "points_reached" && flow.threshold != null) {
      const rows = await db
        .select({ id: loyaltyMembers.id })
        .from(loyaltyMembers)
        .where(
          and(
            eq(loyaltyMembers.tenantId, tenantId),
            isNull(loyaltyMembers.deletedAt),
            gte(loyaltyMembers.pointsBalance, flow.threshold),
          ),
        );
      candidateIds = rows.map((r) => r.id);
    } else if (flow.triggerType === "first_scan") {
      const scanned = await db
        .selectDistinct({ memberId: qrScans.memberId })
        .from(qrScans)
        .where(eq(qrScans.tenantId, tenantId));
      candidateIds = scanned
        .map((s) => s.memberId)
        .filter((id): id is string => Boolean(id));
    }
    if (candidateIds.length === 0) continue;

    // Exclude members already processed for this flow.
    const done = await db
      .select({ memberId: automationRuns.memberId })
      .from(automationRuns)
      .where(eq(automationRuns.flowId, flow.id));
    const doneSet = new Set(done.map((d) => d.memberId));
    const targetIds = candidateIds.filter((id) => !doneSet.has(id));

    let flowExecuted = 0;
    for (const memberId of targetIds) {
      const memberRows = await db
        .select()
        .from(loyaltyMembers)
        .where(eq(loyaltyMembers.id, memberId))
        .limit(1);
      const member = memberRows[0];
      if (!member || member.deletedAt) continue;

      if (flow.actionType === "add_points" && flow.actionPoints) {
        await db.insert(loyaltyTransactions).values({
          tenantId,
          memberId,
          type: "bonus",
          points: flow.actionPoints,
          reason: `Automation: ${flow.name}`,
        });
        await db
          .update(loyaltyMembers)
          .set({
            pointsBalance: sql`${loyaltyMembers.pointsBalance} + ${flow.actionPoints}`,
          })
          .where(eq(loyaltyMembers.id, memberId));
      } else if (flow.actionType === "send_email") {
        // Only email members with confirmed marketing consent; otherwise skip
        // enrolment so they can be reached once they consent.
        if (!member.email) continue;
        const consented = await checkConsent({
          tenantId,
          purpose: "marketing_email",
          subjectEmail: member.email,
        });
        if (!consented) continue;
        await sendMail({
          to: member.email,
          subject: flow.emailSubject ?? "Hallo",
          html: `<p>${flow.emailBody ?? ""}</p>`,
        });
      }

      await db.insert(automationRuns).values({
        tenantId,
        flowId: flow.id,
        memberId,
      });
      flowExecuted++;
    }

    if (flowExecuted > 0) {
      await db
        .update(automationFlows)
        .set({
          runCount: sql`${automationFlows.runCount} + ${flowExecuted}`,
          lastRunAt: new Date(),
        })
        .where(eq(automationFlows.id, flow.id));
      executed += flowExecuted;
    }
  }

  if (executed > 0) {
    await writeAuditLog({
      tenantId,
      actorId: ctx.userId,
      action: "update",
      entityTable: "automation_runs",
      entityId: tenantId,
      diff: { executed },
    });
  }

  revalidatePath("/dashboard/automation");
  return ok({ executed });
}
