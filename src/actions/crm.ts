"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { crmContacts, crmDeals } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const STAGES = ["new", "qualified", "proposal", "won", "lost"] as const;

// --- Contacts --------------------------------------------------------------

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  company: z.string().max(120).optional(),
  source: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
});

export async function createContact(
  input: z.input<typeof contactSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "crm:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [contact] = await db
    .insert(crmContacts)
    .values({
      tenantId: ctx.tenant.id,
      name: parsed.data.name,
      email: parsed.data.email?.toLowerCase() || null,
      phone: parsed.data.phone || null,
      company: parsed.data.company || null,
      source: parsed.data.source || "manual",
      notes: parsed.data.notes || null,
    })
    .returning({ id: crmContacts.id });

  revalidatePath("/dashboard/crm");
  return ok({ id: contact.id });
}

export async function deleteContact(id: string): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "crm:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(crmContacts)
    .set({ deletedAt: new Date() })
    .where(and(eq(crmContacts.id, id), eq(crmContacts.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/crm");
  return ok(undefined);
}

// --- Deals -----------------------------------------------------------------

const dealSchema = z.object({
  title: z.string().min(1).max(160),
  contactId: z.string().uuid().optional().or(z.literal("")),
  valueEuros: z.coerce.number().min(0).max(100000000).optional(),
  stage: z.enum(STAGES).default("new"),
  notes: z.string().max(2000).optional(),
});

export async function createDeal(
  input: z.input<typeof dealSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "crm:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [deal] = await db
    .insert(crmDeals)
    .values({
      tenantId: ctx.tenant.id,
      contactId: parsed.data.contactId || null,
      title: parsed.data.title,
      valueCents:
        parsed.data.valueEuros != null
          ? Math.round(parsed.data.valueEuros * 100)
          : null,
      stage: parsed.data.stage,
      notes: parsed.data.notes || null,
    })
    .returning({ id: crmDeals.id });

  revalidatePath("/dashboard/crm");
  return ok({ id: deal.id });
}

export async function updateDealStage(
  id: string,
  stage: (typeof STAGES)[number],
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "crm:manage");
  if (!guard.allowed) return err(guard.reason);

  if (!STAGES.includes(stage)) return err("Ungültige Phase.");

  await db
    .update(crmDeals)
    .set({ stage })
    .where(and(eq(crmDeals.id, id), eq(crmDeals.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/crm");
  return ok(undefined);
}

export async function deleteDeal(id: string): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "crm:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(crmDeals)
    .set({ deletedAt: new Date() })
    .where(and(eq(crmDeals.id, id), eq(crmDeals.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/crm");
  return ok(undefined);
}
