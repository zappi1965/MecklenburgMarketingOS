
class StripeService {
  constructor() {
    this.enabled = Boolean(process.env.STRIPE_SECRET_KEY)
    if (this.enabled) {
      const Stripe = require('stripe')
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    }
  }

  async createCheckoutSession({ customerEmail, packageName, priceCents, successUrl, cancelUrl }) {
    if (!this.enabled) {
      return { dryRun: true, url: successUrl || 'https://example.com/success' }
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            recurring: { interval: 'month' },
            product_data: { name: `MMOS ${packageName}` },
            unit_amount: Number(priceCents)
          },
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl
    })

    return session
  }

  async constructWebhook(rawBody, signature) {
    if (!this.enabled) throw new Error('Stripe ist nicht konfiguriert.')
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  }
}

module.exports = StripeService
