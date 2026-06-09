import {
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
 * Tool: SEO & Local Listings (a BrightLocal / Yext / Moz Local style local-SEO
 * tool). Manages the store's canonical NAP profile (→ LocalBusiness JSON-LD)
 * and a keyword ranking tracker. Gated by `tool_active(tenant_id, 'seo')`.
 */

export const SEO_TOOL_KEY = "seo" as const;

/** seo_profiles — canonical business listing data (one per tenant). */
export const seoProfiles = pgTable(
  "seo_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    description: text("description"),
    street: text("street"),
    postalCode: text("postal_code"),
    city: text("city"),
    country: text("country").notNull().default("DE"),
    phone: text("phone"),
    website: text("website"),
    category: text("category"),
    // One opening-hours line per row, e.g. "Mo-Fr 09:00-18:00".
    openingHours: text("opening_hours"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantUnique: uniqueIndex("seo_profiles_tenant_unique").on(t.tenantId),
  }),
);

/** seo_keywords — target keywords being tracked. */
export const seoKeywords = pgTable(
  "seo_keywords",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
    location: text("location"),
    targetUrl: text("target_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("seo_keywords_tenant_idx").on(t.tenantId),
  }),
);

/** seo_rank_snapshots — immutable ranking history per keyword. */
export const seoRankSnapshots = pgTable(
  "seo_rank_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    keywordId: uuid("keyword_id")
      .notNull()
      .references(() => seoKeywords.id, { onDelete: "cascade" }),
    // SERP position (1 = top). 0/NULL semantics: store the observed rank.
    position: integer("position").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    keywordIdx: index("seo_rank_snapshots_keyword_idx").on(t.keywordId),
  }),
);
