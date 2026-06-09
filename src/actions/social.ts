"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { socialPosts } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { SOCIAL_CHANNEL_KEYS } from "@/lib/social";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const createSchema = z.object({
  content: z.string().min(1, "Bitte einen Text eingeben.").max(2000),
  channels: z
    .array(z.enum(SOCIAL_CHANNEL_KEYS as [string, ...string[]]))
    .min(1, "Bitte mindestens einen Kanal wählen."),
  scheduledAt: z.string().optional(),
});

export async function createPost(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "social:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const scheduledAt =
    parsed.data.scheduledAt && parsed.data.scheduledAt.length
      ? new Date(parsed.data.scheduledAt)
      : null;

  const [post] = await db
    .insert(socialPosts)
    .values({
      tenantId: ctx.tenant.id,
      content: parsed.data.content,
      channels: parsed.data.channels,
      status: scheduledAt ? "scheduled" : "draft",
      scheduledAt,
    })
    .returning({ id: socialPosts.id });

  revalidatePath("/dashboard/social");
  return ok({ id: post.id });
}

export async function markPostPublished(
  id: string,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "social:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(socialPosts)
    .set({ status: "published", publishedAt: new Date() })
    .where(and(eq(socialPosts.id, id), eq(socialPosts.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/social");
  return ok(undefined);
}

export async function deletePost(id: string): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "social:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .delete(socialPosts)
    .where(and(eq(socialPosts.id, id), eq(socialPosts.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/social");
  return ok(undefined);
}
