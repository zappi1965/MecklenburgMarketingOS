// Wallet Magic-Link-Service.
//
// Endkunden-Self-Service ohne Passwort:
//   1. /wallet/me Eingabeformular -> POST /api/wallet/me/request-link {email}
//   2. Backend signiert HMAC-SHA256-Token (email + exp), schickt Link
//      per Mail -> /wallet/me?email=...&exp=...&sig=...
//   3. Frontend GET /api/wallet/me?token=... -> verifiziert Token,
//      liefert alle loyalty_customers-Rows mit gleicher E-Mail +
//      Customer-Snapshot.
//
// Sicherheit:
//   - HMAC mit WALLET_TOKEN_SECRET (ENV); Dev-Fallback nur mit Warning
//   - TTL 1h
//   - Kein User-Enumeration: request-link liefert IMMER 200
//   - Rate-Limit auf request-link (siehe walletMeRoutes)
//   - Verifikation in konstanter Zeit (timingSafeEqual)

const crypto = require('crypto')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const DEFAULT_TTL_MS = 60 * 60 * 1000 // 1h
const DEFAULT_BASE_URL = process.env.PUBLIC_APP_URL || 'http://localhost:3000'

function tokenSecret() {
  const s = process.env.WALLET_TOKEN_SECRET
  if (s && s.length >= 16) return s
  // Dev-Fallback. In Production muss WALLET_TOKEN_SECRET gesetzt sein,
  // sonst sind die Magic-Links nicht reproduzierbar zwischen Instances.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('WALLET_TOKEN_SECRET nicht gesetzt (Production)')
  }
  return 'dev-only-wallet-magic-secret-please-replace'
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function signParts(email, exp) {
  return crypto
    .createHmac('sha256', tokenSecret())
    .update(`${email}|${exp}`)
    .digest('base64url')
}

function generateToken({ email, ttlMs = DEFAULT_TTL_MS } = {}) {
  const norm = normalizeEmail(email)
  if (!norm.includes('@')) throw new Error('Ungueltige E-Mail-Adresse')
  const exp = Date.now() + Number(ttlMs || DEFAULT_TTL_MS)
  const sig = signParts(norm, exp)
  return { email: norm, exp, sig }
}

function verifyToken({ email, exp, sig }) {
  const norm = normalizeEmail(email)
  if (!norm || !exp || !sig) return { ok: false, reason: 'incomplete' }
  const expNum = Number(exp)
  if (!Number.isFinite(expNum)) return { ok: false, reason: 'exp_invalid' }
  if (expNum < Date.now()) return { ok: false, reason: 'expired' }
  const expected = signParts(norm, expNum)
  let same = false
  try {
    same = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  } catch {
    same = false
  }
  if (!same) return { ok: false, reason: 'signature_mismatch' }
  return { ok: true, email: norm, exp: expNum }
}

function buildMagicLink({ email, exp, sig, base_url }) {
  const base = String(base_url || DEFAULT_BASE_URL).replace(/\/$/, '')
  const params = new URLSearchParams({ email, exp: String(exp), sig })
  return `${base}/wallet/me?${params.toString()}`
}

// Hauptmethode fuer den request-link-Endpoint. Liefert IMMER Status ok,
// auch wenn die E-Mail unbekannt ist (kein User-Enumeration).
async function requestMagicLink({ email, base_url }) {
  const norm = normalizeEmail(email)
  if (!norm.includes('@')) {
    // Trotzdem ok zurueck damit Aufrufer-Skripte nicht zwischen
    // "ungueltige Mail" und "unbekannte Mail" unterscheiden koennen.
    return { ok: true, dispatched: false, reason: 'invalid_email_format' }
  }

  // Pruefe ob ueberhaupt eine Membership existiert. Wenn nicht: kein
  // Link verschicken, aber API antwortet trotzdem ok.
  const supabase = getSupabaseAdmin()
  let exists = false
  if (supabase) {
    try {
      const { data } = await supabase
        .from('loyalty_customers')
        .select('id')
        .ilike('email', norm)
        .limit(1)
        .maybeSingle()
      exists = Boolean(data)
    } catch (_) {
      exists = false
    }
  }

  if (!exists) {
    // Token NICHT zurueckgeben - kein User-Enumeration.
    return { ok: true, dispatched: false }
  }

  const { exp, sig } = generateToken({ email: norm })
  const link = buildMagicLink({ email: norm, exp, sig, base_url })

  // Mail-Versand: nutzt mailService wenn vorhanden, sonst Console-Log
  // im Dev-Modus.
  let mailService
  try { mailService = require('./mailService') } catch { mailService = null }
  const subject = 'Deine MMOS-Bonusclub-Uebersicht'
  const body = [
    'Hallo,',
    '',
    'Hier ist dein persoenlicher Zugang zu deinen Bonusclubs.',
    'Der Link ist 1 Stunde gueltig:',
    '',
    link,
    '',
    'Wenn du diesen Link nicht angefordert hast, kannst du diese Mail',
    'einfach ignorieren.',
    '',
    'MMOS'
  ].join('\n')

  try {
    if (mailService && typeof mailService.send === 'function') {
      await mailService.send({ to: norm, subject, body })
    } else {
      console.log('[walletMagicLink] (no mailService) link for', norm, ':', link)
    }
  } catch (e) {
    console.error('[walletMagicLink] mail send failed:', e?.message || e)
  }

  return { ok: true, dispatched: true }
}

// Liefert alle Memberships dieser E-Mail mit Customer-Branding-Snapshot.
async function listMemberships({ email }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) { const e = new Error('Supabase nicht konfiguriert'); e.status = 503; throw e }
  const norm = normalizeEmail(email)
  if (!norm) return { memberships: [] }

  const { data: members, error } = await supabase
    .from('loyalty_customers')
    .select('id, customer_id, display_name, email, points_balance, tier, last_scan_at, created_at')
    .ilike('email', norm)
    .order('last_scan_at', { ascending: false })
  if (error) throw error

  const customerIds = [...new Set((members || []).map((m) => m.customer_id).filter(Boolean))]
  const customerMap = new Map()
  if (customerIds.length) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, brand_primary, brand_secondary, metadata')
      .in('id', customerIds)
    for (const c of customers || []) customerMap.set(c.id, c)
  }

  // Pro Membership zusaetzlich die Anzahl der verfuegbaren Rewards
  // (points_required <= balance) zaehlen.
  const memberships = []
  for (const m of members || []) {
    const customer = customerMap.get(m.customer_id) || null
    let unlocked_rewards = 0
    let total_rewards = 0
    try {
      const { data: rewards } = await supabase
        .from('loyalty_rewards')
        .select('id, points_required, active')
        .eq('customer_id', m.customer_id)
        .eq('active', true)
      total_rewards = (rewards || []).length
      unlocked_rewards = (rewards || []).filter(
        (r) => Number(r.points_required || 0) <= Number(m.points_balance || 0)
      ).length
    } catch (_) {}
    memberships.push({
      member_id: m.id,
      customer_id: m.customer_id,
      customer_name: customer?.name || 'Unbekannter Anbieter',
      brand_primary: customer?.brand_primary || customer?.metadata?.brand_primary || '#d4af37',
      brand_secondary: customer?.brand_secondary || customer?.metadata?.brand_secondary || '#111827',
      display_name: m.display_name,
      points_balance: Number(m.points_balance || 0),
      tier: m.tier,
      last_scan_at: m.last_scan_at,
      member_since: m.created_at,
      unlocked_rewards,
      total_rewards,
      wallet_link: `/api/wallet/loyalty-member/${encodeURIComponent(m.id)}`
    })
  }

  return { email: norm, memberships, count: memberships.length }
}

module.exports = {
  generateToken,
  verifyToken,
  buildMagicLink,
  requestMagicLink,
  listMemberships,
  // Test-Helpers:
  _signParts: signParts,
  _normalizeEmail: normalizeEmail,
  _tokenSecret: tokenSecret
}
