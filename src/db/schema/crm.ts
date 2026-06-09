import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./platform";

/**
 * Tool: CRM & Leads (a Pipedrive / GoHighLevel style contact + deal pipeline).
 * The connective tissue between the other tools — leads captured anywhere become
 * contacts with deals moving through stages. Gated by
 * `tool_active(tenant_id, 'crm')`.
 */

export const CRM_TOOL_KEY = "crm" as const;

export const dealStage = pgEnum("crm_deal_stage", [
  "new",
  "qualified",
  "proposal",
  "won",
  "lost",
]);

/** crm_contacts — a lead / customer record. `deletedAt` for DSGVO. */
export const crmContacts = pgTable(
  "crm_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    source: text("source"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index("crm_contacts_tenant_idx").on(t.tenantId),
    emailIdx: index("crm_contacts_email_idx").on(t.tenantId, t.email),
  }),
);

/** crm_deals — an opportunity moving through pipeline stages. */
export const crmDeals = pgTable(
  "crm_deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => crmContacts.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    valueCents: integer("value_cents"),
    stage: dealStage("stage").notNull().default("new"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index("crm_deals_tenant_idx").on(t.tenantId),
    stageIdx: index("crm_deals_stage_idx").on(t.tenantId, t.stage),
  }),
);
