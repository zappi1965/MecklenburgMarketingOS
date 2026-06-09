"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { automationFlows } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { runFlowsForTenant } from "@/lib/automation/engine";
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

  const { executed } = await runFlowsForTenant(tenantId);

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
