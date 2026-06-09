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
 * Tool: Coupons / Promo-Codes. Percentage or fixed-amount discount codes with
 * validity windows and redemption limits, validated/redeemed at the counter.
 * Distinct from gift cards (stored value). Gated by
 * `tool_active(tenant_id, 'coupons')`.
 */

export const COUPONS_TOOL_KEY = "coupons" as const;

export const discountType = pgEnum("coupon_discount_type", ["percent", "fixed"]);

/** coupons — a discount code. */
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    description: text("description"),
    discountType: discountType("discount_type").notNull().default("percent"),
    // percent: 1–100; fixed: amount in cents.
    discountValue: integer("discount_value").notNull(),
    maxRedemptions: integer("max_redemptions"),
    redemptionCount: integer("redemption_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    codeUnique: uniqueIndex("coupons_tenant_code_unique").on(t.tenantId, t.code),
    tenantIdx: index("coupons_tenant_idx").on(t.tenantId),
  }),
);

/** coupon_redemptions — immutable redemption log. */
export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    couponIdx: index("coupon_redemptions_coupon_idx").on(t.couponId),
  }),
);
