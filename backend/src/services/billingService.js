
const Stripe = require('stripe')

const PACKAGE_RULES = {
  Starter: {
    price_monthly: 19900,
    currency: 'eur',
    interval: 'month',
    tools: ['crm', 'tickets', 'invoices', 'files', 'reports_basic'],
    limits: { users: 1, customers: 25, reports_per_month: 2, automations: 0 }
  },
  Growth: {
    price_monthly: 49900,
    currency: 'eur',
    interval: 'month',
    tools: ['crm', 'tickets', 'invoices', 'files', 'reports', 'seo', 'booking', 'pipeline', 'integrations', 'kpi', 'activity'],
    limits: { users: 3, customers: 100, reports_per_month: 10, automations: 5 }
  },
  Premium: {
    price_monthly: 89900,
    currency: 'eur',
    interval: 'month',
    tools: ['crm', 'tickets', 'invoices', 'files', 'reports', 'seo', 'booking', 'pipeline', 'integrations', 'kpi', 'activity', 'automations', 'workflows', 'permissions'],
    limits: { users: 10, customers: 500, reports_per_month: 50, automations: 25 }
  }
}

class BillingService {
  constructor(supabase, activityService, notificationService) {
    this.supabase = supabase
    this.activity = activityService
    this.notifications = notificationService
    this.stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
  }

  getPackageRules() {
    return PACKAGE_RULES
  }

  getPackageRule(packageName) {
    const rule = PACKAGE_RULES[packageName]
    if (!rule) {
      const err = new Error(`Unbekanntes Paket: ${packageName}`)
      err.status = 400
      throw err
    }
    return rule
  }

  async syncPackageCatalog() {
    const results = []
    for (const [name, rule] of Object.entries(PACKAGE_RULES)) {
      const { data, error } = await this.supabase.from('package_catalog').upsert({
        name,
        price_monthly: rule.price_monthly / 100,
        currency: rule.currency.toUpperCase(),
        interval: rule.interval,
        tools: rule.tools,
        limits: rule.limits,
        active: true
      }, { onConflict: 'name' }).select().single()

      if (error) throw error
      results.push(data)
    }
    return results
  }

  async applyPackageToCustomer({ customer_id, package_name, status = 'active' }) {
    const rule = this.getPackageRule(package_name)

    const { data: subscription, error } = await this.supabase.from('customer_subscriptions').upsert({
      customer_id,
      package_name,
      status,
      price_monthly: rule.price_monthly / 100,
      currency: rule.currency.toUpperCase(),
      billing_interval: rule.interval,
      started_at: new Date().toISOString()
    }, { onConflict: 'customer_id' }).select().single()

    if (error) throw error

    for (const tool of rule.tools) {
      await this.supabase.from('customer_tool_access').upsert({
        customer_id,
        tool_key: tool,
        enabled: true
      }, { onConflict: 'customer_id,tool_key' })
    }

    await this.supabase.from('license_entitlements').upsert({
      customer_id,
      package_name,
      tools: rule.tools,
      limits: rule.limits,
      status: 'active'
    }, { onConflict: 'customer_id' })

    await this.activity.log({
      customer_id,
      action: 'package_applied',
      message: `${package_name} freigeschaltet`,
      payload: { package_name, rule }
    })

    await this.notifications.createInApp({
      customer_id,
      title: 'Paket freigeschaltet',
      message: `${package_name} wurde aktiviert.`
    }).catch(() => null)

    return subscription
  }

  async createContractFromPackage({ customer_id, package_name }) {
    const rule = this.getPackageRule(package_name)
    const title = `${package_name} Vertrag`

    const { data, error } = await this.supabase.from('contracts').insert({
      customer_id,
      title,
      status: 'Entwurf',
      package_name,
      monthly_amount: rule.price_monthly / 100,
      contract_payload: {
        package_name,
        price_monthly: rule.price_monthly / 100,
        tools: rule.tools,
        limits: rule.limits
      }
    }).select().single()

    if (error) throw error

    await this.activity.log({
      customer_id,
      action: 'contract_generated',
      message: title,
      payload: data
    })

    return data
  }

  async createInvoiceForPackage({ customer_id, package_name }) {
    const rule = this.getPackageRule(package_name)
    const invoiceNumber = `RE-${Date.now()}`

    const { data, error } = await this.supabase.from('invoices').insert({
      customer_id,
      invoice_number: invoiceNumber,
      amount: rule.price_monthly / 100,
      status: 'Offen',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    }).select().single()

    if (error) throw error

    await this.supabase.from('recurring_invoices').insert({
      customer_id,
      title: `${package_name} monatlich`,
      monthly_amount: rule.price_monthly / 100,
      status: 'Aktiv'
    }).catch(() => null)

    await this.activity.log({
      customer_id,
      action: 'package_invoice_created',
      message: invoiceNumber,
      payload: { package_name, invoice: data }
    })

    return data
  }

  async approvePackageRequest(request_id) {
    const { data: request, error: readError } = await this.supabase.from('package_requests').select('*').eq('id', request_id).single()
    if (readError) throw readError

    await this.supabase.from('package_requests').update({ status: 'Freigegeben' }).eq('id', request_id)

    const subscription = await this.applyPackageToCustomer({
      customer_id: request.customer_id,
      package_name: request.package_name,
      status: 'active'
    })

    const contract = await this.createContractFromPackage({
      customer_id: request.customer_id,
      package_name: request.package_name
    })

    const invoice = await this.createInvoiceForPackage({
      customer_id: request.customer_id,
      package_name: request.package_name
    })

    return { request, subscription, contract, invoice }
  }

  async upgradeDowngrade({ customer_id, package_name }) {
    const current = await this.applyPackageToCustomer({ customer_id, package_name, status: 'active' })

    await this.activity.log({
      customer_id,
      action: 'subscription_changed',
      message: `Paket gewechselt zu ${package_name}`,
      payload: { package_name }
    })

    return current
  }

  async createStripeCheckout({ customer_id, package_name }) {
    const rule = this.getPackageRule(package_name)

    if (!this.stripe) {
      return {
        provider: 'stripe',
        configured: false,
        message: 'STRIPE_SECRET_KEY fehlt',
        checkout_url: null
      }
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: rule.currency,
          product_data: { name: `MMOS ${package_name}` },
          recurring: { interval: rule.interval },
          unit_amount: rule.price_monthly
        },
        quantity: 1
      }],
      metadata: { customer_id, package_name },
      success_url: `${process.env.APP_PUBLIC_URL || 'http://localhost:3000'}?checkout=success`,
      cancel_url: `${process.env.APP_PUBLIC_URL || 'http://localhost:3000'}?checkout=cancel`
    })

    return {
      provider: 'stripe',
      configured: true,
      checkout_url: session.url,
      session_id: session.id
    }
  }

  async createPaypalOrder({ customer_id, package_name }) {
    const rule = this.getPackageRule(package_name)

    return {
      provider: 'paypal',
      configured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
      message: 'PayPal ist als Provider-Struktur vorbereitet. Vollständige PayPal Subscription API muss mit echten App-Credentials final angebunden werden.',
      customer_id,
      package_name,
      amount: rule.price_monthly / 100,
      currency: rule.currency.toUpperCase()
    }
  }
}

module.exports = BillingService
