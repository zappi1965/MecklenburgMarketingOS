"use server";

import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { coupons, couponRedemptions, tenantTools } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { generateShortCode } from "@/lib/nanoid";
import { hashIp } from "@/lib/consent";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const TOOL_KEY = "coupons";

async function couponsActive(tenantId: string): Promise<boolean> {
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

type CouponRow = typeof coupons.$inferSelect;

function couponValidity(
  c: CouponRow,
): { valid: true } | { valid: false; reason: string } {
  if (!c.isActive) return { valid: false, reason: "Dieser Code ist inaktiv." };
  if (c.expiresAt && c.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "Dieser Code ist abgelaufen." };
  }
  if (c.maxRedemptions != null && c.redemptionCount >= c.maxRedemptions) {
    return { valid: false, reason: "Dieser Code ist aufgebraucht." };
  }
  return { valid: true };
}

// --- Admin (coupons:manage) ------------------------------------------------

const createSchema = z
  .object({
    code: z
      .string()
      .regex(/^[A-Za-z0-9-]*$/, "Nur Buchstaben, Zahlen und Bindestriche.")
      .max(40)
      .optional(),
    description: z.string().max(200).optional(),
    discountType: z.enum(["percent", "fixed"]),
    // percent: 1–100; fixed: euros (converted to cents).
    discountValue: z.coerce.number().min(0.01).max(1000000),
    maxRedemptions: z.coerce.number().int().min(1).max(1000000).optional(),
    expiresAt: z.string().optional(),
  })
  .refine(
    (d) => d.discountType !== "percent" || d.discountValue <= 100,
    { message: "Prozentwert darf höchstens 100 sein.", path: ["discountValue"] },
  );

export async function createCoupon(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<{ code: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "coupons:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const value =
    parsed.data.discountType === "fixed"
      ? Math.round(parsed.data.discountValue * 100)
      : Math.round(parsed.data.discountValue);

  const desired = parsed.data.code?.trim().toUpperCase();
  let code = desired && desired.length ? desired : generateShortCode(8);

  for (let i = 0; i < 5; i++) {
    const inserted = await db
      .insert(coupons)
      .values({
        tenantId: ctx.tenant.id,
        code,
        description: parsed.data.description || null,
        discountType: parsed.data.discountType,
        discountValue: value,
        maxRedemptions: parsed.data.maxRedemptions ?? null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      })
      .onConflictDoNothing({ target: [coupons.tenantId, coupons.code] })
      .returning({ code: coupons.code });
    if (inserted[0]) {
      revalidatePath("/dashboard/coupons");
      return ok({ code: inserted[0].code });
    }
    if (desired) return err("Dieser Code existiert bereits.");
    code = generateShortCode(8);
  }
  return err("Code konnte nicht erstellt werden.");
}

export async function setCouponActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "coupons:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(coupons)
    .set({ isActive })
    .where(and(eq(coupons.id, id), eq(coupons.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/coupons");
  return ok(undefined);
}

// --- Counter validation + redemption (coupons:operate) ---------------------

/** Staff-side validity check without redeeming (tenant-scoped). */
export async function checkCoupon(
  code: string,
): Promise<
  ActionResult<{
    valid: boolean;
    reason?: string;
    discountType: string;
    discountValue: number;
    description: string | null;
  }>
> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "coupons:read");
  if (!guard.allowed) return err(guard.reason);

  const rows = await db
    .select()
    .from(coupons)
    .where(
      and(
        eq(coupons.code, code.trim().toUpperCase()),
        eq(coupons.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  const coupon = rows[0];
  if (!coupon) return err("Code nicht gefunden.");

  const validity = couponValidity(coupon);
  return ok({
    valid: validity.valid,
    reason: validity.valid ? undefined : validity.reason,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    description: coupon.description,
  });
}

export async function redeemCoupon(
  code: string,
): Promise<ActionResult<{ discountType: string; discountValue: number }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "coupons:operate");
  if (!guard.allowed) return err(guard.reason);
  if (!(await couponsActive(ctx.tenant.id))) {
    return err("Coupon-Tool ist nicht aktiv.");
  }

  const normalized = code.trim().toUpperCase();
  const rows = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.code, normalized), eq(coupons.tenantId, ctx.tenant.id)))
    .limit(1);
  const coupon = rows[0];
  if (!coupon) return err("Code nicht gefunden.");

  const validity = couponValidity(coupon);
  if (!validity.valid) return err(validity.reason);

  // Atomically claim a redemption (guards the max under concurrency).
  const claimed = await db
    .update(coupons)
    .set({ redemptionCount: sql`${coupons.redemptionCount} + 1` })
    .where(
      and(
        eq(coupons.id, coupon.id),
        coupon.maxRedemptions != null
          ? sql`${coupons.redemptionCount} < ${coupon.maxRedemptions}`
          : sql`true`,
      ),
    )
    .returning({ id: coupons.id });
  if (!claimed[0]) return err("Dieser Code ist aufgebraucht.");

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  await db.insert(couponRedemptions).values({
    tenantId: ctx.tenant.id,
    couponId: coupon.id,
    ipHash: hashIp(ip),
  });

  revalidatePath("/dashboard/coupons");
  return ok({
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
  });
}
