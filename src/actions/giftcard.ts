"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  giftCards,
  giftCardTransactions,
  tenantTools,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { generateShortCode } from "@/lib/nanoid";
import { sendMail } from "@/lib/mail";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const TOOL_KEY = "giftcards";

async function giftcardsActive(tenantId: string): Promise<boolean> {
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
// Issue / cancel (giftcards:manage)
// =============================================================================

const issueSchema = z.object({
  amountCents: z.coerce.number().int().min(100).max(10000000),
  recipientName: z.string().max(80).optional(),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  message: z.string().max(300).optional(),
});

export async function issueGiftCard(
  input: z.input<typeof issueSchema>,
): Promise<ActionResult<{ code: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "giftcards:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = issueSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  // Unique code (retry on collision).
  let code = generateShortCode(10);
  let cardId: string | null = null;
  for (let i = 0; i < 5; i++) {
    const inserted = await db
      .insert(giftCards)
      .values({
        tenantId: ctx.tenant.id,
        code,
        initialAmountCents: parsed.data.amountCents,
        balanceCents: parsed.data.amountCents,
        recipientName: parsed.data.recipientName || null,
        recipientEmail: parsed.data.recipientEmail?.toLowerCase() || null,
        message: parsed.data.message || null,
      })
      .onConflictDoNothing({ target: giftCards.code })
      .returning({ id: giftCards.id });
    if (inserted[0]) {
      cardId = inserted[0].id;
      break;
    }
    code = generateShortCode(10);
  }
  if (!cardId) return err("Gutschein konnte nicht erstellt werden.");

  await db.insert(giftCardTransactions).values({
    tenantId: ctx.tenant.id,
    giftCardId: cardId,
    type: "issue",
    amountCents: parsed.data.amountCents,
    reason: "Ausstellung",
  });

  // Optionally email the recipient.
  const email = parsed.data.recipientEmail?.toLowerCase();
  if (email) {
    await sendMail({
      to: email,
      subject: `Dein Gutschein – Code ${code}`,
      html: `<p>Hallo ${parsed.data.recipientName ?? ""},</p>
        <p>du hast einen Gutschein erhalten.</p>
        <p>Code: <strong>${code}</strong></p>
        ${parsed.data.message ? `<p>${parsed.data.message}</p>` : ""}`,
    });
  }

  revalidatePath("/dashboard/giftcards");
  return ok({ code });
}

export async function cancelGiftCard(code: string): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "giftcards:manage");
  if (!guard.allowed) return err(guard.reason);

  const rows = await db
    .select()
    .from(giftCards)
    .where(and(eq(giftCards.code, code.trim()), eq(giftCards.tenantId, ctx.tenant.id)))
    .limit(1);
  const card = rows[0];
  if (!card) return err("Gutschein nicht gefunden.");
  if (card.status === "cancelled") return err("Bereits storniert.");

  if (card.balanceCents !== 0) {
    await db.insert(giftCardTransactions).values({
      tenantId: ctx.tenant.id,
      giftCardId: card.id,
      type: "cancel",
      amountCents: -card.balanceCents,
      reason: "Storno",
    });
  }
  await db
    .update(giftCards)
    .set({ status: "cancelled", balanceCents: 0 })
    .where(eq(giftCards.id, card.id));

  revalidatePath("/dashboard/giftcards");
  return ok(undefined);
}

// =============================================================================
// Redeem at the counter (giftcards:operate)
// =============================================================================

const redeemSchema = z.object({
  code: z.string().min(1),
  amountCents: z.coerce.number().int().min(1).max(10000000),
});

export async function redeemGiftCard(
  input: z.input<typeof redeemSchema>,
): Promise<ActionResult<{ balanceCents: number; status: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "giftcards:operate");
  if (!guard.allowed) return err(guard.reason);

  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const rows = await db
    .select()
    .from(giftCards)
    .where(
      and(
        eq(giftCards.code, parsed.data.code.trim()),
        eq(giftCards.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  const card = rows[0];
  if (!card || card.deletedAt) return err("Gutschein nicht gefunden.");
  if (card.status === "cancelled") return err("Dieser Gutschein wurde storniert.");
  if (card.balanceCents < parsed.data.amountCents) {
    return err("Nicht genügend Guthaben.");
  }

  const newBalance = card.balanceCents - parsed.data.amountCents;
  const newStatus = newBalance === 0 ? "redeemed" : "active";

  await db.insert(giftCardTransactions).values({
    tenantId: ctx.tenant.id,
    giftCardId: card.id,
    type: "redeem",
    amountCents: -parsed.data.amountCents,
    reason: "Einlösung",
  });
  await db
    .update(giftCards)
    .set({ balanceCents: sql`${giftCards.balanceCents} - ${parsed.data.amountCents}`, status: newStatus })
    .where(eq(giftCards.id, card.id));

  revalidatePath("/dashboard/giftcards");
  return ok({ balanceCents: newBalance, status: newStatus });
}

// =============================================================================
// Public balance check
// =============================================================================

export async function getGiftCardBalance(
  code: string,
): Promise<ActionResult<{ balanceCents: number; currency: string; status: string }>> {
  const rows = await db
    .select({
      balanceCents: giftCards.balanceCents,
      currency: giftCards.currency,
      status: giftCards.status,
      deletedAt: giftCards.deletedAt,
    })
    .from(giftCards)
    .where(eq(giftCards.code, code.trim()))
    .limit(1);
  const card = rows[0];
  if (!card || card.deletedAt) return err("Gutschein nicht gefunden.");
  return ok({
    balanceCents: card.balanceCents,
    currency: card.currency,
    status: card.status,
  });
}
