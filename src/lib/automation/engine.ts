import "server-only";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  automationFlows,
  automationRuns,
  loyaltyMembers,
  loyaltyTransactions,
  qrScans,
} from "@/db/schema";
import { checkConsent } from "@/lib/consent";
import { sendMail } from "@/lib/mail";

/**
 * Core automation engine: evaluates all active flows for one tenant and fires
 * the action for newly-qualifying members (idempotent per member+flow).
 * Shared by the manual "run now" Server Action and the scheduled cron route.
 */
export async function runFlowsForTenant(
  tenantId: string,
): Promise<{ executed: number }> {
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

      await db.insert(automationRuns).values({ tenantId, flowId: flow.id, memberId });
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

  return { executed };
}
