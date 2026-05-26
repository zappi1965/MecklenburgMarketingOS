// Referral-/Empfehlungsprogramm-Service.
//
// Konzept:
//   - Jeder Customer hat einen eindeutigen Referral-Code (8 Zeichen, alphanum).
//   - Wenn ein neuer Lead/Customer beim Onboarding einen Code angibt, wird
//     eine referral-Beziehung in der Tabelle referrals erstellt.
//   - Beim Confirm-Event (z.B. erste Rechnung bezahlt) erhalten beide Seiten
//     einen Bonus. Bonus-Vergabe ist hier abstrakt — die konkrete Loyalty-
//     Belohnung wird ueber das bestehende loyalty_transactions-Schema
//     abgewickelt, falls vorhanden.
//
// Tabellen:
//   referrals (id, referrer_customer_id, referred_customer_id, code, status,
//              confirmed_at, reward_metadata jsonb, created_at, updated_at)
//   customer_referral_codes (customer_id pk, code, created_at)
//
// Idempotenz:
//   getOrCreateCode(customer_id) liefert vorhandenen Code oder erzeugt neuen.
//   createReferral verweigert Duplikate (gleicher referrer + referred).

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // ohne 0/O/1/I
  let out = ''
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

class ReferralService {
  constructor(supabase) {
    this.supabase = supabase
  }

  // Liefert vorhandenen Code des Kunden oder erzeugt einen neuen.
  // Bei Race-Condition (Unique-Verletzung) wird der existierende Code
  // gelesen und zurueckgegeben.
  async getOrCreateCode(customerId) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    if (!customerId) throw new Error('customer_id fehlt')

    const existing = await this.supabase
      .from('customer_referral_codes')
      .select('customer_id, code, created_at')
      .eq('customer_id', customerId)
      .maybeSingle()
    if (existing?.data) return existing.data

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode()
      const { data, error } = await this.supabase
        .from('customer_referral_codes')
        .insert({ customer_id: customerId, code })
        .select('customer_id, code, created_at')
        .maybeSingle()
      if (data) return data
      if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
        throw error
      }
      // Bei Duplicate-Verletzung neu versuchen mit anderem Code.
    }
    throw new Error('Konnte keinen eindeutigen Referral-Code erzeugen')
  }

  // Wird beim Onboarding eines neuen Kunden aufgerufen, der einen Code angegeben hat.
  async createReferral({ code, referred_customer_id, source = 'self_service' }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    if (!code || !referred_customer_id) {
      throw new Error('code und referred_customer_id sind Pflicht')
    }

    const codeRow = await this.supabase
      .from('customer_referral_codes')
      .select('customer_id, code')
      .eq('code', String(code).toUpperCase())
      .maybeSingle()
    if (!codeRow?.data) {
      const err = new Error('Unbekannter Referral-Code')
      err.status = 404
      throw err
    }
    const referrerCustomerId = codeRow.data.customer_id
    if (referrerCustomerId === referred_customer_id) {
      const err = new Error('Eigener Code kann nicht eingeloest werden')
      err.status = 400
      throw err
    }

    const dupe = await this.supabase
      .from('referrals')
      .select('id, status')
      .eq('referrer_customer_id', referrerCustomerId)
      .eq('referred_customer_id', referred_customer_id)
      .maybeSingle()
    if (dupe?.data) return dupe.data

    const { data, error } = await this.supabase
      .from('referrals')
      .insert({
        referrer_customer_id: referrerCustomerId,
        referred_customer_id,
        code: codeRow.data.code,
        status: 'pending',
        reward_metadata: { source }
      })
      .select('id, status, code, created_at')
      .maybeSingle()
    if (error) throw error
    return data
  }

  // Markiert eine Referral als confirmed (z.B. nach erster bezahlter Rechnung).
  async confirmReferral({ referred_customer_id, reward = {} }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    const { data: pending } = await this.supabase
      .from('referrals')
      .select('id, status, reward_metadata')
      .eq('referred_customer_id', referred_customer_id)
      .eq('status', 'pending')
      .maybeSingle()
    if (!pending) return { skipped: true, reason: 'no_pending_referral' }

    const { data, error } = await this.supabase
      .from('referrals')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        reward_metadata: { ...(pending.reward_metadata || {}), ...reward }
      })
      .eq('id', pending.id)
      .select('id, status, code, confirmed_at')
      .maybeSingle()
    if (error) throw error
    return data
  }

  async listForCustomer(customerId) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    const { data: code } = await this.supabase
      .from('customer_referral_codes')
      .select('code')
      .eq('customer_id', customerId)
      .maybeSingle()
    const { data: outgoing } = await this.supabase
      .from('referrals')
      .select('id, code, status, confirmed_at, created_at, referred_customer_id')
      .eq('referrer_customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(100)
    return { code: code?.code || null, referrals: outgoing || [] }
  }
}

module.exports = { ReferralService, generateCode }
