const crypto = require('crypto')

const shieldAttempts = new Map()
const PERSISTENT_TABLE = 'public_endpoint_shield_attempts'

function clientIp(req) {
  return String(req?.headers?.['x-forwarded-for'] || req?.ip || '').split(',')[0].trim()
}

function salt() {
  return process.env.PUBLIC_SHIELD_SALT || process.env.ADMIN_AUDIT_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'mmos-public-shield'
}

function hashValue(value = '') {
  return crypto.createHash('sha256').update(`${salt()}:${String(value || '')}`).digest('hex')
}

function shieldKey({ action, slug, email, ip }) {
  return `${action || 'public'}:${slug || '-'}:${String(email || '').toLowerCase()}:${ip || '-'}`
}

function nowMs() { return Date.now() }
function iso(ms) { return new Date(ms).toISOString() }
function msFromIso(value, fallback = 0) {
  const parsed = value ? Date.parse(value) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

function hasHoneypot(body = {}) {
  const keys = ['website', 'url', 'homepage', 'company_url', 'fax', 'bot_field', '_gotcha', 'nickname_extra']
  return keys.some((key) => body[key] && String(body[key]).trim().length > 0)
}

function inspectMemory({ req, action, slug, email, body = {}, max = 30, windowMs = 15 * 60 * 1000 } = {}) {
  const ip = clientIp(req)
  if (hasHoneypot(body)) {
    return { ok: false, status: 400, code: 'BOT_HONEYPOT_TRIGGERED', error: 'Aktion wurde blockiert.', ip, score: 100, persistent: false }
  }

  const key = shieldKey({ action, slug, email, ip })
  const now = nowMs()
  const entry = shieldAttempts.get(key) || { count: 0, reset_at: now + windowMs, blocked_until: 0 }
  if (entry.reset_at < now) {
    entry.count = 0
    entry.reset_at = now + windowMs
    entry.blocked_until = 0
  }

  if (entry.blocked_until && entry.blocked_until > now) {
    shieldAttempts.set(key, entry)
    return { ok: false, status: 429, code: 'PUBLIC_SHIELD_TEMP_BLOCK', error: 'Zu viele Aktionen. Bitte später erneut versuchen.', retry_after_ms: entry.blocked_until - now, ip, score: 90, persistent: false }
  }

  entry.count += 1
  if (entry.count > max) entry.blocked_until = now + Math.min(windowMs, 30 * 60 * 1000)
  shieldAttempts.set(key, entry)

  if (entry.count > max) {
    return { ok: false, status: 429, code: 'PUBLIC_SHIELD_RATE_LIMIT', error: 'Zu viele Aktionen. Bitte später erneut versuchen.', retry_after_ms: entry.blocked_until - now, ip, score: 80, count: entry.count, max, persistent: false }
  }

  const score = Math.min(70, Math.max(0, Math.round((entry.count / Math.max(1, max)) * 70)))
  return { ok: true, ip, score, count: entry.count, max, reset_at: entry.reset_at, persistent: false }
}

async function inspectPersistent({ supabase, req, action, slug, email, body = {}, max = 30, windowMs = 15 * 60 * 1000 } = {}) {
  const ip = clientIp(req)
  if (hasHoneypot(body)) {
    return { ok: false, status: 400, code: 'BOT_HONEYPOT_TRIGGERED', error: 'Aktion wurde blockiert.', ip, score: 100, persistent: true }
  }
  if (!supabase || process.env.PUBLIC_SHIELD_PERSISTENT === 'false') {
    return inspectMemory({ req, action, slug, email, body, max, windowMs })
  }

  const now = nowMs()
  const rawKey = shieldKey({ action, slug, email, ip })
  const keyHash = hashValue(rawKey)
  const emailHash = email ? hashValue(String(email).toLowerCase()) : null
  const ipHash = ip ? hashValue(ip) : null

  try {
    const { data: existing, error: readError } = await supabase
      .from(PERSISTENT_TABLE)
      .select('*')
      .eq('key_hash', keyHash)
      .maybeSingle()

    if (readError) throw readError

    let count = Number(existing?.count || 0)
    let resetAt = msFromIso(existing?.reset_at, now + windowMs)
    let blockedUntil = msFromIso(existing?.blocked_until, 0)

    if (!existing || resetAt < now) {
      count = 0
      resetAt = now + windowMs
      blockedUntil = 0
    }

    if (blockedUntil && blockedUntil > now) {
      return { ok: false, status: 429, code: 'PUBLIC_SHIELD_TEMP_BLOCK', error: 'Zu viele Aktionen. Bitte später erneut versuchen.', retry_after_ms: blockedUntil - now, ip, ip_hash: ipHash, email_hash: emailHash, score: 90, count, max, reset_at: resetAt, blocked_until: blockedUntil, persistent: true }
    }

    count += 1
    if (count > max) blockedUntil = now + Math.min(windowMs, 30 * 60 * 1000)

    const row = {
      key_hash: keyHash,
      action: String(action || 'public').slice(0, 120),
      slug: slug ? String(slug).slice(0, 180) : null,
      email_hash: emailHash,
      ip_hash: ipHash,
      count,
      max_count: Number(max) || 30,
      window_ms: Number(windowMs) || 900000,
      reset_at: iso(resetAt),
      blocked_until: blockedUntil ? iso(blockedUntil) : null,
      last_seen_at: iso(now),
      metadata: {
        persistent: true,
        user_agent_hash: hashValue(req?.get ? req.get('user-agent') || '' : ''),
        method: req?.method || null
      },
      updated_at: iso(now)
    }

    const { error: upsertError } = await supabase
      .from(PERSISTENT_TABLE)
      .upsert(row, { onConflict: 'key_hash' })

    if (upsertError) throw upsertError

    if (count > max) {
      return { ok: false, status: 429, code: 'PUBLIC_SHIELD_RATE_LIMIT', error: 'Zu viele Aktionen. Bitte später erneut versuchen.', retry_after_ms: blockedUntil - now, ip, ip_hash: ipHash, email_hash: emailHash, score: 80, count, max, reset_at: resetAt, blocked_until: blockedUntil, persistent: true }
    }

    const score = Math.min(70, Math.max(0, Math.round((count / Math.max(1, max)) * 70)))
    return { ok: true, ip, ip_hash: ipHash, email_hash: emailHash, score, count, max, reset_at: resetAt, persistent: true }
  } catch (error) {
    const fallback = inspectMemory({ req, action, slug, email, body, max, windowMs })
    return { ...fallback, persistent: false, persistent_error: error?.message || String(error) }
  }
}

function inspectPublicAction(options = {}) {
  // Backward-compatible: if caller does not await/pass supabase, keep memory mode.
  if (options.supabase) return inspectPersistent(options)
  return inspectMemory(options)
}

async function recordPublicShieldEvent(supabase, result = {}, ctx = {}) {
  if (!supabase || !result) return
  if (result.ok && Number(result.score || 0) < 55 && !result.persistent_error) return
  try {
    await supabase.from('security_events').insert({
      customer_id: ctx.customer_id || null,
      actor_type: 'public',
      actor_id: result.email_hash || result.ip_hash || null,
      event_type: result.ok ? 'public_endpoint_risk' : 'public_endpoint_blocked',
      severity: result.ok ? 'warning' : 'critical',
      title: result.ok ? 'Auffällige öffentliche Aktion' : 'Öffentliche Aktion blockiert',
      description: `${ctx.action || 'public'} auf /l/${ctx.slug || '-'}`,
      metadata: { ...ctx, email: undefined, shield: { ...result, ip: undefined }, user_agent: ctx.user_agent || null }
    })
  } catch (_) {}
}

function publicShieldStatus() {
  return {
    ok: true,
    mode: process.env.PUBLIC_SHIELD_PERSISTENT === 'false' ? 'memory' : 'persistent_with_memory_fallback',
    persistent_table: PERSISTENT_TABLE,
    active_memory_keys: shieldAttempts.size,
    checked_at: new Date().toISOString()
  }
}

module.exports = { inspectPublicAction, recordPublicShieldEvent, publicShieldStatus }
