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
 * Tool: Link-in-Bio (a Linktree style single public landing page with a list
 * of links). The public page lives at /bio/{tenant.slug}. Gated by
 * `tool_active(tenant_id, 'bio')`.
 */

export const BIO_TOOL_KEY = "bio" as const;

/** bio_pages — one configurable bio page per tenant. */
export const bioPages = pgTable(
  "bio_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    bioText: text("bio_text"),
    themeColor: text("theme_color").notNull().default("#1d4ed8"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantUnique: uniqueIndex("bio_pages_tenant_unique").on(t.tenantId),
  }),
);

/** bio_links — ordered links shown on the bio page, with click tracking. */
export const bioLinks = pgTable(
  "bio_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    bioPageId: uuid("bio_page_id")
      .notNull()
      .references(() => bioPages.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pageIdx: index("bio_links_page_idx").on(t.bioPageId),
  }),
);
