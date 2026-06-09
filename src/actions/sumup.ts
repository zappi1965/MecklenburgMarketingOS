"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sumupTransactions } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { generateShortCode } from "@/lib/nanoid";
import { createSumUpCheckout } from "@/lib/sumup";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const amountSchema = z.object({
  amountEuros: z.coerce.number().min(0.01).max(1000000),
  description: z.string().max(200).optional(),
});

/** Records a completed sale manually (cash / card terminal). */
export async function recordManualSale(
  input: z.input<typeof amountSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "sumup:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = amountSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [txn] = await db
    .insert(sumupTransactions)
    .values({
      tenantId: ctx.tenant.id,
      reference: `man-${generateShortCode(8)}`,
      amountCents: Math.round(parsed.data.amountEuros * 100),
      description: parsed.data.description || null,
      status: "paid",
      source: "manual",
      paidAt: new Date(),
    })
    .returning({ id: sumupTransactions.id });

  revalidatePath("/dashboard/sumup");
  return ok({ id: txn.id });
}

/**
 * Creates a SumUp hosted checkout (payment link). Requires SUMUP_API_KEY +
 * SUMUP_MERCHANT_CODE; returns a clear error when SumUp is not connected.
 */
export async function createPaymentLink(
  input: z.input<typeof amountSchema>,
): Promise<ActionResult<{ payUrl: string | null; checkoutId: string | null }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "sumup:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = amountSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const reference = `lnk-${generateShortCode(8)}`;
  const amountCents = Math.round(parsed.data.amountEuros * 100);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const result = await createSumUpCheckout({
    reference,
    amountCents,
    currency: "EUR",
    description: parsed.data.description,
    returnUrl: `${base}/dashboard/sumup`,
  });

  if (!result.configured) {
    return err(
      "SumUp ist nicht verbunden (SUMUP_API_KEY / SUMUP_MERCHANT_CODE fehlen).",
    );
  }
  if (!result.ok) {
    return err(result.error ?? "SumUp-Checkout fehlgeschlagen.");
  }

  await db.insert(sumupTransactions).values({
    tenantId: ctx.tenant.id,
    reference,
    amountCents,
    description: parsed.data.description || null,
    status: "pending",
    source: "sumup",
    checkoutId: result.checkoutId ?? null,
  });

  revalidatePath("/dashboard/sumup");
  return ok({
    payUrl: result.payUrl ?? null,
    checkoutId: result.checkoutId ?? null,
  });
}

export async function markTransactionPaid(
  id: string,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "sumup:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(sumupTransactions)
    .set({ status: "paid", paidAt: new Date() })
    .where(
      and(
        eq(sumupTransactions.id, id),
        eq(sumupTransactions.tenantId, ctx.tenant.id),
      ),
    );
  revalidatePath("/dashboard/sumup");
  return ok(undefined);
}
