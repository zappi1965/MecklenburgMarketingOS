import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./platform";

/**
 * Tool: SumUp — Umsatz & Payment-Links. Tracks revenue (manual entries +
 * API-created checkouts) and creates SumUp hosted payment links. Gated by
 * `tool_active(tenant_id, 'sumup')`.
 */

export const SUMUP_TOOL_KEY = "sumup" as const;

export const sumupTxnStatus = pgEnum("sumup_txn_status", [
  "pending",
  "paid",
  "failed",
]);

export const sumupTxnSource = pgEnum("sumup_txn_source", ["manual", "sumup"]);

/** sumup_transactions — a revenue record (manual sale or SumUp checkout). */
export const sumupTransactions = pgTable(
  "sumup_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    reference: text("reference").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    description: text("description"),
    status: sumupTxnStatus("status").notNull().default("pending"),
    source: sumupTxnSource("source").notNull().default("manual"),
    checkoutId: text("checkout_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("sumup_transactions_tenant_idx").on(t.tenantId),
    statusIdx: index("sumup_transactions_status_idx").on(t.tenantId, t.status),
  }),
);
