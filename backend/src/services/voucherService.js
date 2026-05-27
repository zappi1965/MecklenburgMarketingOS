// Voucher / Geschenkgutschein-Service.
//
// Konzept:
//   - vouchers: code unique, value EUR/Punkte, status (active/redeemed/expired),
//     belongs_to_customer (Aussteller), recipient_email, expires_at.
//   - Beim Anlegen wird ein human-lesbarer Code generiert (8 Zeichen ohne
//     verwechselbare Glyphen).
//   - Einlosen: status -> redeemed, redeemed_by_loyalty_member_id (optional),
//     redeemed_at gesetzt. Sperrt gegen doppelte Einlosung.

const crypto = require('crypto')

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += alphabet[crypto.randomInt(0, alphabet.length)]
  s += '-'
  for (let i = 0; i < 4; i++) s += alphabet[crypto.randomInt(0, alphabet.length)]
  return s
}

class VoucherService {
  constructor(supabase) {
    this.supabase = supabase
  }

  async create({
    customer_id,
    value_eur,
    value_points,
    recipient_email,
    recipient_name,
    expires_at,
    note,
    created_by
  }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    if (!customer_id) { const e = new Error('customer_id fehlt'); e.status = 400; throw e }
    const val = Number(value_eur || 0)
    const pts = Number(value_points || 0)
    if (val <= 0 && pts <= 0) {
      const e = new Error('Gutschein muss einen Wert in EUR oder Punkten haben'); e.status = 400; throw e
    }

    // Retry bei Code-Kollision (extrem unwahrscheinlich aber definiert behandelt).
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode()
      const { data, error } = await this.supabase
        .from('vouchers')
        .insert({
          customer_id,
          code,
          value_eur: val,
          value_points: pts,
          recipient_email: recipient_email ? String(recipient_email).toLowerCase().trim() : null,
          recipient_name: recipient_name || null,
          expires_at: expires_at || null,
          note: note || null,
          status: 'active',
          created_by: created_by || null
        })
        .select('id, code, value_eur, value_points, status, created_at, expires_at')
        .maybeSingle()
      if (data) return data
      if (error && !String(error.message || '').toLowerCase().includes('duplicate')) throw error
    }
    throw new Error('Konnte keinen eindeutigen Gutschein-Code erzeugen')
  }

  async lookup({ code }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    if (!code) { const e = new Error('code fehlt'); e.status = 400; throw e }
    const { data, error } = await this.supabase
      .from('vouchers')
      .select('id, code, customer_id, value_eur, value_points, status, expires_at, redeemed_at')
      .eq('code', String(code).toUpperCase().trim())
      .maybeSingle()
    if (error) throw error
    if (!data) { const e = new Error('Gutschein nicht gefunden'); e.status = 404; throw e }
    return data
  }

  // Einlosen. redeemed_by ist optional (Loyalty-Member oder Customer-User-Id).
  async redeem({ code, redeemed_by_loyalty_customer_id, redeemed_by_user_id, staff_code }) {
    const voucher = await this.lookup({ code })
    if (voucher.status === 'redeemed') { const e = new Error('Gutschein wurde bereits eingeloest'); e.status = 409; throw e }
    if (voucher.status === 'expired') { const e = new Error('Gutschein ist abgelaufen'); e.status = 410; throw e }
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      await this.supabase.from('vouchers').update({ status: 'expired' }).eq('id', voucher.id)
      const e = new Error('Gutschein ist abgelaufen'); e.status = 410; throw e
    }

    const { data, error } = await this.supabase
      .from('vouchers')
      .update({
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
        redeemed_by_loyalty_customer_id: redeemed_by_loyalty_customer_id || null,
        redeemed_by_user_id: redeemed_by_user_id || null,
        redemption_metadata: { staff_code: staff_code || null }
      })
      .eq('id', voucher.id)
      .eq('status', 'active') // optimistic concurrency
      .select('id, code, status, redeemed_at, value_eur, value_points')
      .maybeSingle()
    if (error) throw error
    if (!data) { const e = new Error('Gutschein konnte nicht eingeloest werden (Race Condition)'); e.status = 409; throw e }
    return data
  }

  async listForCustomer({ customer_id, status }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    let q = this.supabase
      .from('vouchers')
      .select('id, code, value_eur, value_points, status, created_at, expires_at, recipient_email')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (status) q = q.eq('status', status)
    const { data, error } = await q
    if (error) throw error
    return data || []
  }
}

module.exports = { VoucherService, generateCode }
