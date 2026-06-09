"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  reviewInvitations,
  reviews,
  reviewSources,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { recordConsent } from "@/lib/consent";
import { generateToken } from "@/lib/nanoid";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

// =============================================================================
// Admin: invitations, sources, responses (RBAC reviews:manage)
// =============================================================================

const inviteSchema = z.object({
  recipientEmail: z.string().email().optional().or(z.literal("")),
  recipientName: z.string().max(80).optional(),
});

export async function createInvitation(
  input: z.input<typeof inviteSchema>,
): Promise<ActionResult<{ token: string; url: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "reviews:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const token = generateToken();
  await db.insert(reviewInvitations).values({
    tenantId: ctx.tenant.id,
    token,
    recipientEmail: parsed.data.recipientEmail?.toLowerCase() || null,
    recipientName: parsed.data.recipientName || null,
    status: "pending",
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  revalidatePath("/dashboard/reviews");
  return ok({ token, url: `${base}/review/${token}` });
}

const sourceSchema = z.object({
  label: z.string().min(2).max(80),
  externalUrl: z.string().url("Bitte eine gültige URL eingeben.").optional().or(z.literal("")),
  redirectThreshold: z.coerce.number().int().min(1).max(5).default(4),
  type: z.enum(["internal", "google"]).default("google"),
});

export async function upsertReviewSource(
  input: z.input<typeof sourceSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "reviews:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = sourceSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  // One source per type per tenant — replace if it exists.
  const existing = await db
    .select({ id: reviewSources.id })
    .from(reviewSources)
    .where(
      and(
        eq(reviewSources.tenantId, ctx.tenant.id),
        eq(reviewSources.type, parsed.data.type),
      ),
    )
    .limit(1);

  let id: string;
  if (existing[0]) {
    await db
      .update(reviewSources)
      .set({
        label: parsed.data.label,
        externalUrl: parsed.data.externalUrl || null,
        redirectThreshold: parsed.data.redirectThreshold,
      })
      .where(eq(reviewSources.id, existing[0].id));
    id = existing[0].id;
  } else {
    const [row] = await db
      .insert(reviewSources)
      .values({
        tenantId: ctx.tenant.id,
        type: parsed.data.type,
        label: parsed.data.label,
        externalUrl: parsed.data.externalUrl || null,
        redirectThreshold: parsed.data.redirectThreshold,
      })
      .returning({ id: reviewSources.id });
    id = row.id;
  }

  revalidatePath("/dashboard/reviews");
  return ok({ id });
}

const respondSchema = z.object({
  reviewId: z.string().uuid(),
  response: z.string().min(1).max(2000),
});

export async function respondToReview(
  input: z.input<typeof respondSchema>,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "reviews:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  await db
    .update(reviews)
    .set({ response: parsed.data.response, respondedAt: new Date() })
    .where(
      and(
        eq(reviews.id, parsed.data.reviewId),
        eq(reviews.tenantId, ctx.tenant.id),
      ),
    );

  await writeAuditLog({
    tenantId: ctx.tenant.id,
    actorId: ctx.userId,
    action: "update",
    entityTable: "reviews",
    entityId: parsed.data.reviewId,
    diff: { responded: true },
  });

  revalidatePath(`/dashboard/reviews/${parsed.data.reviewId}`);
  return ok(undefined);
}

// =============================================================================
// Public: load invitation context + submit a review
// =============================================================================

export type InvitationContext = {
  valid: boolean;
  tenantName: string | null;
  completed: boolean;
};

export async function getInvitation(
  token: string,
): Promise<ActionResult<{ tenantId: string; status: string }>> {
  const rows = await db
    .select({
      tenantId: reviewInvitations.tenantId,
      status: reviewInvitations.status,
      expiresAt: reviewInvitations.expiresAt,
    })
    .from(reviewInvitations)
    .where(eq(reviewInvitations.token, token))
    .limit(1);
  const inv = rows[0];
  if (!inv) return err("Ungültiger Einladungslink.");
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) {
    return err("Dieser Einladungslink ist abgelaufen.");
  }
  return ok({ tenantId: inv.tenantId, status: inv.status });
}

const submitSchema = z.object({
  token: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  authorName: z.string().max(80).optional(),
  authorEmail: z.string().email().optional().or(z.literal("")),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Bitte stimme der Speicherung zu." }),
  }),
});

export type SubmitReviewResult = {
  thanks: true;
  /** Set when the rating qualifies for a Google redirect. */
  googleUrl: string | null;
};

/**
 * Public review submission via an invitation token. Records consent
 * (review_publication) before storing, marks the invitation complete, and
 * returns a Google review URL when the rating meets the redirect threshold.
 */
export async function submitReview(
  input: z.input<typeof submitSchema>,
): Promise<ActionResult<SubmitReviewResult>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const invRows = await db
    .select()
    .from(reviewInvitations)
    .where(eq(reviewInvitations.token, parsed.data.token))
    .limit(1);
  const inv = invRows[0];
  if (!inv) return err("Ungültiger Einladungslink.");
  if (inv.status === "completed") return err("Diese Bewertung wurde bereits abgegeben.");
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) {
    return err("Dieser Einladungslink ist abgelaufen.");
  }

  const email = parsed.data.authorEmail?.toLowerCase() || null;
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");

  // Consent first (DSGVO), then store the review.
  await recordConsent(
    {
      tenantId: inv.tenantId,
      purpose: "review_publication",
      subjectEmail: email,
    },
    true,
    { ip, userAgent: h.get("user-agent"), source: "review_form" },
  );

  await db.insert(reviews).values({
    tenantId: inv.tenantId,
    invitationId: inv.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
    authorName: parsed.data.authorName || inv.recipientName || null,
    authorEmail: email || inv.recipientEmail || null,
  });

  await db
    .update(reviewInvitations)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(reviewInvitations.id, inv.id));

  // Google redirect for happy customers.
  let googleUrl: string | null = null;
  const sources = await db
    .select()
    .from(reviewSources)
    .where(
      and(
        eq(reviewSources.tenantId, inv.tenantId),
        eq(reviewSources.type, "google"),
      ),
    )
    .limit(1);
  const source = sources[0];
  if (
    source?.externalUrl &&
    parsed.data.rating >= source.redirectThreshold
  ) {
    googleUrl = source.externalUrl;
  }

  return ok({ thanks: true, googleUrl });
}
