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
import { loyaltyMembers } from "./loyalty";

/**
 * Tool: Retention / Win-Back (a Klaviyo win-back-flow style customer
 * reactivation tool). Identifies loyalty members who have gone quiet and
 * re-engages them with bonus points + an email. Builds on the loyalty ledger
 * and the consent ledger. Gated by `tool_active(tenant_id, 'retention')`.
 */

export const RETENTION_TOOL_KEY = "retention" as const;

export const retentionStatus = pgEnum("retention_campaign_status", [
  "draft",
  "sent",
]);

/** retention_campaigns — a win-back action configuration + run record. */
export const retentionCampaigns = pgTable(
  "retention_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Members with no activity for at least this many days are targeted.
    inactiveDays: integer("inactive_days").notNull().default(60),
    // Loyalty points credited as the comeback incentive.
    bonusPoints: integer("bonus_points").notNull().default(50),
    // Whether to email consented targets in addition to crediting points.
    sendEmail: boolean("send_email").notNull().default(true),
    message: text("message"),
    status: retentionStatus("status").notNull().default("draft"),
    targetedCount: integer("targeted_count").notNull().default(0),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("retention_campaigns_tenant_idx").on(t.tenantId),
  }),
);

/** retention_targets — immutable log of who a campaign reached. */
export const retentionTargets = pgTable(
  "retention_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => retentionCampaigns.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => loyaltyMembers.id, { onDelete: "cascade" }),
    emailed: boolean("emailed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    targetUnique: uniqueIndex("retention_targets_campaign_member_unique").on(
      t.campaignId,
      t.memberId,
    ),
  }),
);
