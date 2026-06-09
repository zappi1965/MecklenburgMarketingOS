"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { shortLinks } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { generateShortCode } from "@/lib/nanoid";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const createSchema = z.object({
  destinationUrl: z.string().url("Bitte eine gültige Ziel-URL eingeben."),
  title: z.string().max(120).optional(),
  utmSource: z.string().max(80).optional(),
  utmMedium: z.string().max(80).optional(),
  utmCampaign: z.string().max(80).optional(),
});

export async function createShortLink(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<{ code: string; url: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "links:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  let code = generateShortCode(7);
  let created: { code: string } | null = null;
  for (let i = 0; i < 5; i++) {
    const inserted = await db
      .insert(shortLinks)
      .values({
        tenantId: ctx.tenant.id,
        code,
        destinationUrl: parsed.data.destinationUrl,
        title: parsed.data.title || null,
        utmSource: parsed.data.utmSource || null,
        utmMedium: parsed.data.utmMedium || null,
        utmCampaign: parsed.data.utmCampaign || null,
      })
      .onConflictDoNothing({ target: shortLinks.code })
      .returning({ code: shortLinks.code });
    if (inserted[0]) {
      created = inserted[0];
      break;
    }
    code = generateShortCode(7);
  }
  if (!created) return err("Link konnte nicht erstellt werden.");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  revalidatePath("/dashboard/links");
  return ok({ code: created.code, url: `${base}/l/${created.code}` });
}

export async function setShortLinkActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "links:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(shortLinks)
    .set({ isActive })
    .where(and(eq(shortLinks.id, id), eq(shortLinks.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/links");
  return ok(undefined);
}

export async function deleteShortLink(id: string): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "links:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(shortLinks)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(shortLinks.id, id), eq(shortLinks.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/links");
  return ok(undefined);
}
