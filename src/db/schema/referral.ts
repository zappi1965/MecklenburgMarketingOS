import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./platform";
import { loyaltyMembers } from "./loyalty";

/**
 * Tool: Referral / Empfehlungsprogramm (a ReferralCandy / Mention Me style
 * "customers refer customers" engine). Both referrer and referee earn loyalty
 * points, so this tool builds on the loyalty ledger. Gated by
 * `tool_active(tenant_id, 'referral')` in RLS.
 */

export const REFERRAL_TOOL_KEY = "referral" as const;

/** referral_programs — one bonus configuration per tenant. */
export const referralPrograms = pgTable(
  "referral_programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    referrerBonus: integer("referrer_bonus").notNull().default(50),
    refereeBonus: integer("referee_bonus").notNull().default(25),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantUnique: uniqueIndex("referral_programs_tenant_unique").on(t.tenantId),
  }),
);

/** referral_codes — a share code per referring member. */
export const referralCodes = pgTable(
  "referral_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => loyaltyMembers.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    codeUnique: uniqueIndex("referral_codes_code_unique").on(t.code),
    memberUnique: uniqueIndex("referral_codes_member_unique").on(t.memberId),
  }),
);

/**
 * referrals — a completed referral. The unique referee constraint prevents a
 * customer from being rewarded as a referee more than once per tenant.
 */
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    referrerMemberId: uuid("referrer_member_id")
      .notNull()
      .references(() => loyaltyMembers.id, { onDelete: "cascade" }),
    refereeMemberId: uuid("referee_member_id")
      .notNull()
      .references(() => loyaltyMembers.id, { onDelete: "cascade" }),
    referrerBonus: integer("referrer_bonus").notNull(),
    refereeBonus: integer("referee_bonus").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    refereeUnique: uniqueIndex("referrals_referee_unique").on(
      t.tenantId,
      t.refereeMemberId,
    ),
    referrerIdx: index("referrals_referrer_idx").on(t.referrerMemberId),
  }),
);
