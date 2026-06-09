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
 * Tool: Newsletter & CRM-Mail (a Mailchimp / Brevo style email-marketing tool).
 *
 * Subscription state is NOT stored here — it lives in the platform consent
 * ledger (purpose 'marketing_email'). Contacts are the audience; sending is
 * gated on confirmed double-opt-in consent. Gated by
 * `tool_active(tenant_id, 'newsletter')` in RLS.
 */

export const NEWSLETTER_TOOL_KEY = "newsletter" as const;

export const campaignStatus = pgEnum("newsletter_campaign_status", [
  "draft",
  "sending",
  "sent",
]);

export const sendStatus = pgEnum("newsletter_send_status", ["sent", "failed"]);

/** newsletter_contacts — the audience. Consent state derives from the ledger. */
export const newsletterContacts = pgTable(
  "newsletter_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    contactUnique: uniqueIndex("newsletter_contacts_tenant_email_unique").on(
      t.tenantId,
      t.email,
    ),
  }),
);

/** newsletter_campaigns — an email blast (draft → sending → sent). */
export const newsletterCampaigns = pgTable(
  "newsletter_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    status: campaignStatus("status").notNull().default("draft"),
    recipientCount: integer("recipient_count").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("newsletter_campaigns_tenant_idx").on(t.tenantId),
  }),
);

/** newsletter_sends — immutable per-recipient delivery log. */
export const newsletterSends = pgTable(
  "newsletter_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => newsletterCampaigns.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => newsletterContacts.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    status: sendStatus("status").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    campaignIdx: index("newsletter_sends_campaign_idx").on(t.campaignId),
  }),
);
