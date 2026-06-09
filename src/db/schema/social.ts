import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./platform";

/**
 * Tool: Social Media Planner (a Buffer / Hootsuite style editorial calendar).
 * Plan and queue posts per channel. Actual publishing to networks requires
 * per-network OAuth and is out of scope; this is the planning + status layer.
 * Gated by `tool_active(tenant_id, 'social')`.
 */

export const SOCIAL_TOOL_KEY = "social" as const;

export const socialPostStatus = pgEnum("social_post_status", [
  "draft",
  "scheduled",
  "published",
]);

/** social_posts — a planned post targeting one or more channels. */
export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    // Array of channel keys, e.g. ["instagram", "facebook"].
    channels: jsonb("channels").notNull(),
    status: socialPostStatus("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("social_posts_tenant_idx").on(t.tenantId),
    scheduleIdx: index("social_posts_schedule_idx").on(
      t.tenantId,
      t.scheduledAt,
    ),
  }),
);
