"use server";

import { z } from "zod";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { smsCampaigns, smsContacts, smsSends } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { sendSms } from "@/lib/sms";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

// Loose E.164-ish validation: optional +, 6–15 digits.
const phoneRegex = /^\+?[0-9]{6,15}$/;

function normalizePhone(raw: string): string {
  return raw.replace(/[\s/()-]/g, "");
}

// --- Contacts (sms:manage) -------------------------------------------------

const contactSchema = z.object({
  phone: z.string().min(6).max(20),
  name: z.string().max(80).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Ohne Einwilligung kein SMS-Versand." }),
  }),
});

export async function addSmsContact(
  input: z.input<typeof contactSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "sms:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const phone = normalizePhone(parsed.data.phone);
  if (!phoneRegex.test(phone)) return err("Ungültige Telefonnummer.");

  const [contact] = await db
    .insert(smsContacts)
    .values({
      tenantId: ctx.tenant.id,
      phone,
      name: parsed.data.name || null,
      source: "manual",
      consentAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [smsContacts.tenantId, smsContacts.phone],
      set: { consentAt: new Date(), deletedAt: null },
    })
    .returning({ id: smsContacts.id });

  revalidatePath("/dashboard/sms");
  return ok({ id: contact.id });
}

// --- Campaigns (sms:manage) ------------------------------------------------

const campaignSchema = z.object({
  message: z.string().min(1).max(459), // up to 3 concatenated SMS segments
});

export async function createSmsCampaign(
  input: z.input<typeof campaignSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "sms:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [campaign] = await db
    .insert(smsCampaigns)
    .values({ tenantId: ctx.tenant.id, message: parsed.data.message })
    .returning({ id: smsCampaigns.id });

  revalidatePath("/dashboard/sms");
  return ok({ id: campaign.id });
}

export async function deleteSmsCampaign(
  id: string,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "sms:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .delete(smsCampaigns)
    .where(
      and(
        eq(smsCampaigns.id, id),
        eq(smsCampaigns.tenantId, ctx.tenant.id),
        eq(smsCampaigns.status, "draft"),
      ),
    );
  revalidatePath("/dashboard/sms");
  return ok(undefined);
}

/** Sends a draft campaign to all consented, non-deleted contacts. */
export async function sendSmsCampaign(
  id: string,
): Promise<ActionResult<{ sent: number; failed: number }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "sms:manage");
  if (!guard.allowed) return err(guard.reason);
  const tenantId = ctx.tenant.id;

  const rows = await db
    .select()
    .from(smsCampaigns)
    .where(and(eq(smsCampaigns.id, id), eq(smsCampaigns.tenantId, tenantId)))
    .limit(1);
  const campaign = rows[0];
  if (!campaign) return err("Kampagne nicht gefunden.");
  if (campaign.status !== "draft") return err("Bereits versendet.");

  await db
    .update(smsCampaigns)
    .set({ status: "sending" })
    .where(eq(smsCampaigns.id, campaign.id));

  const contacts = await db
    .select()
    .from(smsContacts)
    .where(
      and(
        eq(smsContacts.tenantId, tenantId),
        isNull(smsContacts.deletedAt),
        isNotNull(smsContacts.consentAt),
      ),
    );

  let sent = 0;
  let failed = 0;
  for (const contact of contacts) {
    const result = await sendSms({ to: contact.phone, text: campaign.message });
    await db.insert(smsSends).values({
      tenantId,
      campaignId: campaign.id,
      contactId: contact.id,
      phone: contact.phone,
      status: result.sent ? "sent" : "failed",
    });
    if (result.sent) sent++;
    else failed++;
  }

  await db
    .update(smsCampaigns)
    .set({ status: "sent", sentAt: new Date(), recipientCount: sent })
    .where(eq(smsCampaigns.id, campaign.id));

  await writeAuditLog({
    tenantId,
    actorId: ctx.userId,
    action: "update",
    entityTable: "sms_campaigns",
    entityId: campaign.id,
    diff: { sent, failed },
  });

  revalidatePath("/dashboard/sms");
  return ok({ sent, failed });
}
