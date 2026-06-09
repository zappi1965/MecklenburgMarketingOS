/**
 * Catalogue of sellable tool modules. The `key` matches `tenant_tools.tool_key`
 * and the `tool_active(tenant_id, key)` RLS gate. Stripe price ids are resolved
 * from env at checkout time (see actions/billing.ts).
 */

export interface ToolDefinition {
  key: string;
  name: string;
  description: string;
  /** Monthly price in EUR cents, for display on the landing / checkout. */
  priceCents: number;
  /** Env var holding the Stripe price id for this tool. */
  stripePriceEnv: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    key: "loyalty",
    name: "Loyalty & QR-Kampagnen",
    description:
      "Stempelkarten, Punkte und Rewards. QR-Codes scannen, Kunden binden.",
    priceCents: 4900,
    stripePriceEnv: "STRIPE_PRICE_LOYALTY",
  },
  {
    key: "reviews",
    name: "Reviews & Reputation",
    description:
      "Bewertungen einsammeln, beantworten und auf Google weiterleiten.",
    priceCents: 2900,
    stripePriceEnv: "STRIPE_PRICE_REVIEWS",
  },
  {
    key: "payments",
    name: "Payments & Billing",
    description: "Pakete abonnieren, Rechnungen verwalten.",
    priceCents: 1900,
    stripePriceEnv: "STRIPE_PRICE_PAYMENTS",
  },
  {
    key: "booking",
    name: "Booking & POS",
    description:
      "Termin-Slots buchen lassen und Loyalty-Punkte an der Kasse gutschreiben.",
    priceCents: 3900,
    stripePriceEnv: "STRIPE_PRICE_BOOKING",
  },
  {
    key: "newsletter",
    name: "Newsletter & CRM-Mail",
    description:
      "Kontakte sammeln (Double-Opt-In) und DSGVO-konforme E-Mail-Kampagnen versenden.",
    priceCents: 2900,
    stripePriceEnv: "STRIPE_PRICE_NEWSLETTER",
  },
  {
    key: "referral",
    name: "Empfehlungsprogramm",
    description:
      "Kunden werben Kunden — Empfehlungslinks mit Bonus-Punkten für beide Seiten.",
    priceCents: 2400,
    stripePriceEnv: "STRIPE_PRICE_REFERRAL",
  },
  {
    key: "seo",
    name: "SEO & Local Listings",
    description:
      "NAP-Konsistenz, LocalBusiness-Schema (JSON-LD) und Keyword-Ranking-Tracker.",
    priceCents: 3400,
    stripePriceEnv: "STRIPE_PRICE_SEO",
  },
  {
    key: "surveys",
    name: "Feedback & Umfragen",
    description:
      "Umfragen per Link erstellen, Antworten sammeln und auswerten.",
    priceCents: 1900,
    stripePriceEnv: "STRIPE_PRICE_SURVEYS",
  },
  {
    key: "giftcards",
    name: "Gutscheine & Gift Cards",
    description:
      "Wertgutscheine ausgeben, an der Kasse einlösen und Guthaben prüfen.",
    priceCents: 2900,
    stripePriceEnv: "STRIPE_PRICE_GIFTCARDS",
  },
];

export const TOOL_KEYS = TOOLS.map((t) => t.key);

export function getTool(key: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.key === key);
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
