// Endkunden-Referral-Service ("Freunde werben").
//
// Konzept (Variante Endkunde, nicht B2B):
//   - Jedes Loyalty-Mitglied hat einen persönlichen Referral-Code (aus member_token
//     abgeleitet) und damit einen Link /r/<code>.
//   - Wirbt es einen Freund, wird zunächst nur eine PENDING-Referral angelegt.
//   - Erst wenn der Freund wirklich beitritt UND das erste Mal scannt, werden BEIDE
//     Seiten gutgeschrieben (loyalty_transactions + points_balance), idempotent.
//
// Tabelle: loyalty_referrals (siehe Migration 0119).
// Settings: v37_loyalty_settings (referral_bonus_referrer/_friend + Anti-Abuse-Flags).
//
// Die exportierten Pure-Funktionen sind ohne Supabase testbar.

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase() || null
}

// Stabiler, gut teilbarer Code aus dem member_token (keine PII).
function referralCodeForMember(memberToken) {
  const raw = String(memberToken || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (raw.length >= 6) return raw.slice(-8)
  // Fallback: zufälliger Code (ohne 0/O/1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

function isSelfReferral(referrerEmail, friendEmail) {
  const a = normalizeEmail(referrerEmail)
  const b = normalizeEmail(friendEmail)
  return Boolean(a && b && a === b)
}

// Liefert die Bonuspunkte je Seite aus den Settings (mit sicheren Defaults).
function computeReferralCredit(settings = {}) {
  const referrer_points = Math.max(0, Number(settings.referral_bonus_referrer ?? 100) || 0)
  const friend_points = Math.max(0, Number(settings.referral_bonus_friend ?? 50) || 0)
  return { referrer_points, friend_points }
}

// 0 = unbegrenzt.
function withinMaxPerReferrer(currentCount, settings = {}) {
  const max = Math.max(0, Number(settings.referral_max_per_referrer ?? 0) || 0)
  if (max === 0) return true
  return Number(currentCount || 0) < max
}

function referralIdempotencyKey(referralId, side) {
  return `referral:${referralId}:${side}`
}

// Aus PENDING/JOINED darf gutgeschrieben werden, aus CREDITED/REJECTED nicht mehr.
function canCreditReferral(status) {
  return status === 'pending' || status === 'joined'
}

class EndcustomerReferralService {
  constructor(supabase) {
    this.supabase = supabase
  }

  async _settings(customerId) {
    const { data } = await this.supabase
      .from('v37_loyalty_settings')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle()
    return data || {}
  }

  // Persönlicher Link/QR-Wert für ein Mitglied (per member_token).
  async getOrCreateReferralLink({ customer_id, member_token }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    if (!customer_id || !member_token) {
      const e = new Error('customer_id und member_token sind Pflicht'); e.status = 400; throw e
    }
    const member = await this.supabase
      .from('loyalty_customers')
      .select('id, email, member_token, loyalty_program_id')
      .eq('customer_id', customer_id)
      .eq('member_token', member_token)
      .maybeSingle()
    if (!member?.data) { const e = new Error('Mitglied nicht gefunden'); e.status = 404; throw e }
    const code = referralCodeForMember(member.data.member_token)
    // Denormalisierten Code persistieren -> schneller, indexierter Lookup (V098).
    this.supabase.from('loyalty_customers').update({ referral_code: code }).eq('id', member.data.id).then(() => {}, () => {})
    let slug = null
    if (member.data.loyalty_program_id) {
      const prog = await this.supabase
        .from('loyalty_programs')
        .select('slug')
        .eq('id', member.data.loyalty_program_id)
        .maybeSingle()
      slug = prog?.data?.slug || null
    }
    const path = slug ? `/r/${code}?s=${encodeURIComponent(slug)}` : `/r/${code}`
    return {
      referral_code: code,
      slug,
      path,
      member_id: member.data.id,
      member_token: member.data.member_token
    }
  }

  // Findet das werbende Mitglied über Code ODER Token.
  async resolveReferrer({ customer_id, referral_code, referrer_token }) {
    const token = referrer_token || null
    if (token) {
      const byToken = await this.supabase
        .from('loyalty_customers')
        .select('id, email, member_token, loyalty_program_id')
        .eq('customer_id', customer_id)
        .eq('member_token', token)
        .maybeSingle()
      if (byToken?.data) return byToken.data
    }
    const code = String(referral_code || '').trim().toUpperCase()
    if (!code) return null
    // Schneller Pfad (V098): indexierter Lookup über die denormalisierte Spalte.
    const indexed = await this.supabase
      .from('loyalty_customers')
      .select('id, email, member_token, loyalty_program_id')
      .eq('customer_id', customer_id)
      .eq('referral_code', code)
      .limit(1)
    if ((indexed?.data || []).length > 0) return indexed.data[0]
    // Fallback (Mitglieder ohne befüllten Code): begrenzter Scan + lazy Backfill.
    const candidates = await this.supabase
      .from('loyalty_customers')
      .select('id, email, member_token, loyalty_program_id, referral_code')
      .eq('customer_id', customer_id)
      .is('referral_code', null)
      .limit(2000)
    const list = candidates?.data || []
    const match = list.find((m) => referralCodeForMember(m.member_token) === code) || null
    if (match) {
      // Backfill, damit der nächste Lookup den schnellen Pfad nimmt.
      this.supabase.from('loyalty_customers').update({ referral_code: code }).eq('id', match.id).then(() => {}, () => {})
    }
    return match
  }

  // Legt eine PENDING-Referral an (KEINE Sofort-Gutschrift!).
  async registerReferral({ customer_id, referral_code, referrer_token, friend_email, source = 'public_referral' }) {
    if (!this.supabase) throw new Error('Supabase nicht konfiguriert')
    if (!customer_id) { const e = new Error('customer_id fehlt'); e.status = 400; throw e }
    const settings = await this._settings(customer_id)
    const referrer = await this.resolveReferrer({ customer_id, referral_code, referrer_token })
    if (!referrer) { const e = new Error('Unbekannter Empfehlungscode'); e.status = 404; throw e }

    const friend = normalizeEmail(friend_email)
    if (settings.referral_self_referral_blocked !== false && isSelfReferral(referrer.email, friend)) {
      const e = new Error('Der eigene Empfehlungscode kann nicht für die eigene E-Mail genutzt werden.')
      e.status = 400; e.code = 'SELF_REFERRAL_BLOCKED'; throw e
    }

    if (!withinMaxPerReferrer(await this._countForReferrer(customer_id, referrer.id), settings)) {
      const e = new Error('Maximale Anzahl Empfehlungen für dieses Mitglied erreicht.')
      e.status = 429; e.code = 'REFERRAL_LIMIT_REACHED'; throw e
    }

    if (friend) {
      const dupe = await this.supabase
        .from('loyalty_referrals')
        .select('id, status')
        .eq('customer_id', customer_id)
        .eq('referrer_member_id', referrer.id)
        .eq('referred_email', friend)
        .maybeSingle()
      if (dupe?.data) return dupe.data
    }

    const { referrer_points, friend_points } = computeReferralCredit(settings)
    const { data, error } = await this.supabase
      .from('loyalty_referrals')
      .insert({
        customer_id,
        loyalty_program_id: referrer.loyalty_program_id || null,
        referrer_member_id: referrer.id,
        referrer_token: referrer.member_token,
        referrer_email: normalizeEmail(referrer.email),
        referred_email: friend,
        referral_code: referralCodeForMember(referrer.member_token),
        status: 'pending',
        referrer_points,
        friend_points,
        metadata: { source }
      })
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data
  }

  async _countForReferrer(customer_id, referrerMemberId) {
    const { data } = await this.supabase
      .from('loyalty_referrals')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('referrer_member_id', referrerMemberId)
      .limit(1000)
    return (data || []).length
  }

  // Wird beim ersten echten Join+Scan des Freundes aufgerufen.
  // Schreibt zwei loyalty_transactions (idempotent) und erhöht beide Salden.
  async creditOnFriendJoinScan({ customer_id, friend_member, referral_code }) {
    if (!this.supabase) return { skipped: true, reason: 'no_supabase' }
    if (!customer_id || !friend_member?.id) return { skipped: true, reason: 'missing_args' }
    const settings = await this._settings(customer_id)
    if (settings.referral_require_friend_scan === false) {
      // Sollte nicht passieren (Hook läuft erst nach Scan), defensiv ok.
    }
    const friendEmail = normalizeEmail(friend_member.email)

    // Passende offene Referral finden: per Code ODER per Freund-E-Mail.
    let referral = null
    const byCode = String(referral_code || '').trim().toUpperCase()
    if (byCode) {
      const r = await this.supabase
        .from('loyalty_referrals')
        .select('*')
        .eq('customer_id', customer_id)
        .eq('referral_code', byCode)
        .in('status', ['pending', 'joined'])
        .order('created_at', { ascending: true })
        .limit(1)
      referral = (r?.data || [])[0] || null
    }
    if (!referral && friendEmail) {
      const r = await this.supabase
        .from('loyalty_referrals')
        .select('*')
        .eq('customer_id', customer_id)
        .eq('referred_email', friendEmail)
        .in('status', ['pending', 'joined'])
        .order('created_at', { ascending: true })
        .limit(1)
      referral = (r?.data || [])[0] || null
    }
    if (!referral) return { skipped: true, reason: 'no_pending_referral' }
    if (!canCreditReferral(referral.status)) return { skipped: true, reason: 'already_credited' }

    // Selbst-Referral final blockieren (Freund == Werber).
    if (referral.referrer_member_id === friend_member.id) {
      await this.supabase.from('loyalty_referrals').update({ status: 'rejected', updated_at: new Date().toISOString(), metadata: { ...(referral.metadata || {}), reject_reason: 'self_referral' } }).eq('id', referral.id)
      return { skipped: true, reason: 'self_referral' }
    }

    const now = new Date().toISOString()
    const referrer = await this.supabase.from('loyalty_customers').select('id, points_balance, total_points').eq('id', referral.referrer_member_id).maybeSingle()

    const referrerPoints = Number(referral.referrer_points || 0)
    const friendPoints = Number(referral.friend_points || 0)

    await this._creditMember({ customer_id, member: referrer?.data, points: referrerPoints, referralId: referral.id, side: 'referrer', referralCode: referral.referral_code })
    await this._creditMember({ customer_id, member: friend_member, points: friendPoints, referralId: referral.id, side: 'friend', referralCode: referral.referral_code })

    const updated = await this.supabase
      .from('loyalty_referrals')
      .update({
        status: 'credited',
        referred_member_id: friend_member.id,
        referred_email: friendEmail || referral.referred_email,
        credited_at: now,
        idempotency_key: referralIdempotencyKey(referral.id, 'credited'),
        updated_at: now
      })
      .eq('id', referral.id)
      .in('status', ['pending', 'joined'])
      .select('*')
      .maybeSingle()

    try {
      await this.supabase.from('customer_timeline_events').insert({
        customer_id,
        event_type: 'loyalty_referral_credited',
        title: 'Empfehlung gutgeschrieben',
        description: `Empfehlung über Code ${referral.referral_code} eingelöst – Werber +${referrerPoints}, Freund +${friendPoints} Punkte.`,
        source_module: 'loyalty',
        severity: 'success',
        metadata: { referral_id: referral.id, referrer_points: referrerPoints, friend_points: friendPoints }
      })
    } catch (_) {}

    return { ok: true, referral: updated?.data || referral, referrer_points: referrerPoints, friend_points: friendPoints }
  }

  // Schreibt eine Bonus-Transaktion, sofern noch nicht vorhanden (idempotent über referral_id+side).
  async _creditMember({ customer_id, member, points, referralId, side, referralCode }) {
    if (!member?.id || !(Number(points) > 0)) return
    const existing = await this.supabase
      .from('loyalty_transactions')
      .select('id')
      .eq('loyalty_customer_id', member.id)
      .eq('action', 'referral_bonus')
      .contains('metadata', { referral_id: referralId, side })
      .limit(1)
    if ((existing?.data || []).length > 0) return // bereits gutgeschrieben

    const now = new Date().toISOString()
    await this.supabase.from('loyalty_transactions').insert({
      customer_id,
      loyalty_customer_id: member.id,
      action: 'referral_bonus',
      points: Number(points),
      source: 'referral',
      description: side === 'referrer' ? 'Empfehlungsbonus (Werber)' : 'Empfehlungsbonus (geworbener Freund)',
      metadata: { referral_id: referralId, side, referral_code: referralCode }
    })
    await this.supabase.from('loyalty_customers').update({
      points_balance: Number(member.points_balance || 0) + Number(points),
      total_points: Number(member.total_points || 0) + Number(points),
      last_activity_at: now
    }).eq('id', member.id)
  }

  async listForCustomer(customer_id) {
    const settings = await this._settings(customer_id)
    const { data } = await this.supabase
      .from('loyalty_referrals')
      .select('*')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false })
      .limit(500)
    const referrals = data || []
    const stats = {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'pending' || r.status === 'joined').length,
      credited: referrals.filter((r) => r.status === 'credited').length,
      rejected: referrals.filter((r) => r.status === 'rejected').length
    }
    return { settings, referrals, stats }
  }
}

module.exports = {
  EndcustomerReferralService,
  // Pure helpers (testbar)
  normalizeEmail,
  referralCodeForMember,
  isSelfReferral,
  computeReferralCredit,
  withinMaxPerReferrer,
  referralIdempotencyKey,
  canCreditReferral
}
