"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { seoKeywords, seoProfiles, seoRankSnapshots } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

// =============================================================================
// Profile (seo:manage)
// =============================================================================

const profileSchema = z.object({
  businessName: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  street: z.string().max(120).optional(),
  postalCode: z.string().max(12).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(2).default("DE"),
  phone: z.string().max(40).optional(),
  website: z.string().url("Bitte eine gültige URL.").optional().or(z.literal("")),
  category: z.string().max(60).optional(),
  openingHours: z.string().max(500).optional(),
});

export async function upsertSeoProfile(
  input: z.input<typeof profileSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "seo:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;

  const [profile] = await db
    .insert(seoProfiles)
    .values({
      tenantId: ctx.tenant.id,
      businessName: d.businessName,
      description: d.description || null,
      street: d.street || null,
      postalCode: d.postalCode || null,
      city: d.city || null,
      country: d.country || "DE",
      phone: d.phone || null,
      website: d.website || null,
      category: d.category || null,
      openingHours: d.openingHours || null,
    })
    .onConflictDoUpdate({
      target: seoProfiles.tenantId,
      set: {
        businessName: d.businessName,
        description: d.description || null,
        street: d.street || null,
        postalCode: d.postalCode || null,
        city: d.city || null,
        country: d.country || "DE",
        phone: d.phone || null,
        website: d.website || null,
        category: d.category || null,
        openingHours: d.openingHours || null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: seoProfiles.id });

  revalidatePath("/dashboard/seo");
  return ok({ id: profile.id });
}

// =============================================================================
// Keywords + rank logging (seo:manage)
// =============================================================================

const keywordSchema = z.object({
  keyword: z.string().min(2).max(120),
  location: z.string().max(80).optional(),
  targetUrl: z.string().url().optional().or(z.literal("")),
});

export async function addKeyword(
  input: z.input<typeof keywordSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "seo:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = keywordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [row] = await db
    .insert(seoKeywords)
    .values({
      tenantId: ctx.tenant.id,
      keyword: parsed.data.keyword,
      location: parsed.data.location || null,
      targetUrl: parsed.data.targetUrl || null,
    })
    .returning({ id: seoKeywords.id });

  revalidatePath("/dashboard/seo");
  return ok({ id: row.id });
}

export async function deleteKeyword(
  keywordId: string,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "seo:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .delete(seoKeywords)
    .where(
      and(eq(seoKeywords.id, keywordId), eq(seoKeywords.tenantId, ctx.tenant.id)),
    );
  revalidatePath("/dashboard/seo");
  return ok(undefined);
}

const rankSchema = z.object({
  keywordId: z.string().uuid(),
  position: z.coerce.number().int().min(1).max(200),
});

/** Logs a ranking observation for a keyword (immutable history). */
export async function logRank(
  input: z.input<typeof rankSchema>,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "seo:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = rankSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  // Verify the keyword belongs to the tenant.
  const kw = await db
    .select({ id: seoKeywords.id })
    .from(seoKeywords)
    .where(
      and(
        eq(seoKeywords.id, parsed.data.keywordId),
        eq(seoKeywords.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  if (!kw[0]) return err("Keyword nicht gefunden.");

  await db.insert(seoRankSnapshots).values({
    tenantId: ctx.tenant.id,
    keywordId: parsed.data.keywordId,
    position: parsed.data.position,
  });

  revalidatePath("/dashboard/seo");
  return ok(undefined);
}
