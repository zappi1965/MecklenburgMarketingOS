
let Stripe;
try { Stripe = require("stripe"); } catch {}
const stripe = process.env.STRIPE_SECRET_KEY && Stripe ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const priceMap = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth: process.env.STRIPE_PRICE_GROWTH,
  premium: process.env.STRIPE_PRICE_PREMIUM,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE
};

async function createCheckoutSession({ plan, clientId }) {
  if (!stripe) {
    return {
      mock: true,
      message: "Stripe ist nicht konfiguriert. STRIPE_SECRET_KEY und Price IDs setzen.",
      checkoutUrl: `${process.env.APP_URL || "http://localhost:3000"}/agency?mock_checkout=${plan}`
    };
  }

  const price = priceMap[plan];
  if (!price) throw new Error(`Stripe Price ID fehlt für Plan: ${plan}`);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.APP_URL}/agency?success=1`,
    cancel_url: `${process.env.APP_URL}/agency?cancel=1`,
    metadata: { plan, clientId }
  });

  return { checkoutUrl: session.url };
}

module.exports = { stripe, createCheckoutSession };
