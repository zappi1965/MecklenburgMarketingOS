import type { SessionContext, TenantRole } from "./session";

/**
 * Central RBAC policy table.
 *
 * Permissions are declared ONCE here and checked via `can()` / `requirePermission()`.
 * Never scatter `role === "admin"` checks through the codebase — add or adjust a
 * permission in the matrix below instead. This keeps authorization auditable and
 * makes new roles a single-line change.
 *
 * Tenant data isolation is enforced independently by Postgres RLS; this layer
 * gates app actions and UI affordances on top of that.
 */

export const PERMISSIONS = [
  // Tenant settings
  "tenant:read",
  "tenant:update",
  // Team / membership management
  "members:read",
  "members:invite",
  "members:update_role",
  "members:remove",
  // Loyalty tool
  "loyalty:read",
  "loyalty:manage", // create programs, QR codes, rewards
  "loyalty:operate", // counter actions: confirm redemption, manual points
  // Reviews tool
  "reviews:read",
  "reviews:manage", // respond, configure sources, send invitations
  // Billing tool
  "billing:read",
  "billing:manage", // checkout, change subscriptions
  // Booking / POS tool
  "booking:read",
  "booking:manage", // services + slots
  "booking:operate", // confirm/cancel bookings, POS point credit
  // Newsletter / CRM-Mail tool
  "newsletter:read",
  "newsletter:manage", // contacts + campaigns + sending
  // Referral tool
  "referral:read",
  "referral:manage", // configure program
  // SEO & Local Listings tool
  "seo:read",
  "seo:manage", // profile, keywords, rank logging
  // Feedback & Surveys tool
  "surveys:read",
  "surveys:manage", // build surveys, view responses
  // Gift Cards tool
  "giftcards:read",
  "giftcards:manage", // issue / cancel cards
  "giftcards:operate", // redeem at the counter
  // Link shortener tool
  "links:read",
  "links:manage", // create / edit short links
  // Retention / win-back tool
  "retention:read",
  "retention:manage", // configure + run win-back campaigns
  // Link-in-Bio tool
  "bio:read",
  "bio:manage", // edit bio page + links
  // Social media planner tool
  "social:read",
  "social:manage", // plan + schedule posts
  // CRM & Leads tool
  "crm:read",
  "crm:manage", // contacts + deals
  // Coupons tool
  "coupons:read",
  "coupons:manage", // create / edit codes
  "coupons:operate", // redeem at the counter
  // SMS marketing tool
  "sms:read",
  "sms:manage", // contacts + campaigns + sending
  // Automation tool
  "automation:read",
  "automation:manage", // configure + run flows
  // SumUp tool
  "sumup:read",
  "sumup:manage", // record revenue + create payment links
  // Compliance
  "audit:read",
  "dsar:export",
  "data:delete", // DSGVO hard-delete (also gated to superadmin in RLS)
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** The permission set granted to each tenant role. */
const ROLE_PERMISSIONS: Record<TenantRole, readonly Permission[]> = {
  owner: [
    "tenant:read",
    "tenant:update",
    "members:read",
    "members:invite",
    "members:update_role",
    "members:remove",
    "loyalty:read",
    "loyalty:manage",
    "loyalty:operate",
    "reviews:read",
    "reviews:manage",
    "billing:read",
    "billing:manage",
    "booking:read",
    "booking:manage",
    "booking:operate",
    "newsletter:read",
    "newsletter:manage",
    "referral:read",
    "referral:manage",
    "seo:read",
    "seo:manage",
    "surveys:read",
    "surveys:manage",
    "giftcards:read",
    "giftcards:manage",
    "giftcards:operate",
    "links:read",
    "links:manage",
    "retention:read",
    "retention:manage",
    "bio:read",
    "bio:manage",
    "social:read",
    "social:manage",
    "crm:read",
    "crm:manage",
    "coupons:read",
    "coupons:manage",
    "coupons:operate",
    "sms:read",
    "sms:manage",
    "automation:read",
    "automation:manage",
    "sumup:read",
    "sumup:manage",
    "audit:read",
    "dsar:export",
  ],
  admin: [
    "tenant:read",
    "tenant:update",
    "members:read",
    "members:invite",
    "members:update_role",
    "members:remove",
    "loyalty:read",
    "loyalty:manage",
    "loyalty:operate",
    "reviews:read",
    "reviews:manage",
    "billing:read",
    "booking:read",
    "booking:manage",
    "booking:operate",
    "newsletter:read",
    "newsletter:manage",
    "referral:read",
    "referral:manage",
    "seo:read",
    "seo:manage",
    "surveys:read",
    "surveys:manage",
    "giftcards:read",
    "giftcards:manage",
    "giftcards:operate",
    "links:read",
    "links:manage",
    "retention:read",
    "retention:manage",
    "bio:read",
    "bio:manage",
    "social:read",
    "social:manage",
    "crm:read",
    "crm:manage",
    "coupons:read",
    "coupons:manage",
    "coupons:operate",
    "sms:read",
    "sms:manage",
    "automation:read",
    "automation:manage",
    "sumup:read",
    "sumup:manage",
    "audit:read",
    "dsar:export",
  ],
  staff: [
    "tenant:read",
    "members:read",
    "loyalty:read",
    "loyalty:operate",
    "reviews:read",
    "reviews:manage",
    "booking:read",
    "booking:operate",
    "newsletter:read",
    "referral:read",
    "seo:read",
    "surveys:read",
    "surveys:manage",
    "giftcards:read",
    "giftcards:operate",
    "links:read",
    "links:manage",
    "retention:read",
    "bio:read",
    "bio:manage",
    "social:read",
    "social:manage",
    "crm:read",
    "crm:manage",
    "coupons:read",
    "coupons:operate",
    "sms:read",
    "sms:manage",
    "automation:read",
    "automation:manage",
    "sumup:read",
    "sumup:manage",
  ],
  viewer: [
    "tenant:read",
    "members:read",
    "loyalty:read",
    "reviews:read",
    "billing:read",
    "booking:read",
    "newsletter:read",
    "referral:read",
    "seo:read",
    "surveys:read",
    "giftcards:read",
    "links:read",
    "retention:read",
    "bio:read",
    "social:read",
    "crm:read",
    "coupons:read",
    "sms:read",
    "automation:read",
    "sumup:read",
  ],
};

/** True when the given role holds the permission. */
export function roleHas(role: TenantRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Authorization check for a session. Superadmins pass everything; otherwise the
 * caller's tenant role must hold the permission.
 */
export function can(ctx: SessionContext, permission: Permission): boolean {
  if (ctx.isSuperadmin) return true;
  if (!ctx.tenant) return false;
  return roleHas(ctx.tenant.role, permission);
}

/** Thrown when an action is invoked without the required permission. */
export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Fehlende Berechtigung: ${permission}`);
    this.name = "ForbiddenError";
  }
}

/** Guard for Server Actions — returns a typed reason string when denied. */
export function checkPermission(
  ctx: SessionContext,
  permission: Permission,
): { allowed: true } | { allowed: false; reason: string } {
  if (can(ctx, permission)) return { allowed: true };
  return {
    allowed: false,
    reason: "Du hast keine Berechtigung für diese Aktion.",
  };
}

/** All roles that can be assigned to a member (superadmin is global, not here). */
export const ASSIGNABLE_ROLES: TenantRole[] = [
  "owner",
  "admin",
  "staff",
  "viewer",
];
