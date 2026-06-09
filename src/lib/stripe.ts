import "server-only";
import Stripe from "stripe";

/**
 * Stripe client (singleton). Uses the account's default API version pinned by
 * the installed SDK. Secret key is server-only.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  client = new Stripe(key, { typescript: true });
  return client;
}

/** Maps a Stripe subscription status onto our tenant_tools.status enum. */
export function mapStripeStatus(
  status: Stripe.Subscription.Status,
): "active" | "trial" | "past_due" | "cancelled" | "inactive" {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trial";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    default:
      return "inactive";
  }
}
