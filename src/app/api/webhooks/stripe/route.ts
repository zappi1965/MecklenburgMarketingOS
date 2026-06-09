import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, mapStripeStatus } from "@/lib/stripe";
import { applyToolStatus } from "@/actions/billing";

export const runtime = "nodejs";
// Stripe needs the raw, unmodified body for signature verification.
export const dynamic = "force-dynamic";

function periodEnd(sub: Stripe.Subscription): Date | null {
  // current_period_end is unix seconds; tolerate SDK type drift.
  const raw = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  return typeof raw === "number" ? new Date(raw * 1000) : null;
}

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const tenantId = sub.metadata?.tenantId;
  const toolKey = sub.metadata?.toolKey;
  if (!tenantId || !toolKey) return;

  await applyToolStatus({
    tenantId,
    toolKey,
    status: mapStripeStatus(sub.status),
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price.id ?? null,
    currentPeriodEnd: periodEnd(sub),
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          // Fall back to checkout metadata if the subscription lacks it.
          sub.metadata = {
            ...session.metadata,
            ...sub.metadata,
          };
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        // Ignore unrelated events.
        break;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Handler error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
