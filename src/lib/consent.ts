import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { consentRecords } from "@/db/schema";

/**
 * DSGVO consent ledger helpers.
 *
 * consent_records is append-only (RLS forbids UPDATE/DELETE). Every state
 * change — request, confirmation, withdrawal — is a NEW row. The current state
 * for a (tenant, subject, purpose) is the most recent row.
 */

export type ConsentPurpose =
  | "marketing_email"
  | "loyalty_processing"
  | "review_publication"
  | "analytics";

/** Window within which a double-opt-in confirmation link stays valid. */
const DOUBLE_OPT_IN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/**
 * One-way hash of an IP address. We never store raw IPs (data minimisation);
 * the salt makes the hash non-reversible across deployments.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.CONSENT_IP_SALT ?? "mmos-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

interface ConsentSubject {
  tenantId: string;
  purpose: ConsentPurpose;
  subjectEmail?: string | null;
  subjectMemberId?: string | null;
}

interface ConsentMeta {
  ip?: string | null;
  userAgent?: string | null;
  source?: string | null;
}

/**
 * Records a direct (single-opt-in) consent grant. Use for in-person /
 * already-verified flows. Returns the new record id.
 */
export async function recordConsent(
  subject: ConsentSubject,
  granted: boolean,
  meta: ConsentMeta = {},
): Promise<string> {
  const [row] = await db
    .insert(consentRecords)
    .values({
      tenantId: subject.tenantId,
      purpose: subject.purpose,
      subjectEmail: subject.subjectEmail?.toLowerCase() ?? null,
      subjectMemberId: subject.subjectMemberId ?? null,
      granted,
      confirmedAt: granted ? new Date() : null,
      ipHash: hashIp(meta.ip),
      userAgent: meta.userAgent ?? null,
      source: meta.source ?? "direct",
    })
    .returning({ id: consentRecords.id });
  return row.id;
}

/**
 * Starts a double-opt-in flow: writes a pending (granted=false, unconfirmed)
 * record and returns its id as the confirmation token. The caller emails a link
 * to /consent/confirm/{token}.
 */
export async function requestDoubleOptIn(
  subject: ConsentSubject & { subjectEmail: string },
  meta: ConsentMeta = {},
): Promise<{ token: string }> {
  const [row] = await db
    .insert(consentRecords)
    .values({
      tenantId: subject.tenantId,
      purpose: subject.purpose,
      subjectEmail: subject.subjectEmail.toLowerCase(),
      subjectMemberId: subject.subjectMemberId ?? null,
      granted: false,
      confirmedAt: null,
      ipHash: hashIp(meta.ip),
      userAgent: meta.userAgent ?? null,
      source: "double_opt_in_request",
    })
    .returning({ id: consentRecords.id });
  return { token: row.id };
}

export type ConfirmConsentResult =
  | { status: "confirmed"; purpose: ConsentPurpose }
  | { status: "already_confirmed" }
  | { status: "expired" }
  | { status: "invalid" };

/**
 * Confirms a double-opt-in request by token. Writes a NEW granted+confirmed
 * record (the pending row stays as the immutable audit of the request).
 */
export async function confirmConsent(
  token: string,
  meta: ConsentMeta = {},
): Promise<ConfirmConsentResult> {
  const pending = await db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.id, token))
    .limit(1);
  const request = pending[0];
  if (!request || request.source !== "double_opt_in_request") {
    return { status: "invalid" };
  }

  if (Date.now() - request.createdAt.getTime() > DOUBLE_OPT_IN_TTL_MS) {
    return { status: "expired" };
  }

  // Idempotency: already confirmed?
  const confirmed = await db
    .select({ id: consentRecords.id })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.tenantId, request.tenantId),
        eq(consentRecords.purpose, request.purpose),
        eq(consentRecords.subjectEmail, request.subjectEmail ?? ""),
        eq(consentRecords.granted, true),
      ),
    )
    .limit(1);
  if (confirmed[0]) return { status: "already_confirmed" };

  await db.insert(consentRecords).values({
    tenantId: request.tenantId,
    purpose: request.purpose,
    subjectEmail: request.subjectEmail,
    subjectMemberId: request.subjectMemberId,
    granted: true,
    confirmedAt: new Date(),
    ipHash: hashIp(meta.ip),
    userAgent: meta.userAgent ?? null,
    source: "double_opt_in_confirmed",
  });

  return { status: "confirmed", purpose: request.purpose };
}

/** Withdraws consent — appends a granted=false record. */
export async function withdrawConsent(
  subject: ConsentSubject & { subjectEmail: string },
  meta: ConsentMeta = {},
): Promise<void> {
  await db.insert(consentRecords).values({
    tenantId: subject.tenantId,
    purpose: subject.purpose,
    subjectEmail: subject.subjectEmail.toLowerCase(),
    subjectMemberId: subject.subjectMemberId ?? null,
    granted: false,
    confirmedAt: null,
    ipHash: hashIp(meta.ip),
    userAgent: meta.userAgent ?? null,
    source: "withdrawal",
  });
}

/**
 * Returns whether the subject currently holds confirmed consent for a purpose
 * (latest record wins).
 */
export async function checkConsent(
  subject: ConsentSubject & { subjectEmail: string },
): Promise<boolean> {
  const rows = await db
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.tenantId, subject.tenantId),
        eq(consentRecords.purpose, subject.purpose),
        eq(consentRecords.subjectEmail, subject.subjectEmail.toLowerCase()),
      ),
    )
    .orderBy(desc(consentRecords.createdAt))
    .limit(1);
  const latest = rows[0];
  return Boolean(latest && latest.granted && latest.confirmedAt);
}
