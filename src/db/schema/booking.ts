import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./platform";

/**
 * Tool 4: Booking / POS.
 *
 * Slot-based appointment booking for store services, plus a POS surface that
 * credits loyalty points at the counter. Tenant-scoped and gated by
 * `tool_active(tenant_id, 'booking')` in RLS.
 */

export const BOOKING_TOOL_KEY = "booking" as const;

export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
]);

/** booking_services — the catalogue of bookable services. */
export const bookingServices = pgTable(
  "booking_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    priceCents: integer("price_cents"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("booking_services_tenant_idx").on(t.tenantId),
  }),
);

/** booking_slots — concrete bookable time windows with a capacity. */
export const bookingSlots = pgTable(
  "booking_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => bookingServices.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    capacity: integer("capacity").notNull().default(1),
    bookedCount: integer("booked_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    serviceIdx: index("booking_slots_service_idx").on(t.serviceId),
    windowIdx: index("booking_slots_window_idx").on(t.tenantId, t.startsAt),
  }),
);

/** bookings — a customer's reservation of a slot. `deletedAt` for DSGVO. */
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => bookingSlots.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => bookingServices.id, { onDelete: "cascade" }),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email"),
    status: bookingStatus("status").notNull().default("confirmed"),
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    codeUnique: uniqueIndex("bookings_code_unique").on(t.code),
    slotIdx: index("bookings_slot_idx").on(t.slotId),
    tenantIdx: index("bookings_tenant_idx").on(t.tenantId),
  }),
);
