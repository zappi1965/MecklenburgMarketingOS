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
 * Tool: SMS Marketing. Opt-in phone contacts and SMS campaigns via seven.io.
 * Consent is captured inline (consentAt) at the point of collection — SMS
 * numbers are gathered in-store, so single opt-in with an explicit timestamp.
 * Gated by `tool_active(tenant_id, 'sms')`.
 */

export const SMS_TOOL_KEY = "sms" as const;

export const smsCampaignStatus = pgEnum("sms_campaign_status", [
  "draft",
  "sending",
  "sent",
]);

export const smsSendStatus = pgEnum("sms_send_status", ["sent", "failed"]);

/** sms_contacts — opt-in phone numbers. `deletedAt` for DSGVO. */
export const smsContacts = pgTable(
  "sms_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
    name: text("name"),
    source: text("source"),
    // Timestamp of the marketing-SMS opt-in; null = no consent → never texted.
    consentAt: timestamp("consent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    contactUnique: uniqueIndex("sms_contacts_tenant_phone_unique").on(
      t.tenantId,
      t.phone,
    ),
  }),
);

/** sms_campaigns — an SMS blast. */
export const smsCampaigns = pgTable(
  "sms_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    status: smsCampaignStatus("status").notNull().default("draft"),
    recipientCount: integer("recipient_count").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("sms_campaigns_tenant_idx").on(t.tenantId),
  }),
);

/** sms_sends — immutable per-recipient delivery log. */
export const smsSends = pgTable(
  "sms_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => smsCampaigns.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => smsContacts.id, {
      onDelete: "set null",
    }),
    phone: text("phone").notNull(),
    status: smsSendStatus("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    campaignIdx: index("sms_sends_campaign_idx").on(t.campaignId),
  }),
);
