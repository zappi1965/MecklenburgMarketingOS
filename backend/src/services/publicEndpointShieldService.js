const shieldAttempts = new Map()

function clientIp(req) {
  return String(req?.headers?.['x-forwarded-for'] || req?.ip || '').split(',')[0].trim()
}

function shieldKey({ action, slug, email, ip }) {
  return `${action || 'public'}:${slug || '-'}:${String(email || '').toLowerCase()}:${ip || '-'}`
}

function nowMs() { return Date.now() }

function hasHoneypot(body = {}) {
  const keys = ['website', 'url', 'homepage', 'company_url', 'fax', 'bot_field', '_gotcha', 'nickname_extra']
  return keys.some((key) => body[key] && String(body[key]).trim().length > 0)
}

function inspectPublicAction({ req, action, slug, email, body = {}, max = 30, windowMs = 15 * 60 * 1000 } = {}) {
  const ip = clientIp(req)
  if (hasHoneypot(body)) {
    return { ok: false, status: 400, code: 'BOT_HONEYPOT_TRIGGERED', error: 'Aktion wurde blockiert.', ip, score: 100 }
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
    return { ok: false, status: 429, code: 'PUBLIC_SHIELD_TEMP_BLOCK', error: 'Zu viele Aktionen. Bitte später erneut versuchen.', retry_after_ms: entry.blocked_until - now, ip, score: 90 }
  }

  entry.count += 1
  if (entry.count > max) entry.blocked_until = now + Math.min(windowMs, 30 * 60 * 1000)
  shieldAttempts.set(key, entry)

  if (entry.count > max) {
    return { ok: false, status: 429, code: 'PUBLIC_SHIELD_RATE_LIMIT', error: 'Zu viele Aktionen. Bitte später erneut versuchen.', retry_after_ms: entry.blocked_until - now, ip, score: 80, count: entry.count, max }
  }

  const score = Math.min(70, Math.max(0, Math.round((entry.count / Math.max(1, max)) * 70)))
  return { ok: true, ip, score, count: entry.count, max, reset_at: entry.reset_at }
}

async function recordPublicShieldEvent(supabase, result = {}, ctx = {}) {
  if (!supabase || !result) return
  if (result.ok && Number(result.score || 0) < 55) return
  try {
    await supabase.from('security_events').insert({
      customer_id: ctx.customer_id || null,
      actor_type: 'public',
      actor_id: ctx.email || result.ip || null,
      event_type: result.ok ? 'public_endpoint_risk' : 'public_endpoint_blocked',
      severity: result.ok ? 'warning' : 'critical',
      title: result.ok ? 'Auffällige öffentliche Aktion' : 'Öffentliche Aktion blockiert',
      description: `${ctx.action || 'public'} auf /l/${ctx.slug || '-'}`,
      metadata: { ...ctx, shield: result, user_agent: ctx.user_agent || null }
    })
  } catch (_) {}
}

function publicShieldStatus() {
  return { ok: true, active_keys: shieldAttempts.size, checked_at: new Date().toISOString() }
}

module.exports = { inspectPublicAction, recordPublicShieldEvent, publicShieldStatus }
