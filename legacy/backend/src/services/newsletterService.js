// Newsletter-Service.
//
// Konzept:
//   - subscribers: per Customer plus per E-Mail eindeutig. Status:
//     pending (Double-Opt-In ausstehend), active, unsubscribed.
//   - campaigns: vom Admin angelegt, status draft/sent.
//   - delivery: aktuell stubbed (logging only). In Production wird hier
//     der existierende mailService verwendet, sobald der Provider
//     entschieden ist (siehe Audit U3).

const crypto = require('crypto')

function token() {
  return crypto.randomBytes(24).toString('base64url')
}

class NewsletterService {
  constructor(supabase) {
    this.supabase = supabase
  }

  // Double-Opt-In: trage als 'pending' ein, sende Confirm-Link.
  async subscribe({ customer_id, email, source = 'web' }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    const normEmail = String(email || '').toLowerCase().trim()
    if (!normEmail || !normEmail.includes('@')) {
      const err = new Error('Ungueltige E-Mail-Adresse'); err.status = 400; throw err
    }
    const confirmToken = token()
    const { data, error } = await this.supabase
      .from('newsletter_subscribers')
      .upsert(
        {
          customer_id: customer_id || null,
          email: normEmail,
          status: 'pending',
          source,
          confirm_token: confirmToken,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'customer_id,email' }
      )
      .select('id, email, status')
      .maybeSingle()
    if (error) throw error
    return { subscriber: data, confirmToken }
  }

  async confirm({ token: t }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    if (!t) { const e = new Error('Token fehlt'); e.status = 400; throw e }
    const { data, error } = await this.supabase
      .from('newsletter_subscribers')
      .update({ status: 'active', confirmed_at: new Date().toISOString(), confirm_token: null, updated_at: new Date().toISOString() })
      .eq('confirm_token', t)
      .select('id, email, status')
      .maybeSingle()
    if (error) throw error
    if (!data) { const e = new Error('Token unbekannt oder bereits verwendet'); e.status = 404; throw e }
    return data
  }

  async unsubscribe({ email, customer_id }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    const norm = String(email || '').toLowerCase().trim()
    if (!norm) { const e = new Error('E-Mail fehlt'); e.status = 400; throw e }
    let query = this.supabase
      .from('newsletter_subscribers')
      .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
      .eq('email', norm)
    if (customer_id) query = query.eq('customer_id', customer_id)
    const { data, error } = await query.select('id, email, status').maybeSingle()
    if (error) throw error
    return data
  }

  async listSubscribers({ customer_id, status = 'active' }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    let query = this.supabase
      .from('newsletter_subscribers')
      .select('id, customer_id, email, status, created_at, confirmed_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (customer_id) query = query.eq('customer_id', customer_id)
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async createCampaign({ customer_id, subject, body, audience = 'active', created_by }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    const { data, error } = await this.supabase
      .from('newsletter_campaigns')
      .insert({
        customer_id: customer_id || null,
        subject: String(subject || '').slice(0, 200),
        body: String(body || ''),
        audience,
        status: 'draft',
        created_by: created_by || null
      })
      .select('id, subject, status, created_at')
      .maybeSingle()
    if (error) throw error
    return data
  }

  // Stub-Send: holt aktive Subscriber, schreibt newsletter_deliveries-Eintraege,
  // markiert Campaign als sent. Tatsaechliches Senden via Mail-Provider passiert
  // in einer Folge-Iteration (siehe Audit-Punkt U3).
  async sendCampaign({ campaign_id }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    const { data: campaign } = await this.supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .maybeSingle()
    if (!campaign) { const e = new Error('Kampagne nicht gefunden'); e.status = 404; throw e }
    if (campaign.status === 'sent') return { skipped: true, reason: 'already_sent' }

    const recipients = await this.listSubscribers({ customer_id: campaign.customer_id, status: 'active' })
    const rows = recipients.map((r) => ({
      campaign_id,
      subscriber_id: r.id,
      email: r.email,
      status: 'queued'
    }))
    if (rows.length) {
      const { error: iErr } = await this.supabase.from('newsletter_deliveries').insert(rows)
      if (iErr) throw iErr
    }
    await this.supabase
      .from('newsletter_campaigns')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', campaign_id)
    return { queued: rows.length }
  }
}

module.exports = { NewsletterService }
