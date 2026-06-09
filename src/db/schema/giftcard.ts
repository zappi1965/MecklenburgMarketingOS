import {
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
 * Tool: Gift Cards & Vouchers (a Square Gift Cards / Yiftee style stored-value
 * tool). Issue prepaid codes, redeem partial amounts at the counter, check
 * balance publicly. Gated by `tool_active(tenant_id, 'giftcards')`.
 */

export const GIFTCARDS_TOOL_KEY = "giftcards" as const;

export const giftCardStatus = pgEnum("gift_card_status", [
  "active",
  "redeemed", // balance reached zero
  "cancelled",
]);

export const giftCardTxnType = pgEnum("gift_card_txn_type", [
  "issue",
  "redeem",
  "topup",
  "cancel",
]);

/** gift_cards — a stored-value voucher. `deletedAt` for DSGVO (recipient PII). */
export const giftCards = pgTable(
  "gift_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    initialAmountCents: integer("initial_amount_cents").notNull(),
    balanceCents: integer("balance_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    recipientName: text("recipient_name"),
    recipientEmail: text("recipient_email"),
    message: text("message"),
    status: giftCardStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    codeUnique: uniqueIndex("gift_cards_code_unique").on(t.code),
    tenantIdx: index("gift_cards_tenant_idx").on(t.tenantId),
  }),
);

/** gift_card_transactions — immutable stored-value ledger. */
export const giftCardTransactions = pgTable(
  "gift_card_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    giftCardId: uuid("gift_card_id")
      .notNull()
      .references(() => giftCards.id, { onDelete: "cascade" }),
    type: giftCardTxnType("type").notNull(),
    // Signed cents: positive = load, negative = redeem.
    amountCents: integer("amount_cents").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    cardIdx: index("gift_card_transactions_card_idx").on(t.giftCardId),
  }),
);
