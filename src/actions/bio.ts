"use server";

import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bioLinks, bioPages } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const pageSchema = z.object({
  title: z.string().min(1).max(80),
  bioText: z.string().max(300).optional(),
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Bitte einen Hex-Farbwert wählen.")
    .default("#1d4ed8"),
});

/** Gets or creates the tenant's bio page id. */
async function ensureBioPage(tenantId: string): Promise<string> {
  const existing = await db
    .select({ id: bioPages.id })
    .from(bioPages)
    .where(eq(bioPages.tenantId, tenantId))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const [created] = await db
    .insert(bioPages)
    .values({ tenantId, title: "Meine Links" })
    .returning({ id: bioPages.id });
  return created.id;
}

export async function upsertBioPage(
  input: z.input<typeof pageSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "bio:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [page] = await db
    .insert(bioPages)
    .values({
      tenantId: ctx.tenant.id,
      title: parsed.data.title,
      bioText: parsed.data.bioText || null,
      themeColor: parsed.data.themeColor,
    })
    .onConflictDoUpdate({
      target: bioPages.tenantId,
      set: {
        title: parsed.data.title,
        bioText: parsed.data.bioText || null,
        themeColor: parsed.data.themeColor,
        updatedAt: new Date(),
      },
    })
    .returning({ id: bioPages.id });

  revalidatePath("/dashboard/bio");
  return ok({ id: page.id });
}

const linkSchema = z.object({
  label: z.string().min(1).max(80),
  url: z.string().url("Bitte eine gültige URL eingeben."),
});

export async function addBioLink(
  input: z.input<typeof linkSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "bio:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const pageId = await ensureBioPage(ctx.tenant.id);
  const existing = await db
    .select({ value: count() })
    .from(bioLinks)
    .where(eq(bioLinks.bioPageId, pageId));

  const [link] = await db
    .insert(bioLinks)
    .values({
      tenantId: ctx.tenant.id,
      bioPageId: pageId,
      label: parsed.data.label,
      url: parsed.data.url,
      position: existing[0]?.value ?? 0,
    })
    .returning({ id: bioLinks.id });

  revalidatePath("/dashboard/bio");
  return ok({ id: link.id });
}

export async function setBioLinkActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "bio:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .update(bioLinks)
    .set({ isActive })
    .where(and(eq(bioLinks.id, id), eq(bioLinks.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/bio");
  return ok(undefined);
}

export async function deleteBioLink(id: string): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "bio:manage");
  if (!guard.allowed) return err(guard.reason);

  await db
    .delete(bioLinks)
    .where(and(eq(bioLinks.id, id), eq(bioLinks.tenantId, ctx.tenant.id)));
  revalidatePath("/dashboard/bio");
  return ok(undefined);
}
