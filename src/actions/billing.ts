"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants, tenantTools } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { checkPermission } from "@/lib/auth/rbac";
import { getStripe } from "@/lib/stripe";
import { getTool, TOOL_KEYS } from "@/lib/tools";
import { writeAuditLog } from "@/lib/audit";
import { type ActionResult, ok, err, fromZodError } from "@/lib/result";

const checkoutSchema = z.object({
  toolKey: z.enum(TOOL_KEYS as [string, ...string[]]),
});

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Creates a Stripe Checkout session to subscribe the current tenant to a tool.
 * Returns the hosted checkout URL. RBAC-gated on `billing:manage`.
 */
export async function createCheckoutSession(
  input: z.input<typeof checkoutSchema>,
): Promise<ActionResult<{ url: string }>> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "billing:manage");
  if (!guard.allowed) return err(guard.reason);

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);

  const tool = getTool(parsed.data.toolKey);
  if (!tool) return err("Unbekanntes Tool.");

  const priceId = process.env[tool.stripePriceEnv];
  if (!priceId) {
    return err(
      `Stripe-Preis für ${tool.name} ist nicht konfiguriert (${tool.stripePriceEnv}).`,
    );
  }

  const stripe = getStripe();

  // Ensure the tenant has a Stripe customer.
  const tenantRows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, ctx.tenant.id))
    .limit(1);
  const tenant = tenantRows[0];
  if (!tenant) return err("Store nicht gefunden.");

  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant.name,
      email: tenant.contactEmail ?? ctx.email,
      metadata: { tenantId: tenant.id },
    });
    customerId = customer.id;
    await db
      .update(tenants)
      .set({ stripeCustomerId: customerId })
      .where(eq(tenants.id, tenant.id));
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/dashboard/billing?status=success`,
    cancel_url: `${appUrl()}/dashboard/billing?status=cancelled`,
    subscription_data: {
      metadata: { tenantId: tenant.id, toolKey: tool.key },
    },
    metadata: { tenantId: tenant.id, toolKey: tool.key },
  });

  if (!session.url) return err("Checkout konnte nicht gestartet werden.");

  await writeAuditLog({
    tenantId: tenant.id,
    actorId: ctx.userId,
    action: "insert",
    entityTable: "stripe_checkout",
    entityId: session.id,
    diff: { toolKey: tool.key },
  });

  return ok({ url: session.url });
}

/**
 * Opens the Stripe billing portal for the tenant to manage subscriptions and
 * invoices. RBAC-gated on `billing:manage`.
 */
export async function createBillingPortalSession(): Promise<
  ActionResult<{ url: string }>
> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "billing:manage");
  if (!guard.allowed) return err(guard.reason);

  const tenantRows = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, ctx.tenant.id))
    .limit(1);
  const customerId = tenantRows[0]?.stripeCustomerId;
  if (!customerId) return err("Noch kein Stripe-Kunde vorhanden.");

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/dashboard/billing`,
  });

  return ok({ url: session.url });
}

export interface InvoiceSummary {
  id: string;
  number: string | null;
  amount: number;
  currency: string;
  status: string;
  created: number;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

/**
 * Lists the tenant's Stripe invoices (PDFs are served by Stripe — no extra
 * rendering service). RBAC-gated on `billing:read`.
 */
export async function listInvoices(): Promise<
  ActionResult<InvoiceSummary[]>
> {
  const ctx = await requireSession();
  if (!ctx.tenant) return err("Kein aktiver Store.");
  const guard = checkPermission(ctx, "billing:read");
  if (!guard.allowed) return err(guard.reason);

  const tenantRows = await db
    .select({ stripeCustomerId: tenants.stripeCustomerId })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenant.id))
    .limit(1);
  const customerId = tenantRows[0]?.stripeCustomerId;
  if (!customerId) return ok([]);

  if (!process.env.STRIPE_SECRET_KEY) return ok([]);

  const stripe = getStripe();
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 12,
  });

  return ok(
    invoices.data.map((inv) => ({
      id: inv.id ?? "",
      number: inv.number ?? null,
      amount: inv.amount_paid ?? inv.amount_due ?? 0,
      currency: (inv.currency ?? "eur").toUpperCase(),
      status: inv.status ?? "draft",
      created: inv.created,
      pdfUrl: inv.invoice_pdf ?? null,
      hostedUrl: inv.hosted_invoice_url ?? null,
    })),
  );
}

/** Internal: applies a tool status change coming from a Stripe webhook. */
export async function applyToolStatus(params: {
  tenantId: string;
  toolKey: string;
  status: "active" | "trial" | "past_due" | "cancelled" | "inactive";
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  currentPeriodEnd?: Date | null;
}): Promise<void> {
  await db
    .insert(tenantTools)
    .values({
      tenantId: params.tenantId,
      toolKey: params.toolKey,
      status: params.status,
      stripeSubscriptionId: params.stripeSubscriptionId ?? null,
      stripePriceId: params.stripePriceId ?? null,
      currentPeriodEnd: params.currentPeriodEnd ?? null,
    })
    .onConflictDoUpdate({
      target: [tenantTools.tenantId, tenantTools.toolKey],
      set: {
        status: params.status,
        stripeSubscriptionId: params.stripeSubscriptionId ?? null,
        stripePriceId: params.stripePriceId ?? null,
        currentPeriodEnd: params.currentPeriodEnd ?? null,
        updatedAt: new Date(),
      },
    });

  await writeAuditLog({
    tenantId: params.tenantId,
    actorId: null,
    action: "update",
    entityTable: "tenant_tools",
    entityId: params.toolKey,
    diff: { status: params.status },
  });
}
