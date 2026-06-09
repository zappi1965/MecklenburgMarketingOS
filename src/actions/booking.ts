"use server";

import { z } from "zod";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  bookings,
  bookingServices,
  bookingSlots,
  tenants,
  tenantTools,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit";
import { generateShortCode } from "@/lib/nanoid";
import { sendMail } from "@/lib/mail";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const TOOL_KEY = "booking";

async function bookingActive(tenantId: string): Promise<boolean> {
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
// Admin (booking:manage)
// =============================================================================

const serviceSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(280).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(600).default(30),
  priceCents: z.coerce.number().int().min(0).max(1000000).optional(),
});

export async function createService(
  input: z.input<typeof serviceSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "booking:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const [service] = await db
    .insert(bookingServices)
    .values({
      tenantId: ctx.tenant.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      durationMinutes: parsed.data.durationMinutes,
      priceCents: parsed.data.priceCents ?? null,
    })
    .returning({ id: bookingServices.id });

  revalidatePath("/dashboard/booking");
  return ok({ id: service.id });
}

const slotSchema = z
  .object({
    serviceId: z.string().uuid(),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    capacity: z.coerce.number().int().min(1).max(1000).default(1),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: "Das Ende muss nach dem Start liegen.",
    path: ["endsAt"],
  });

export async function createSlot(
  input: z.input<typeof slotSchema>,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "booking:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = slotSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const service = await db
    .select({ id: bookingServices.id })
    .from(bookingServices)
    .where(
      and(
        eq(bookingServices.id, parsed.data.serviceId),
        eq(bookingServices.tenantId, ctx.tenant.id),
      ),
    )
    .limit(1);
  if (!service[0]) return err("Service nicht gefunden.");

  const [slot] = await db
    .insert(bookingSlots)
    .values({
      tenantId: ctx.tenant.id,
      serviceId: parsed.data.serviceId,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      capacity: parsed.data.capacity,
    })
    .returning({ id: bookingSlots.id });

  revalidatePath("/dashboard/booking");
  return ok({ id: slot.id });
}

// =============================================================================
// Public availability + booking
// =============================================================================

export type Availability = {
  tenantName: string;
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number | null;
    slots: { id: string; startsAt: string; endsAt: string; remaining: number }[];
  }[];
};

export async function getAvailability(
  slug: string,
): Promise<ActionResult<Availability>> {
  const tenantRows = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  const tenant = tenantRows[0];
  if (!tenant) return err("Store nicht gefunden.");
  if (!(await bookingActive(tenant.id))) {
    return err("Buchung ist für diesen Store derzeit nicht verfügbar.");
  }

  const services = await db
    .select()
    .from(bookingServices)
    .where(
      and(
        eq(bookingServices.tenantId, tenant.id),
        eq(bookingServices.isActive, true),
      ),
    );

  const now = new Date();
  const slots = await db
    .select()
    .from(bookingSlots)
    .where(
      and(
        eq(bookingSlots.tenantId, tenant.id),
        eq(bookingSlots.isActive, true),
        gt(bookingSlots.startsAt, now),
      ),
    )
    .orderBy(asc(bookingSlots.startsAt));

  return ok({
    tenantName: tenant.name,
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      slots: slots
        .filter((sl) => sl.serviceId === s.id && sl.bookedCount < sl.capacity)
        .map((sl) => ({
          id: sl.id,
          startsAt: sl.startsAt.toISOString(),
          endsAt: sl.endsAt.toISOString(),
          remaining: sl.capacity - sl.bookedCount,
        })),
    })),
  });
}

const createBookingSchema = z.object({
  slotId: z.string().uuid(),
  customerName: z.string().min(2, "Bitte deinen Namen eingeben.").max(80),
  customerEmail: z.string().email().optional().or(z.literal("")),
});

export async function createBooking(
  input: z.input<typeof createBookingSchema>,
): Promise<ActionResult<{ code: string; startsAt: string }>> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const slotRows = await db
    .select()
    .from(bookingSlots)
    .where(eq(bookingSlots.id, parsed.data.slotId))
    .limit(1);
  const slot = slotRows[0];
  if (!slot || !slot.isActive) return err("Dieser Termin ist nicht verfügbar.");
  if (slot.startsAt.getTime() < Date.now()) {
    return err("Dieser Termin liegt in der Vergangenheit.");
  }
  if (!(await bookingActive(slot.tenantId))) {
    return err("Buchung ist derzeit nicht verfügbar.");
  }

  // Atomically claim a seat (guards against overbooking under concurrency).
  const claimed = await db
    .update(bookingSlots)
    .set({ bookedCount: sql`${bookingSlots.bookedCount} + 1` })
    .where(
      and(
        eq(bookingSlots.id, slot.id),
        sql`${bookingSlots.bookedCount} < ${bookingSlots.capacity}`,
      ),
    )
    .returning({ id: bookingSlots.id });
  if (!claimed[0]) return err("Dieser Termin ist bereits ausgebucht.");

  const code = generateShortCode();
  const email = parsed.data.customerEmail?.toLowerCase() || null;
  await db.insert(bookings).values({
    tenantId: slot.tenantId,
    slotId: slot.id,
    serviceId: slot.serviceId,
    customerName: parsed.data.customerName,
    customerEmail: email,
    status: "confirmed",
    code,
  });

  // Confirmation email (no-op when no mail provider configured).
  if (email) {
    const when = slot.startsAt.toLocaleString("de-DE");
    await sendMail({
      to: email,
      subject: `Terminbestätigung – Code ${code}`,
      html: `<p>Hallo ${parsed.data.customerName},</p>
        <p>dein Termin am <strong>${when}</strong> ist bestätigt.</p>
        <p>Dein Bestätigungscode: <strong>${code}</strong></p>`,
    });
  }

  return ok({ code, startsAt: slot.startsAt.toISOString() });
}

// =============================================================================
// Counter (booking:operate)
// =============================================================================

export async function cancelBooking(
  bookingId: string,
): Promise<ActionResult<void>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "booking:operate");
  if (!guard.allowed) return err(guard.reason);

  const rows = await db
    .select()
    .from(bookings)
    .where(
      and(eq(bookings.id, bookingId), eq(bookings.tenantId, ctx.tenant.id)),
    )
    .limit(1);
  const booking = rows[0];
  if (!booking) return err("Buchung nicht gefunden.");
  if (booking.status === "cancelled") return err("Bereits storniert.");

  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(eq(bookings.id, booking.id));

  // Free the seat.
  await db
    .update(bookingSlots)
    .set({ bookedCount: sql`greatest(${bookingSlots.bookedCount} - 1, 0)` })
    .where(eq(bookingSlots.id, booking.slotId));

  await writeAuditLog({
    tenantId: ctx.tenant.id,
    actorId: ctx.userId,
    action: "update",
    entityTable: "bookings",
    entityId: booking.id,
    diff: { status: "cancelled" },
  });

  revalidatePath("/dashboard/booking");
  return ok(undefined);
}
