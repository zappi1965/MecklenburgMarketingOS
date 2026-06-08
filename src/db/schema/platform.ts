import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Platform chassis schema.
 *
 * Every tenant-scoped table in the system carries `tenant_id` and is isolated
 * via Row-Level Security (see supabase/migrations/0001_platform_rls.sql).
 * These tables form the multi-tenant, RBAC, DSGVO and audit foundation that
 * all sellable tool-modules build on.
 */

// --- Enums -----------------------------------------------------------------

/** Role of a user within a single tenant. */
export const tenantRole = pgEnum("tenant_role", [
  "owner",
  "admin",
  "staff",
  "viewer",
]);

/** Lifecycle of a tool subscription for a tenant. */
export const toolStatus = pgEnum("tool_status", [
  "active",
  "trial",
  "past_due",
  "cancelled",
  "inactive",
]);

/** Audit-log verbs. Append-only — never updated or deleted. */
export const auditAction = pgEnum("audit_action", [
  "insert",
  "update",
  "delete",
]);

/** Purpose a consent record was granted (or withdrawn) for. */
export const consentPurpose = pgEnum("consent_purpose", [
  "marketing_email",
  "loyalty_processing",
  "review_publication",
  "analytics",
]);

// --- Tables ----------------------------------------------------------------

/**
 * tenants — one store = one tenant. `slug` is the public URL identifier.
 */
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    logoUrl: text("logo_url"),
    primaryColor: text("primary_color"),
    contactEmail: text("contact_email"),
    // Stripe customer for the tenant's overall billing relationship.
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    slugUnique: uniqueIndex("tenants_slug_unique").on(t.slug),
  }),
);

/**
 * user_profiles — extends Supabase Auth. `id` equals `auth.uid()`.
 * Holds MFA + superadmin flags that drive RLS helper functions.
 */
export const userProfiles = pgTable("user_profiles", {
  // Mirrors auth.users.id — populated on signup, no FK across schemas.
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  isSuperadmin: boolean("is_superadmin").notNull().default(false),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  mfaEnrolledAt: timestamp("mfa_enrolled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/**
 * tenant_memberships — user ↔ tenant with a role.
 * A user may belong to multiple tenants; the first active membership drives
 * `current_tenant_id()` in RLS.
 */
export const tenantMemberships = pgTable(
  "tenant_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    role: tenantRole("role").notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    membershipUnique: uniqueIndex("tenant_memberships_tenant_user_unique").on(
      t.tenantId,
      t.userId,
    ),
    userIdx: index("tenant_memberships_user_idx").on(t.userId),
  }),
);

/**
 * tenant_tools — feature flags: which tool a tenant has active, plus the
 * Stripe subscription that gates it. RLS reads `status` via `tool_active()`.
 */
export const tenantTools = pgTable(
  "tenant_tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // Stable machine key, e.g. "loyalty", "reviews", "payments".
    toolKey: text("tool_key").notNull(),
    status: toolStatus("status").notNull().default("inactive"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePriceId: text("stripe_price_id"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    toolUnique: uniqueIndex("tenant_tools_tenant_tool_unique").on(
      t.tenantId,
      t.toolKey,
    ),
  }),
);

/**
 * audit_log — append-only trail of every write. RLS grants INSERT + SELECT
 * only; there is no UPDATE/DELETE policy, so rows are immutable post-insert.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // Acting user (auth.uid()); null for system / public flows.
    actorId: uuid("actor_id"),
    action: auditAction("action").notNull(),
    entityTable: text("entity_table").notNull(),
    entityId: text("entity_id"),
    diff: jsonb("diff"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("audit_log_tenant_idx").on(t.tenantId),
    entityIdx: index("audit_log_entity_idx").on(t.entityTable, t.entityId),
  }),
);

/**
 * consent_records — DSGVO consent ledger. A withdrawal is a NEW row with
 * `granted = false`; rows are never updated or deleted (3-year retention).
 */
export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // Subject of the consent — may be a loyalty member or a raw email.
    subjectEmail: text("subject_email"),
    subjectMemberId: uuid("subject_member_id"),
    purpose: consentPurpose("purpose").notNull(),
    granted: boolean("granted").notNull(),
    // Double-opt-in confirmation timestamp (null until confirmed).
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("consent_records_tenant_idx").on(t.tenantId),
    subjectIdx: index("consent_records_subject_idx").on(
      t.tenantId,
      t.subjectEmail,
    ),
  }),
);
