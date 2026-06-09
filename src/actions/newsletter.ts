"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  newsletterCampaigns,
  newsletterContacts,
  newsletterSends,
  tenants,
  tenantTools,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import {
  recordConsent,
  requestDoubleOptIn,
  withdrawConsent,
  checkConsent,
} from "@/lib/consent";
import { sendMail } from "@/lib/mail";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const TOOL_KEY = "newsletter";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

async function newsletterActive(tenantId: string): Promise<boolean> {
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
// Public subscribe (double-opt-in) + unsubscribe
// =============================================================================

const subscribeSchema = z.object({
  slug: z.string().min(1),
  email: z.string().email("Bitte eine gültige E-Mail eingeben."),
  name: z.string().max(80).optional(),
});

export async function subscribeNewsletter(
  input: z.input<typeof subscribeSchema>,
): Promise<ActionResult<{ pending: true }>> {
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const tenantRows = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.slug, parsed.data.slug))
    .limit(1);
  const tenant = tenantRows[0];
  if (!tenant) return err("Store nicht gefunden.");
  if (!(await newsletterActive(tenant.id))) {
    return err("Newsletter ist für diesen Store nicht verfügbar.");
  }

  const email = parsed.data.email.toLowerCase();
  await db
    .insert(newsletterContacts)
    .values({
      tenantId: tenant.id,
      email,
      name: parsed.data.name || null,
      source: "public_signup",
    })
    .onConflictDoNothing({
      target: [newsletterContacts.tenantId, newsletterContacts.email],
    });

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const { token } = await requestDoubleOptIn(
    { tenantId: tenant.id, purpose: "marketing_email", subjectEmail: email },
    { ip, userAgent: h.get("user-agent") },
  );

  await sendMail({
    to: email,
    subject: `Bitte bestätige deine Anmeldung – ${tenant.name}`,
    html: `<p>Hallo,</p>
      <p>bitte bestätige deine Newsletter-Anmeldung bei <strong>${tenant.name}</strong>:</p>
      <p><a href="${appUrl()}/consent/confirm/${token}">Anmeldung bestätigen</a></p>
      <p>Wenn du das nicht warst, ignoriere diese E-Mail.</p>`,
  });

  return ok({ pending: true });
}

export async function unsubscribeNewsletter(
  contactId: string,
): Promise<ActionResult<{ done: true }>> {
  const rows = await db
    .select()
    .from(newsletterContacts)
    .where(eq(newsletterContacts.id, contactId))
    .limit(1);
  const contact = rows[0];
  if (!contact) return err("Kontakt nicht gefunden.");

  await withdrawConsent({
    tenantId: contact.tenantId,
    purpose: "marketing_email",
    subjectEmail: contact.email,
  });

  return ok({ done: true });
}

// =============================================================================
// Admin: contacts (newsletter:manage)
// =============================================================================

const addContactSchema = z.object({
  email: z.string().email(),
  name: z.string().max(80).optional(),
});

/** Adds a contact with direct (in-person) consent. */
export async function addContact(
  input: z.input<typeof addContactSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "newsletter:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = addContactSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const email = parsed.data.email.toLowerCase();

  const [contact] = await db
    .insert(newsletterContacts)
    .values({
      tenantId: ctx.tenant.id,
      email,
      name: parsed.data.name || null,
      source: "manual",
    })
    .onConflictDoUpdate({
      target: [newsletterContacts.tenantId, newsletterContacts.email],
      set: { deletedAt: null },
    })
    .returning({ id: newsletterContacts.id });

  await recordConsent(
    { tenantId: ctx.tenant.id, purpose: "marketing_email", subjectEmail: email },
    true,
    { source: "manual_admin" },
  );

  revalidatePath("/dashboard/newsletter");
  return ok({ id: contact.id });
}

// =============================================================================
// Admin: campaigns (newsletter:manage)
// =============================================================================

const campaignSchema = z.object({
  subject: z.string().min(2).max(160),
  bodyHtml: z.string().min(1).max(20000),
});

export async function createCampaign(
  input: z.input<typeof campaignSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "newsletter:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [campaign] = await db
    .insert(newsletterCampaigns)
    .values({
      tenantId: ctx.tenant.id,
      subject: parsed.data.subject,
      bodyHtml: parsed.data.bodyHtml,
      status: "draft",
    })
    .returning({ id: newsletterCampaigns.id });

  revalidatePath("/dashboard/newsletter");
  return ok({ id: campaign.id });
}

export async function deleteCampaign(
  campaignId: string,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "newsletter:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .delete(newsletterCampaigns)
    .where(
      and(
        eq(newsletterCampaigns.id, campaignId),
        eq(newsletterCampaigns.tenantId, ctx.tenant.id),
        eq(newsletterCampaigns.status, "draft"),
      ),
    );
  revalidatePath("/dashboard/newsletter");
  return ok(undefined);
}

/**
 * Sends a draft campaign to every contact that holds confirmed marketing
 * consent. Logs each delivery and marks the campaign sent. RBAC newsletter:manage.
 */
export async function sendCampaign(
  campaignId: string,
): Promise<ActionResult<{ sent: number; failed: number; skipped: number }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "newsletter:manage");
  if (!guard.allowed) return err(guard.reason);

  const rows = await db
    .select()
    .from(newsletterCampaigns)
    .where(
      and(
        eq(newsletterCampaigns.id, campaignId),
        eq(newsletterCampaigns.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  const campaign = rows[0];
  if (!campaign) return err("Kampagne nicht gefunden.");
  if (campaign.status !== "draft") return err("Kampagne wurde bereits versendet.");

  await db
    .update(newsletterCampaigns)
    .set({ status: "sending" })
    .where(eq(newsletterCampaigns.id, campaign.id));

  const contacts = await db
    .select()
    .from(newsletterContacts)
    .where(
      and(
        eq(newsletterContacts.tenantId, ctx.tenant.id),
        isNull(newsletterContacts.deletedAt),
      ),
    );

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const contact of contacts) {
    // Only mail contacts with confirmed double-opt-in consent.
    const consented = await checkConsent({
      tenantId: ctx.tenant.id,
      purpose: "marketing_email",
      subjectEmail: contact.email,
    });
    if (!consented) {
      skipped++;
      continue;
    }

    const unsubscribe = `${appUrl()}/newsletter/unsubscribe/${contact.id}`;
    const html = `${campaign.bodyHtml}
      <hr/>
      <p style="font-size:12px;color:#888">
        Du erhältst diese E-Mail, weil du dich angemeldet hast.
        <a href="${unsubscribe}">Abmelden</a>
      </p>`;

    const result = await sendMail({
      to: contact.email,
      subject: campaign.subject,
      html,
    });

    await db.insert(newsletterSends).values({
      tenantId: ctx.tenant.id,
      campaignId: campaign.id,
      contactId: contact.id,
      email: contact.email,
      status: result.sent ? "sent" : "failed",
      error: result.sent ? null : "mail_provider_unavailable",
    });

    if (result.sent) sent++;
    else failed++;
  }

  await db
    .update(newsletterCampaigns)
    .set({ status: "sent", sentAt: new Date(), recipientCount: sent })
    .where(eq(newsletterCampaigns.id, campaign.id));

  await writeAuditLog({
    tenantId: ctx.tenant.id,
    actorId: ctx.userId,
    action: "update",
    entityTable: "newsletter_campaigns",
    entityId: campaign.id,
    diff: { sent, failed, skipped },
  });

  revalidatePath("/dashboard/newsletter");
  return ok({ sent, failed, skipped });
}
