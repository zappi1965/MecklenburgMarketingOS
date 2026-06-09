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

/**
 * Tool: Link Shortener & UTM Builder (a Bitly / Rebrandly style tool used by
 * marketing agencies for trackable campaign links). Gated by
 * `tool_active(tenant_id, 'links')`.
 */

export const LINKS_TOOL_KEY = "links" as const;

/** short_links — a trackable short URL with optional UTM parameters. */
export const shortLinks = pgTable(
  "short_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    destinationUrl: text("destination_url").notNull(),
    title: text("title"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    clickCount: integer("click_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    codeUnique: uniqueIndex("short_links_code_unique").on(t.code),
    tenantIdx: index("short_links_tenant_idx").on(t.tenantId),
  }),
);

/** short_link_clicks — immutable click log (basis for analytics). */
export const shortLinkClicks = pgTable(
  "short_link_clicks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    shortLinkId: uuid("short_link_id")
      .notNull()
      .references(() => shortLinks.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    referer: text("referer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    linkIdx: index("short_link_clicks_link_idx").on(t.shortLinkId),
  }),
);
