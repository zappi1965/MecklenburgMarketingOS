import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./platform";

/**
 * Tool 1: Loyalty & QR campaigns (hero feature).
 *
 * All tables are tenant-scoped and additionally gated by
 * `tool_active(tenant_id, 'loyalty')` in RLS — cancelling the tool
 * subscription instantly cuts off data access with no app code.
 */

export const LOYALTY_TOOL_KEY = "loyalty" as const;

// --- Enums -----------------------------------------------------------------

/** What a QR code points at when scanned. */
export const qrTargetType = pgEnum("qr_target_type", [
  "stamp", // award points / a stamp
  "reward", // direct reward link
  "review", // bridge into the reviews tool
]);

/** Loyalty ledger entry direction / cause. */
export const loyaltyTxnType = pgEnum("loyalty_txn_type", [
  "scan", // points earned from a scan (positive)
  "bonus", // manual / campaign bonus (positive)
  "redemption", // points spent on a reward (negative)
  "adjustment", // manual correction (signed)
  "expiry", // points expired (negative)
]);

/** Redemption state machine. */
export const redemptionStatus = pgEnum("redemption_status", [
  "pending",
  "confirmed",
  "cancelled",
  "expired",
]);

// --- Tables ----------------------------------------------------------------

/**
 * loyalty_programs — a tenant may run several (e.g. one per branch).
 * `pointsPerScan` and stamp-card config define the earning rules.
 */
export const loyaltyPrograms = pgTable(
  "loyalty_programs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    pointsPerScan: integer("points_per_scan").notNull().default(1),
    // Stamp-card model: how many stamps complete one card.
    stampsPerCard: integer("stamps_per_card"),
    // Anti-abuse: minimum minutes between two earning scans per member.
    scanCooldownMinutes: integer("scan_cooldown_minutes").notNull().default(60),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("loyalty_programs_tenant_idx").on(t.tenantId),
  }),
);

/**
 * qr_codes — each carries a unique `token` (nanoid) → scan URL /scan/{token}.
 * Publicly readable when active; token validation happens in the app layer.
 */
export const qrCodes = pgTable(
  "qr_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    label: text("label"),
    targetType: qrTargetType("target_type").notNull().default("stamp"),
    // Points awarded by this specific code (overrides program default if set).
    pointsOverride: integer("points_override"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenUnique: uniqueIndex("qr_codes_token_unique").on(t.token),
    programIdx: index("qr_codes_program_idx").on(t.programId),
  }),
);

/**
 * loyalty_members — end customers of the store. No PII is required (UUID-based
 * accounts); `deletedAt` enables DSGVO soft-delete.
 */
export const loyaltyMembers = pgTable(
  "loyalty_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
    // Optional PII — present only when the member opts in.
    email: text("email"),
    displayName: text("display_name"),
    // Denormalised running balance (kept in sync with the ledger).
    pointsBalance: integer("points_balance").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    programIdx: index("loyalty_members_program_idx").on(t.programId),
    emailIdx: index("loyalty_members_email_idx").on(t.tenantId, t.email),
  }),
);

/**
 * qr_scans — immutable scan trail. Basis for points + analytics.
 * Never updated or deleted by tenants.
 */
export const qrScans = pgTable(
  "qr_scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    qrCodeId: uuid("qr_code_id")
      .notNull()
      .references(() => qrCodes.id, { onDelete: "cascade" }),
    // Null until the scan is associated with a member (anonymous-first flow).
    memberId: uuid("member_id").references(() => loyaltyMembers.id, {
      onDelete: "set null",
    }),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    // True when the cooldown rejected the earn (scan still recorded).
    rejectedByCooldown: boolean("rejected_by_cooldown")
      .notNull()
      .default(false),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    codeIdx: index("qr_scans_code_idx").on(t.qrCodeId),
    memberIdx: index("qr_scans_member_idx").on(t.memberId),
    tenantCreatedIdx: index("qr_scans_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
  }),
);

/**
 * loyalty_transactions — the points ledger. Positive = credit,
 * negative = redemption. Immutable; balance is derived from the sum.
 */
export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => loyaltyMembers.id, { onDelete: "cascade" }),
    type: loyaltyTxnType("type").notNull(),
    // Signed point delta. Positive credits, negative debits.
    points: integer("points").notNull(),
    // Optional provenance links.
    scanId: uuid("scan_id").references(() => qrScans.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    memberIdx: index("loyalty_transactions_member_idx").on(t.memberId),
    tenantIdx: index("loyalty_transactions_tenant_idx").on(t.tenantId),
  }),
);

/**
 * loyalty_rewards — the reward catalogue per program.
 */
export const loyaltyRewards = pgTable(
  "loyalty_rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    pointsCost: integer("points_cost").notNull(),
    // Optional stock cap; null = unlimited.
    inventory: integer("inventory"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    programIdx: index("loyalty_rewards_program_idx").on(t.programId),
  }),
);

/**
 * loyalty_campaigns — time-boxed bonus multipliers with an optional scan cap.
 * While an active campaign covers `now`, scans earn `pointsPerScan * multiplier`.
 */
export const loyaltyCampaigns = pgTable(
  "loyalty_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Points multiplier applied to earning scans (2 = double points).
    multiplier: integer("multiplier").notNull().default(2),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    // Optional cap on the number of bonus scans; null = unlimited.
    maxScans: integer("max_scans"),
    // Running count of bonus scans applied (against maxScans).
    scanCount: integer("scan_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    programIdx: index("loyalty_campaigns_program_idx").on(t.programId),
    windowIdx: index("loyalty_campaigns_window_idx").on(
      t.tenantId,
      t.startsAt,
      t.endsAt,
    ),
  }),
);

/**
 * loyalty_redemptions — state machine: pending → confirmed / cancelled / expired.
 * `code` is the short token the customer presents at the counter (/redeem/{code}).
 */
export const loyaltyRedemptions = pgTable(
  "loyalty_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => loyaltyMembers.id, { onDelete: "cascade" }),
    rewardId: uuid("reward_id")
      .notNull()
      .references(() => loyaltyRewards.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    status: redemptionStatus("status").notNull().default("pending"),
    pointsSpent: integer("points_spent").notNull(),
    // Ledger entry that debited the points (set on creation).
    transactionId: uuid("transaction_id").references(
      () => loyaltyTransactions.id,
      { onDelete: "set null" },
    ),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    codeUnique: uniqueIndex("loyalty_redemptions_code_unique").on(t.code),
    memberIdx: index("loyalty_redemptions_member_idx").on(t.memberId),
  }),
);
