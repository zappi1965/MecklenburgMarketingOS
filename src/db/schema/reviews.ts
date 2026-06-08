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
 * Tool 2: Reviews & Reputation.
 *
 * Tenant-scoped, gated by `tool_active(tenant_id, 'reviews')`. Public flows
 * (submitting a review via a tokenised invitation) are allowed through RLS
 * `with check (true)` and validated in the app layer.
 */

export const REVIEWS_TOOL_KEY = "reviews" as const;

// --- Enums -----------------------------------------------------------------

/** Where an inbound review ultimately routes / originates. */
export const reviewSourceType = pgEnum("review_source_type", [
  "internal", // stored in our reviews table
  "google", // redirect to Google My Business
]);

/** Invitation lifecycle. */
export const invitationStatus = pgEnum("review_invitation_status", [
  "pending",
  "opened",
  "completed",
  "expired",
]);

// --- Tables ----------------------------------------------------------------

/**
 * review_sources — configured review destinations for a tenant (e.g. the
 * internal form, or a Google My Business place to redirect 4–5★ ratings to).
 */
export const reviewSources = pgTable(
  "review_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: reviewSourceType("type").notNull().default("internal"),
    label: text("label").notNull(),
    // For google sources: the public place review URL.
    externalUrl: text("external_url"),
    // Ratings at or above this threshold get nudged to the external source.
    redirectThreshold: integer("redirect_threshold").notNull().default(4),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tenantIdx: index("review_sources_tenant_idx").on(t.tenantId),
  }),
);

/**
 * review_invitations — tokenised invite links with a TTL. The token drives the
 * public URL /review/{token}.
 */
export const reviewInvitations = pgTable(
  "review_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    // Optional recipient PII — only stored when known.
    recipientEmail: text("recipient_email"),
    recipientName: text("recipient_name"),
    status: invitationStatus("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenUnique: uniqueIndex("review_invitations_token_unique").on(t.token),
    tenantIdx: index("review_invitations_tenant_idx").on(t.tenantId),
  }),
);

/**
 * reviews — internal star + free-text reviews. `deletedAt` for DSGVO soft-delete.
 * Consent is recorded (platform.consent_records) before a review is stored.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    invitationId: uuid("invitation_id").references(() => reviewInvitations.id, {
      onDelete: "set null",
    }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    authorName: text("author_name"),
    authorEmail: text("author_email"),
    // Store owner's public response.
    response: text("response"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    tenantIdx: index("reviews_tenant_idx").on(t.tenantId),
    ratingIdx: index("reviews_rating_idx").on(t.tenantId, t.rating),
  }),
);
