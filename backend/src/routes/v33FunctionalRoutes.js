
const express = require('express')
const crypto = require('crypto')
const { V35BusinessEngine, sentimentFromRating } = require('../services/v35BusinessEngine')
const { inspectPublicAction, recordPublicShieldEvent } = require('../services/publicEndpointShieldService')
const { writeCriticalAudit } = require('../services/criticalAuditService')
const { requestMarketingDoubleOptIn, confirmMarketingConsentToken, withdrawMarketingConsentByTokenOrLogin, consentFromBody, createUnsubscribeToken } = require('../services/marketingConsentMailService')
const MailService = require('../services/mailService')

const safeToken = (prefix = 'tok') => `${prefix}_${crypto.randomBytes(12).toString('hex')}`
const clean = (v) => v === undefined || v === null ? null : String(v).trim() || null
const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback

const PUBLIC_PASSWORD_MIN_LENGTH = 8
const publicAuthAttempts = new Map()
function publicAuthKey(slug, email, ip) { return `${slug}:${String(email || '').toLowerCase()}:${ip || ''}` }
function checkPublicAuthRateLimit(slug, email, ip) {
  const key = publicAuthKey(slug, email, ip)
  const now = Date.now()
  const windowMs = Number(process.env.PUBLIC_AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)
  const max = Number(process.env.PUBLIC_AUTH_RATE_LIMIT_MAX || 8)
  const entry = publicAuthAttempts.get(key) || { count: 0, reset_at: now + windowMs }
  if (entry.reset_at < now) { entry.count = 0; entry.reset_at = now + windowMs }
  entry.count += 1
  publicAuthAttempts.set(key, entry)
  return { ok: entry.count <= max, count: entry.count, reset_at: entry.reset_at, max }
}
function resetPublicAuthRateLimit(slug, email, ip) { publicAuthAttempts.delete(publicAuthKey(slug, email, ip)) }
function publicPasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password || ''), salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}
function publicPasswordVerify(password, stored) {
  const parts = String(stored || '').split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const expected = publicPasswordHash(password, parts[1])
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(stored))
  } catch (_) {
    return false
  }
}
function getPublicPasswordHash(member) {
  return member?.password_hash || member?.metadata?.public_auth?.password_hash || member?.metadata?.password_hash || null
}
function withPublicPassword(member, password, now = new Date().toISOString()) {
  const metadata = { ...(member?.metadata || {}) }
  metadata.public_auth = { ...(metadata.public_auth || {}), password_hash: publicPasswordHash(password), password_set_at: now, auth_method: 'email_password' }
  return metadata
}


const MARKETING_CONSENT_VERSION = 'marketing-reactivation-v2-2026-06-03'
function marketingConsentFromBody(body = {}) {
  return consentFromBody(body)
}

function marketingConsentIpHash(req) {
  try {
    const raw = `${req.ip || ''}|${req.get?.('x-forwarded-for') || ''}|${req.get?.('user-agent') || ''}`
    return crypto.createHash('sha256').update(raw).digest('hex')
  } catch (_) {
    return null
  }
}

async function persistMarketingConsent(supabase, { customerId, program, qrCampaign, member, slug, email, displayName, body, req }) {
  return requestMarketingDoubleOptIn(supabase, { customerId, program, qrCampaign, member, slug, email, displayName, body, req, requireDelivery: false })
}


async function withdrawMarketingConsent(supabase, { customerId, member, slug, email, req, reason = '' }) {
  if (!member?.id || !customerId) return { ok: false, error: 'Mitglied nicht gefunden.' }
  const now = new Date().toISOString()
  const evidence = {
    customer_id: customerId,
    loyalty_customer_id: member.id,
    slug,
    email,
    reason: clean(reason) || 'withdrawn_by_user',
    withdrawn_at: now,
    ip_hash: marketingConsentIpHash(req),
    user_agent: req.get?.('user-agent') || null
  }
  const nextMetadata = {
    ...(member.metadata || {}),
    consent_marketing: false,
    marketing_consent_status: 'withdrawn',
    marketing_consent_withdrawn_at: now,
    marketing_consent_withdrawal: evidence
  }
  let updatedMember = member
  try {
    const updated = await supabase.from('loyalty_customers').update({ metadata: nextMetadata }).eq('id', member.id).select('*').maybeSingle()
    if (!updated.error && updated.data) updatedMember = updated.data
  } catch (_) {}
  try {
    await supabase.from('v33_functional_records').insert({
      resource: 'marketing_consent_withdrawals',
      local_id: `marketing_consent_withdrawal_${member.id}_${Date.now()}`,
      customer_id: customerId,
      title: `Widerruf Werbeeinwilligung ${email || member.id}`,
      status: 'withdrawn',
      payload: evidence,
      created_at: now,
      updated_at: now
    })
  } catch (_) {}
  return { ok: true, withdrawn: true, member: updatedMember }
}


function slugify(input, fallback = 'kunde') {
  const s = String(input || fallback)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || fallback
}

function v33FunctionalRoutes(supabase) {
  const router = express.Router()
  const engine = new V35BusinessEngine(supabase)

  function v39ErrorPayload(code, message, details = null, hint = null, warnings = []) {
    return { ok: false, code, error: message, details, hint, warnings }
  }

  async function v39SafeInsert(table, payload, warnings, label = table) {
    try {
      const { data, error } = await supabase.from(table).insert(payload).select('*').single()
      if (error) {
        warnings.push({ label, table, error: error.message, hint: `Prüfe Tabelle/Spalten für ${table}` })
        return null
      }
      return data
    } catch (e) {
      warnings.push({ label, table, error: e.message, hint: `Prüfe Tabelle/Spalten für ${table}` })
      return null
    }
  }

  async function v39SafeUpdate(table, patch, eqKey, eqValue, warnings, label = table) {
    try {
      const { data, error } = await supabase.from(table).update(patch).eq(eqKey, eqValue).select('*').maybeSingle()
      if (error) {
        warnings.push({ label, table, error: error.message, hint: `Prüfe Tabelle/Spalten für ${table}` })
        return null
      }
      return data
    } catch (e) {
      warnings.push({ label, table, error: e.message, hint: `Prüfe Tabelle/Spalten für ${table}` })
      return null
    }
  }

  async function v39LogEngineRun(customerId, engineKey, status, input = {}, output = {}, error = null, startedAt = null) {
    const finishedAt = new Date()
    const started = startedAt ? new Date(startedAt) : finishedAt
    const durationMs = Math.max(0, finishedAt.getTime() - started.getTime())
    try {
      await supabase.from('v35_engine_runs').insert({
        customer_id: customerId || null,
        engine_key: engineKey,
        status,
        input,
        output: {
          ...(output || {}),
          error: error ? String(error.message || error) : null,
          duration_ms: durationMs,
          finished_at: finishedAt.toISOString()
        }
      })
    } catch (_) {}
  }

  async function v39FindRecentLead(customerId, slug, email, deviceId) {
    if (!email && !deviceId) return null
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    let q = supabase.from('v33_public_leads')
      .select('*')
      .eq('customer_id', customerId)
      .eq('slug', slug)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
    if (email) q = q.eq('email', email)
    else q = q.contains('metadata', { device_id: deviceId })
    const found = await q.maybeSingle()
    if (!found.error && found.data) return found.data
    return null
  }


  async function getQrCampaignForPublicProgram(program, slug) {
    try {
      if (program?.qr_campaign_id) {
        const q = await supabase.from('qr_campaigns').select('*').eq('id', program.qr_campaign_id).maybeSingle()
        if (!q.error && q.data) return q.data
      }
      if (slug) {
        const q = await supabase.from('qr_campaigns').select('*').eq('slug', slug).maybeSingle()
        if (!q.error && q.data) return q.data
      }
    } catch (_) {}
    return null
  }

  async function resolvePublicLoyaltyContext(slug) {
    const wantedSlug = String(slug || '').trim()
    let qrCampaign = null
    let program = null

    try {
      const q = await supabase.from('qr_campaigns').select('*').eq('slug', wantedSlug).maybeSingle()
      if (!q.error && q.data) qrCampaign = q.data
    } catch (_) {}

    try {
      const p = await supabase.from('loyalty_programs').select('*').eq('slug', wantedSlug).maybeSingle()
      if (!p.error && p.data) program = p.data
    } catch (_) {}

    if (!program && qrCampaign?.loyalty_program_id) {
      try {
        const p = await supabase.from('loyalty_programs').select('*').eq('id', qrCampaign.loyalty_program_id).maybeSingle()
        if (!p.error && p.data) program = p.data
      } catch (_) {}
    }

    if (!program && qrCampaign?.id) {
      try {
        const p = await supabase.from('loyalty_programs').select('*').eq('qr_campaign_id', qrCampaign.id).maybeSingle()
        if (!p.error && p.data) program = p.data
      } catch (_) {}
    }

    if (!program && qrCampaign?.customer_id) {
      try {
        const p = await supabase.from('loyalty_programs')
          .select('*')
          .eq('customer_id', qrCampaign.customer_id)
          .order('updated_at', { ascending: false })
          .limit(20)
        if (!p.error) {
          const rows = p.data || []
          program = rows.find((row) => String(row.qr_campaign_id || '') === String(qrCampaign.id || '')) || rows.find((row) => row.active !== false) || rows[0] || null
        }
      } catch (_) {}
    }

    if (program && !qrCampaign) {
      qrCampaign = await getQrCampaignForPublicProgram(program, wantedSlug)
    }

    // Alte Kampagnen hatten oft getrennte Slugs: QR-Kampagne=/q/[qrSlug], Loyalty-Programm=/l/[programSlug].
    // Öffentlich ist ab V083 der QR-Kampagnen-Slug führend. Die Aktionen bleiben trotzdem am gefundenen Programm.
    return {
      program,
      qrCampaign,
      customerId: program?.customer_id || qrCampaign?.customer_id || null,
      slug: wantedSlug,
      canonical_slug: qrCampaign?.slug || wantedSlug,
      program_slug: program?.slug || null
    }
  }


  function isPostgrestSchemaCacheError(error) {
    const code = String(error?.code || '')
    const msg = String(error?.message || error || '')
    return code === 'PGRST204' || msg.includes('schema cache') || msg.includes('Could not find the') || msg.includes('column') && msg.includes('does not exist')
  }

  function omitPayloadKeys(payload, keys = []) {
    const next = { ...(payload || {}) }
    for (const key of keys) delete next[key]
    return next
  }

  function schemaMissingColumnName(error) {
    const msg = String(error?.message || error?.details || error || '')
    const patterns = [
      /Could not find the '([^']+)' column/i,
      /column \"([^\"]+)\" of relation/i,
      /column \"([^\"]+)\" does not exist/i,
      /'([^']+)' column/i
    ]
    for (const pattern of patterns) {
      const match = msg.match(pattern)
      if (match?.[1]) return match[1]
    }
    return null
  }

  function loyaltyCustomerSafePayload(payload = {}) {
    // Diese Felder existieren nicht in jeder Live-Datenbank bzw. sind nach
    // Migrationen manchmal noch nicht im PostgREST-Schema-Cache. Für das
    // Punktezählen sind nur customer_id, loyalty_program_id, email,
    // points_balance und metadata wirklich kritisch.
    return omitPayloadKeys(payload, [
      'device_id',
      'total_points',
      'total_scans',
      'last_activity_at',
      'updated_at',
      'last_seen_at',
      'phone',
      'tier',
      'consent_at'
    ])
  }

  async function insertLoyaltyCustomerSafe(payload = {}) {
    let nextPayload = { ...(payload || {}) }
    let lastResult = null
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await supabase.from('loyalty_customers').insert(nextPayload).select('*').single()
      lastResult = result
      if (!result.error) return result
      if (!isPostgrestSchemaCacheError(result.error)) return result
      const missing = schemaMissingColumnName(result.error)
      if (missing && Object.prototype.hasOwnProperty.call(nextPayload, missing)) {
        delete nextPayload[missing]
        continue
      }
      const stripped = loyaltyCustomerSafePayload(nextPayload)
      if (Object.keys(stripped).length !== Object.keys(nextPayload).length) {
        nextPayload = stripped
        continue
      }
      return result
    }
    return lastResult || { data: null, error: new Error('Loyalty-Mitglied konnte nicht gespeichert werden.') }
  }

  async function updateLoyaltyCustomerSafe(id, patch = {}) {
    let nextPatch = { ...(patch || {}) }
    let lastResult = null
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await supabase.from('loyalty_customers').update(nextPatch).eq('id', id).select('*').single()
      lastResult = result
      if (!result.error) return result
      if (!isPostgrestSchemaCacheError(result.error)) return result
      const missing = schemaMissingColumnName(result.error)
      if (missing && Object.prototype.hasOwnProperty.call(nextPatch, missing)) {
        delete nextPatch[missing]
        continue
      }
      const stripped = loyaltyCustomerSafePayload(nextPatch)
      if (Object.keys(stripped).length !== Object.keys(nextPatch).length) {
        nextPatch = stripped
        continue
      }
      return result
    }
    return lastResult || { data: null, error: new Error('Loyalty-Mitglied konnte nicht aktualisiert werden.') }
  }

  async function insertLoyaltyTransactionSafe(payload = {}) {
    let nextPayload = { ...(payload || {}) }
    let lastResult = null
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await supabase.from('loyalty_transactions').insert(nextPayload).select('*').single()
      lastResult = result
      if (!result.error) return result
      if (!isPostgrestSchemaCacheError(result.error)) return result
      const missing = schemaMissingColumnName(result.error)
      if (missing && Object.prototype.hasOwnProperty.call(nextPayload, missing)) {
        delete nextPayload[missing]
        continue
      }
      const stripped = omitPayloadKeys(nextPayload, ['description', 'source', 'metadata', 'created_at', 'qr_campaign_id'])
      if (Object.keys(stripped).length !== Object.keys(nextPayload).length) {
        nextPayload = stripped
        continue
      }
      return result
    }
    return lastResult || { data: null, error: new Error('Loyalty-Transaktion konnte nicht gespeichert werden.') }
  }


  async function insertTableSchemaSafe(table, payload = {}, options = {}) {
    let nextPayload = { ...(payload || {}) }
    let lastResult = null
    const single = options.single !== false
    for (let attempt = 0; attempt < 14; attempt += 1) {
      let query = supabase.from(table).insert(nextPayload).select('*')
      if (single) query = query.single()
      const result = await query
      lastResult = result
      if (!result.error) return result
      if (!isPostgrestSchemaCacheError(result.error)) return result
      const missing = schemaMissingColumnName(result.error)
      if (missing && Object.prototype.hasOwnProperty.call(nextPayload, missing)) {
        delete nextPayload[missing]
        continue
      }
      // Fallback: Einstellungen müssen den Public-Flow nie blockieren.
      const stripped = omitPayloadKeys(nextPayload, [
        'require_rescan_for_points',
        'rotate_qr_after_scan',
        'daily_point_limit_per_member',
        'weekly_point_limit_per_member',
        'weekly_scan_limit_enabled',
        'suspicion_score_threshold',
        'birthday_bonus_points',
        'referral_bonus_referrer',
        'referral_bonus_friend',
        'qr_style',
        'qr_foreground',
        'qr_background',
        'qr_logo_text',
        'brand_font',
        'brand_primary',
        'brand_secondary',
        'brand_accent',
        'level_rules',
        'metadata',
        'updated_at'
      ])
      if (Object.keys(stripped).length !== Object.keys(nextPayload).length) {
        nextPayload = stripped
        continue
      }
      return result
    }
    return lastResult || { data: null, error: new Error(`${table} konnte nicht gespeichert werden.`) }
  }

  async function updateTableSchemaSafe(table, patch = {}, applyQuery = (q) => q, options = {}) {
    let nextPatch = { ...(patch || {}) }
    let lastResult = null
    const single = options.single === true
    for (let attempt = 0; attempt < 14; attempt += 1) {
      let query = applyQuery(supabase.from(table).update(nextPatch)).select('*')
      if (single) query = query.single()
      const result = await query
      lastResult = result
      if (!result.error) return result
      if (!isPostgrestSchemaCacheError(result.error)) return result
      const missing = schemaMissingColumnName(result.error)
      if (missing && Object.prototype.hasOwnProperty.call(nextPatch, missing)) {
        delete nextPatch[missing]
        continue
      }
      const stripped = omitPayloadKeys(nextPatch, [
        'require_rescan_for_points',
        'rotate_qr_after_scan',
        'daily_point_limit_per_member',
        'weekly_point_limit_per_member',
        'weekly_scan_limit_enabled',
        'suspicion_score_threshold',
        'birthday_bonus_points',
        'referral_bonus_referrer',
        'referral_bonus_friend',
        'qr_style',
        'qr_foreground',
        'qr_background',
        'qr_logo_text',
        'brand_font',
        'brand_primary',
        'brand_secondary',
        'brand_accent',
        'level_rules',
        'metadata',
        'updated_at'
      ])
      if (Object.keys(stripped).length !== Object.keys(nextPatch).length) {
        nextPatch = stripped
        continue
      }
      return result
    }
    return lastResult || { data: null, error: new Error(`${table} konnte nicht aktualisiert werden.`) }
  }

  function rewardDisplayTitle(reward = {}) {
    const meta = reward.metadata && typeof reward.metadata === 'object' ? reward.metadata : {}
    return clean(reward.title || reward.name || reward.label || reward.reward_title || reward.reward_name || reward.display_name || reward.benefit || reward.description || meta.title || meta.name || meta.label) || 'Prämie'
  }

  function rewardBelongsToPublicSlug(reward = {}, { program, campaignId, activeRecordRewardIds, hasActiveRecordRewards } = {}) {
    const id = String(reward.id || reward.local_id || reward.reward_id || '')
    const meta = reward.metadata && typeof reward.metadata === 'object' ? reward.metadata : {}
    if (!isPublicActiveReward(reward)) return false
    if (hasActiveRecordRewards && id && !activeRecordRewardIds.has(id) && meta.demo !== true && meta.public_global !== true) return false
    const programId = reward.loyalty_program_id || reward.program_id || meta.loyalty_program_id || meta.program_id
    const rewardCampaignId = reward.qr_campaign_id || reward.campaign_id || meta.qr_campaign_id || meta.campaign_id
    if (programId && program?.id && String(programId) !== String(program.id)) return false
    if (rewardCampaignId && campaignId && String(rewardCampaignId) !== String(campaignId)) return false
    // V086: Public Rewards are strictly bound to the current QR target.
    // Old/global rewards from other campaigns must not bleed into newly created QR pages.
    if (!programId && !rewardCampaignId) return meta.public_global === true
    return true
  }

  function firstConfiguredNumber(sources, keys, fallback = 0) {
    for (const source of sources || []) {
      if (!source) continue
      for (const key of keys) {
        const value = key.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, source)
        if (value !== undefined && value !== null && value !== '') return num(value, fallback)
      }
    }
    return fallback
  }

  function configuredNumberInfo(sources, keys, fallback = 0) {
    for (const source of sources || []) {
      if (!source) continue
      for (const key of keys) {
        const value = key.split('.').reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, source)
        if (value !== undefined && value !== null && value !== '') return { configured: true, value: num(value, fallback), source_key: key }
      }
    }
    return { configured: false, value: fallback, source_key: null }
  }

  function qrScanLimitSettings(qrCampaign, program) {
    const sources = [qrCampaign, qrCampaign?.metadata, program, program?.metadata]
    const maxScansPerMember = configuredNumberInfo(sources, [
      'max_scans_per_member',
      'max_scans_per_user',
      'scan_limit_per_member',
      'scan_limit_per_user',
      'max_redemptions_per_member',
      'metadata.max_scans_per_member'
    ], 0)
    const dailyScansPerMember = configuredNumberInfo(sources, [
      'daily_scan_limit_per_member',
      'daily_scan_limit',
      'max_daily_scans_per_member',
      'max_daily_redemptions_per_member',
      'daily_redemption_limit_per_member',
      'metadata.daily_scan_limit_per_member',
      'metadata.daily_scan_limit'
    ], 0)
    const cooldownMinutes = configuredNumberInfo(sources, [
      'scan_cooldown_minutes',
      'cooldown_minutes',
      'qr_cooldown_minutes',
      'minutes_between_scans',
      'metadata.scan_cooldown_minutes'
    ], 0)
    const dailyPointLimit = configuredNumberInfo(sources, [
      'daily_point_limit_per_member',
      'daily_points_limit_per_member',
      'points_daily_limit',
      'metadata.daily_point_limit_per_member'
    ], 0)
    const suspicionThreshold = configuredNumberInfo(sources, [
      'suspicion_score_threshold',
      'abuse_score_threshold',
      'metadata.suspicion_score_threshold'
    ], 70)
    return {
      max_scans_per_member: Math.max(0, Math.floor(maxScansPerMember.value)),
      max_scans_per_member_configured: Boolean(maxScansPerMember.configured),
      daily_scan_limit_per_member: Math.max(0, Math.floor(dailyScansPerMember.value)),
      daily_scan_limit_per_member_configured: Boolean(dailyScansPerMember.configured),
      scan_cooldown_minutes: Math.max(0, Math.floor(cooldownMinutes.value)),
      scan_cooldown_minutes_configured: Boolean(cooldownMinutes.configured),
      daily_point_limit_per_member: Math.max(0, Math.floor(dailyPointLimit.value)),
      daily_point_limit_per_member_configured: Boolean(dailyPointLimit.configured),
      weekly_point_limit_per_member: Math.max(0, Math.floor(configuredNumberInfo(sources, [
        'weekly_point_limit_per_member',
        'weekly_points_limit_per_member',
        'points_weekly_limit',
        'metadata.weekly_point_limit_per_member'
      ], 0).value)),
      weekly_point_limit_per_member_configured: Boolean(configuredNumberInfo(sources, [
        'weekly_point_limit_per_member',
        'weekly_points_limit_per_member',
        'points_weekly_limit',
        'metadata.weekly_point_limit_per_member'
      ], 0).configured),
      require_rescan_for_points: (() => { const explicitOn = sources.some((s) => s && (s.require_rescan_for_points === true || s.metadata?.require_rescan_for_points === true)); const explicitOff = sources.some((s) => s && (s.require_rescan_for_points === false || s.metadata?.require_rescan_for_points === false)); const mode = String(qrCampaign?.purpose || qrCampaign?.mode || qrCampaign?.metadata?.purpose || program?.purpose || program?.mode || program?.metadata?.purpose || '').toLowerCase(); const points = num(qrCampaign?.points_per_scan ?? qrCampaign?.metadata?.points_per_scan ?? program?.points_per_scan ?? program?.metadata?.points_per_scan, 0); return explicitOn || (!explicitOff && points > 0 && (mode === 'loyalty' || mode === 'both' || !mode)); })(),
      suspicion_score_threshold: Math.max(0, Math.min(100, Math.floor(suspicionThreshold.value || 70)))
    }
  }

  async function checkQrScanRedemptionLimits({ customerId, program, qrCampaign, member, slug }) {
    const settings = qrScanLimitSettings(qrCampaign, program)
    if (!member?.id) return { ok: true, settings, previous_scans: 0, scans_today: 0 }
    if (!settings.max_scans_per_member && !settings.daily_scan_limit_per_member && !settings.scan_cooldown_minutes) return { ok: true, settings, previous_scans: 0, scans_today: 0 }

    try {
      const selectLimit = Math.max(settings.max_scans_per_member || settings.daily_scan_limit_per_member || 10, 10) + 50
      let q = supabase.from('loyalty_transactions')
        .select('id,created_at,qr_campaign_id,metadata')
        .eq('loyalty_customer_id', member.id)
        .eq('action', 'qr_scan')
        .order('created_at', { ascending: false })
        .limit(selectLimit)

      if (program?.qr_campaign_id) q = q.eq('qr_campaign_id', program.qr_campaign_id)
      else if (customerId) q = q.eq('customer_id', customerId)

      const existing = await q
      if (existing.error) return { ok: true, settings, previous_scans: 0, warning: existing.error.message }
      const rows = existing.data || []
      const filtered = program?.qr_campaign_id
        ? rows
        : rows.filter((x) => !slug || x?.metadata?.slug === slug)

      if (settings.max_scans_per_member > 0 && filtered.length >= settings.max_scans_per_member) {
        return {
          ok: false,
          code: 'QR_SCAN_LIMIT_REACHED',
          status: 429,
          error: `Dieser QR-Code kann pro Bonuskonto maximal ${settings.max_scans_per_member}x eingelöst werden.`,
          settings,
          previous_scans: filtered.length,
          scans_today: filtered.filter((x) => new Date(x.created_at).getTime() >= new Date().setHours(0,0,0,0)).length
        }
      }

      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const scansToday = filtered.filter((x) => new Date(x.created_at).getTime() >= todayStart.getTime()).length
      if (settings.daily_scan_limit_per_member > 0 && scansToday >= settings.daily_scan_limit_per_member) {
        return {
          ok: false,
          code: 'QR_DAILY_SCAN_LIMIT_REACHED',
          status: 429,
          error: `Tageslimit erreicht. Dieser QR-Code kann pro Bonuskonto maximal ${settings.daily_scan_limit_per_member}x pro Tag eingelöst werden.`,
          settings,
          previous_scans: filtered.length,
          scans_today: scansToday
        }
      }

      if (settings.scan_cooldown_minutes > 0 && filtered[0]?.created_at) {
        const lastAt = new Date(filtered[0].created_at).getTime()
        const nextAt = lastAt + settings.scan_cooldown_minutes * 60 * 1000
        const remainingMs = nextAt - Date.now()
        if (remainingMs > 0) {
          return {
            ok: false,
            code: 'QR_SCAN_COOLDOWN_ACTIVE',
            status: 429,
            error: `Dieser QR-Code kann erst in ${Math.ceil(remainingMs / 60000)} Minuten erneut eingelöst werden.`,
            retry_after_ms: remainingMs,
            next_available_at: new Date(nextAt).toISOString(),
            settings,
            previous_scans: filtered.length
          }
        }
      }
      return { ok: true, settings, previous_scans: filtered.length, scans_today: filtered.filter((x) => new Date(x.created_at).getTime() >= new Date().setHours(0,0,0,0)).length }
    } catch (e) {
      return { ok: true, settings, previous_scans: 0, warning: e.message }
    }
  }


  async function getLoyaltySecuritySettings(customerId) {
    const defaults = { daily_point_limit_per_member: 0, suspicion_score_threshold: 70, auto_block_threshold: 95 }
    try {
      const row = await supabase.from('loyalty_security_settings').select('*').eq('customer_id', customerId).maybeSingle()
      if (!row.error && row.data) return { ...defaults, ...row.data }
    } catch (_) {}
    return defaults
  }

  async function checkDailyPointLimit({ customerId, member, pointsToAdd, program, qrCampaign }) {
    const qrSettings = qrScanLimitSettings(qrCampaign, program)
    const security = await getLoyaltySecuritySettings(customerId)
    const finalDailyPointLimit = qrSettings.daily_point_limit_per_member_configured ? qrSettings.daily_point_limit_per_member : security.daily_point_limit_per_member
    const limit = Math.max(0, Math.floor(num(finalDailyPointLimit, 0)))
    if (!limit || !member?.id || !pointsToAdd) return { ok: true, limit, points_today: 0 }
    const today = new Date(); today.setHours(0,0,0,0)
    const q = await supabase.from('loyalty_transactions')
      .select('points')
      .eq('customer_id', customerId)
      .eq('loyalty_customer_id', member.id)
      .eq('action', 'qr_scan')
      .gte('created_at', today.toISOString())
      .limit(1000)
    if (q.error) return { ok: true, limit, points_today: 0, warning: q.error.message }
    const pointsToday = (q.data || []).reduce((s, t) => s + Math.max(0, num(t.points, 0)), 0)
    if (pointsToday + Math.max(0, num(pointsToAdd, 0)) > limit) {
      return { ok: false, code: 'DAILY_POINT_LIMIT_REACHED', status: 429, limit, points_today: pointsToday, error: `Punkte-Tageslimit erreicht. Heute sind maximal ${limit} Punkte pro Bonuskonto möglich.` }
    }
    return { ok: true, limit, points_today: pointsToday }
  }

  async function checkWeeklyPointLimit({ customerId, member, pointsToAdd, program, qrCampaign }) {
    const qrSettings = qrScanLimitSettings(qrCampaign, program)
    const limit = Math.max(0, Math.floor(num(qrSettings.weekly_point_limit_per_member, 0)))
    if (!limit || !member?.id || !pointsToAdd) return { ok: true, limit, points_week: 0 }
    const sinceWeek = new Date(Date.now() - 7*24*60*60*1000).toISOString()
    const q = await supabase.from('loyalty_transactions')
      .select('points')
      .eq('customer_id', customerId)
      .eq('loyalty_customer_id', member.id)
      .eq('action', 'qr_scan')
      .gte('created_at', sinceWeek)
      .limit(2000)
    if (q.error) return { ok: true, limit, points_week: 0, warning: q.error.message }
    const pointsWeek = (q.data || []).reduce((s, t) => s + Math.max(0, num(t.points, 0)), 0)
    if (pointsWeek + Math.max(0, num(pointsToAdd, 0)) > limit) {
      return { ok: false, code: 'WEEKLY_POINT_LIMIT_REACHED', status: 429, limit, points_week: pointsWeek, error: `Punkte-Wochenlimit erreicht. Diese Woche sind maximal ${limit} Punkte pro Bonuskonto möglich.` }
    }
    return { ok: true, limit, points_week: pointsWeek }
  }

  async function checkScanSessionReuse({ member, slug, scanSessionId }) {
    if (!member?.id || !scanSessionId) return { ok: true }
    try {
      const q = await supabase.from('loyalty_transactions')
        .select('id,created_at,metadata')
        .eq('loyalty_customer_id', member.id)
        .eq('action', 'qr_scan')
        .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString())
        .limit(300)
      if (q.error) return { ok: true, warning: q.error.message }
      const reused = (q.data || []).find((row) => String(row.metadata?.scan_session_id || '') === String(scanSessionId) && (!slug || row.metadata?.slug === slug))
      if (reused) return { ok: false, status: 409, code: 'QR_RESCAN_REQUIRED', error: 'Für neue Punkte muss der QR-Code erneut gescannt werden.', reused_transaction_id: reused.id }
      return { ok: true }
    } catch (e) {
      return { ok: true, warning: e.message }
    }
  }


  async function updateMemberSuspicionScore({ customerId, member, program, qrCampaign }) {
    if (!member?.id) return null
    try {
      const now = Date.now()
      const today = new Date(); today.setHours(0,0,0,0)
      const since15 = new Date(now - 15 * 60 * 1000).toISOString()
      const sinceDay = today.toISOString()
      const tx = await supabase.from('loyalty_transactions')
        .select('id,action,points,created_at,metadata')
        .eq('customer_id', customerId)
        .eq('loyalty_customer_id', member.id)
        .gte('created_at', sinceDay)
        .limit(500)
      const rows = tx.error ? [] : (tx.data || [])
      const scansToday = rows.filter(r => r.action === 'qr_scan').length
      const scans15 = rows.filter(r => r.action === 'qr_scan' && String(r.created_at) >= since15).length
      const pointsToday = rows.reduce((s, r) => s + Math.max(0, num(r.points, 0)), 0)
      const rewardRows = rows.filter(r => String(r.action || '').includes('reward')).length
      const deviceIds = new Set(rows.map(r => r.metadata?.device_id || r.metadata?.deviceId).filter(Boolean))
      const score = Math.min(100, Math.round(scans15 * 16 + scansToday * 5 + pointsToday / 3 + rewardRows * 18 + Math.max(0, deviceIds.size - 2) * 14))
      const settings = { ...qrScanLimitSettings(qrCampaign, program), ...(await getLoyaltySecuritySettings(customerId)) }
      const status = score >= num(settings.auto_block_threshold, 95) ? 'blocked_suggested' : score >= num(settings.suspicion_score_threshold, 70) ? 'suspicious' : score >= 45 ? 'watch' : 'ok'
      const payload = {
        customer_id: customerId,
        loyalty_customer_id: member.id,
        email: member.email || null,
        score,
        status,
        scans_today: scansToday,
        scans_last_15m: scans15,
        points_today: pointsToday,
        reward_redemptions_today: rewardRows,
        device_count_today: deviceIds.size,
        reasons: [scans15 >= 3 ? 'viele Scans in 15 Minuten' : null, pointsToday >= num(settings.daily_point_limit_per_member, 0) && num(settings.daily_point_limit_per_member,0)>0 ? 'Punkte-Tageslimit erreicht/nahe erreicht' : null, deviceIds.size > 2 ? 'mehrere Geräte' : null].filter(Boolean),
        last_checked_at: new Date().toISOString(),
        metadata: { qr_campaign_id: program?.qr_campaign_id || qrCampaign?.id || null }
      }
      try {
        const existing = await supabase.from('loyalty_member_security_scores').select('id').eq('loyalty_customer_id', member.id).maybeSingle()
        if (!existing.error && existing.data?.id) await supabase.from('loyalty_member_security_scores').update(payload).eq('id', existing.data.id)
        else await supabase.from('loyalty_member_security_scores').insert(payload)
      } catch (_) {}
      if (status === 'suspicious' || status === 'blocked_suggested') {
        try { await supabase.from('security_events').insert({ customer_id: customerId, actor_type: 'end_customer', actor_id: member.id, event_type: 'loyalty_suspicion_score', severity: status === 'blocked_suggested' ? 'critical' : 'warning', title: 'Auffälliger Loyalty-Endkunde', description: `${member.email || member.display_name || member.id} erreicht Score ${score}/100.`, metadata: payload }) } catch (_) {}
      }
      return payload
    } catch (_) { return null }
  }

  async function v39CheckRewardLimits(customerId, rewardId, memberName = null) {
    const warnings = []
    const rewardQuery = await supabase.from('v33_functional_records')
      .select('*')
      .eq('customer_id', customerId)
      .eq('resource', 'loyalty_rewards')
      .or(`local_id.eq.${rewardId},payload->>id.eq.${rewardId}`)
      .limit(1)
      .maybeSingle()

    if (rewardQuery.error || !rewardQuery.data) return { ok: true, warnings, reward: null }

    const reward = rewardQuery.data
    const p = reward.payload || {}
    const now = new Date()

    if (p.expires_at && new Date(p.expires_at) < now) {
      return { ok: false, code: 'REWARD_EXPIRED', error: 'Dieser Reward ist abgelaufen.', reward }
    }

    const redemptions = await supabase.from('v33_functional_records')
      .select('*')
      .eq('customer_id', customerId)
      .eq('resource', 'redemptions')
      .limit(1000)

    if (redemptions.error) {
      warnings.push({ label: 'reward_redemptions', error: redemptions.error.message })
      return { ok: true, warnings, reward }
    }

    const all = (redemptions.data || []).filter(r => String(r.payload?.reward_id || '') === String(rewardId))
    const sinceDay = Date.now() - 24*60*60*1000
    const sinceWeek = Date.now() - 7*24*60*60*1000
    const today = all.filter(r => new Date(r.created_at).getTime() >= sinceDay)
    const week = all.filter(r => new Date(r.created_at).getTime() >= sinceWeek)
    const perCustomer = memberName ? all.filter(r => String(r.payload?.member_name || '') === String(memberName)) : []

    if (Number(p.max_redemptions || 0) > 0 && all.length >= Number(p.max_redemptions)) {
      return { ok: false, code: 'REWARD_MAX_REDEMPTIONS_REACHED', error: 'Maximale Einlösungen für diesen Reward erreicht.', reward }
    }
    if (Number(p.daily_limit || 0) > 0 && today.length >= Number(p.daily_limit)) {
      return { ok: false, code: 'REWARD_DAILY_LIMIT_REACHED', error: 'Tageslimit für diesen Reward erreicht.', reward }
    }
    const weeklyLimitEnabled = p.weekly_limit_enabled === true || p.limit_weekly_enabled === true || p.metadata?.weekly_limit_enabled === true
    if (weeklyLimitEnabled && Number(p.weekly_limit || 0) > 0 && week.length >= Number(p.weekly_limit)) {
      return { ok: false, code: 'REWARD_WEEKLY_LIMIT_REACHED', error: 'Wochenlimit für diesen Reward erreicht.', reward }
    }
    if (memberName && Number(p.max_per_customer || 0) > 0 && perCustomer.length >= Number(p.max_per_customer)) {
      return { ok: false, code: 'REWARD_MEMBER_LIMIT_REACHED', error: 'Dieser Kunde hat den Reward bereits maximal eingelöst.', reward }
    }

    return { ok: true, warnings, reward }
  }



  function rewardRequiredPoints(reward) {
    const r = reward || {}
    return num(r.points_required ?? r.required_points ?? r.requiredPoints ?? r.points ?? r.required_points_value ?? 0, 0)
  }

  function rewardAllowsMultiple(reward) {
    const r = reward || {}
    if (r.allow_multiple_redemptions === true || r.allow_multiple === true || r.repeatable === true || r.multiple_redemptions === true) return true
    if (String(r.redemption_frequency || '').toLowerCase() === 'multiple') return true
    if (String(r.redemption_limit_mode || '').toLowerCase() === 'multiple') return true
    return false
  }

  function rewardMaxPerMember(reward) {
    const r = reward || {}
    const configured = r.max_redemptions_per_member ?? r.max_per_member ?? r.max_per_customer ?? r.member_limit
    if (configured === '' || configured === null || configured === undefined) return rewardAllowsMultiple(r) ? 0 : 1
    return num(configured, rewardAllowsMultiple(r) ? 0 : 1)
  }

  function rewardNeedsStaffCode(reward) {
    const r = reward || {}
    // Public redemption is staff-protected by default. It may be disabled explicitly per reward.
    if (r.staff_code_required === false || r.require_staff_code === false) return false
    if (r.staff_confirmation_required === false && r.redemption_mode === 'manual') return false
    return true
  }

  function isPublicActiveEntity(row) {
    if (!row) return false
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}
    const merged = { ...row, ...payload }
    const status = String(merged.status || '').trim().toLowerCase()
    const lifecycle = String(merged.lifecycle_status || merged.lifecycle || '').trim().toLowerCase()
    const deletedAt = merged.deleted_at || merged.archived_at || merged.removed_at
    const deletedFlag = merged.is_deleted === true || merged.deleted === true || merged.archived === true || merged.removed === true
    const inactiveStatus = ['deleted', 'gelöscht', 'geloescht', 'archiviert', 'archived', 'removed', 'inactive', 'inaktiv', 'disabled', 'deaktiviert', 'blocked', 'gesperrt'].includes(status)
    const inactiveLifecycle = ['deleted', 'archived', 'removed', 'inactive', 'disabled'].includes(lifecycle)
    return merged.active !== false && !deletedFlag && !deletedAt && !inactiveStatus && !inactiveLifecycle
  }

  function isPublicActiveReward(row) {
    return isPublicActiveEntity(row)
  }

  function isPublicActiveCampaign(row) {
    return isPublicActiveEntity(row)
  }

  function normalizeReward(raw, source = 'unknown') {
    if (!raw) return null
    const payload = raw.payload && typeof raw.payload === 'object' ? raw.payload : {}
    const reward = { ...raw, ...payload }
    const id = reward.local_id || reward.reward_id || reward.id
    return {
      ...reward,
      id,
      source,
      title: rewardDisplayTitle(reward),
      points_required: rewardRequiredPoints(reward),
      required_points: rewardRequiredPoints(reward),
      allow_multiple_redemptions: rewardAllowsMultiple(reward),
      max_redemptions_per_member: rewardMaxPerMember(reward),
      staff_code_required: rewardNeedsStaffCode(reward)
    }
  }

  async function findPublicReward(customerId, rewardId, campaignId = null) {
    const matches = []
    const keyMatches = (row = {}) => {
      const p = row.payload && typeof row.payload === 'object' ? row.payload : {}
      return [row.id, row.local_id, row.reward_id, p.id, p.local_id, p.reward_id]
        .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
        .some(v => String(v) === String(rewardId))
    }

    try {
      const recordsForFilter = await supabase.from('v33_functional_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('resource', 'loyalty_rewards')
        .limit(300)
      if (!recordsForFilter.error) {
        for (const rec of activeFunctionalRecords(recordsForFilter.data || [])) {
          if (!keyMatches(rec)) continue
          const nr = normalizeReward(rec, 'v33_functional_records_legacy')
          if (nr && isPublicActiveReward(nr)) matches.push(nr)
        }
      }
    } catch (_) {}

    try {
      const byId = await supabase.from('loyalty_rewards').select('*').eq('customer_id', customerId).eq('id', rewardId).maybeSingle()
      if (!byId.error && byId.data && isPublicActiveReward(byId.data)) matches.push(normalizeReward(byId.data, 'loyalty_rewards'))
    } catch (_) {}

    const activeCampaignIds = new Set()
    try {
      const campaignRows = await supabase.from('qr_campaigns').select('id,active,status,deleted_at,archived_at,is_deleted,metadata').eq('customer_id', customerId).limit(500)
      if (!campaignRows.error) {
        for (const c of (campaignRows.data || [])) if (isPublicActiveCampaign(c)) activeCampaignIds.add(String(c.id))
      }
    } catch (_) {}
    if (campaignId) activeCampaignIds.add(String(campaignId))

    const reward = matches.find(r => r && (!r.qr_campaign_id || activeCampaignIds.has(String(r.qr_campaign_id))))
    return reward || null
  }

  async function getPublicRewardRedemptions(customerId, loyaltyCustomerId, rewardId = null) {
    const all = []
    try {
      let q = supabase.from('loyalty_reward_redemptions').select('*').eq('customer_id', customerId).eq('loyalty_customer_id', loyaltyCustomerId).order('created_at', { ascending: false }).limit(250)
      if (rewardId) q = q.eq('reward_id', rewardId)
      const table = await q
      if (!table.error && Array.isArray(table.data)) all.push(...table.data.map(x => ({ ...x, source: 'loyalty_reward_redemptions' })))
    } catch (_) {}
    try {
      let q = supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource', 'reward_redemptions').limit(500)
      const recs = await q
      if (!recs.error) {
        all.push(...(recs.data || [])
          .filter(r => String(r.payload?.loyalty_customer_id || r.payload?.member_id || '') === String(loyaltyCustomerId))
          .filter(r => !rewardId || String(r.payload?.reward_id || '') === String(rewardId))
          .map(r => ({ id: r.id, ...(r.payload || {}), source: 'v33_functional_records', created_at: r.created_at })))
      }
    } catch (_) {}
    return all
  }

  async function validatePublicStaffCode(customerId, code, campaignId = null) {
    const wanted = clean(code)
    if (!wanted) return { ok: false, error: 'Mitarbeitercode fehlt.' }
    const candidates = []
    try {
      const table = await supabase.from('staff_codes').select('*').eq('customer_id', customerId).limit(250)
      if (!table.error) candidates.push(...(table.data || []).map(x => ({ ...x, payload: x, source: 'staff_codes' })))
    } catch (_) {}
    try {
      const records = await supabase.from('v33_functional_records').select('*').eq('resource', 'staff_codes').eq('customer_id', customerId).limit(250)
      if (!records.error) candidates.push(...(records.data || []))
    } catch (_) {}
    const match = candidates.find(row => {
      const p = row.payload || row
      const values = [p.code, p.pin, p.staff_pin, p.staff_code, p.confirmation_code].filter(v => v !== undefined && v !== null).map(String)
      const scoped = !p.qr_campaign_id || !campaignId || String(p.qr_campaign_id) === String(campaignId)
      return p.active !== false && scoped && values.includes(String(wanted))
    })
    if (!match) return { ok: false, error: 'Mitarbeitercode ungültig.' }
    const p = match.payload || match
    try {
      if (match.source === 'staff_codes') await supabase.from('staff_codes').update({ uses: num(p.uses, 0) + 1, last_used_at: new Date().toISOString() }).eq('id', match.id)
      else await supabase.from('v33_functional_records').update({ payload: { ...p, uses: num(p.uses, 0) + 1, last_used_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', match.id)
    } catch (_) {}
    return { ok: true, staff_code: { id: match.id, label: p.label || p.name || 'Mitarbeitercode' } }
  }

  async function savePublicRewardRedemption(payload) {
    try {
      const { data, error } = await supabase.from('loyalty_reward_redemptions').insert(payload).select('*').single()
      if (!error && data) return { data, source: 'loyalty_reward_redemptions' }
    } catch (_) {}
    const rec = await createRecord('reward_redemptions', payload)
    return { data: { id: rec.id, ...(rec.payload || {}) }, source: 'v33_functional_records' }
  }

  async function audit(action, metadata = {}) {
    try {
      await supabase.from('security_audit_logs').insert({
        actor_name: 'System',
        action,
        entity_type: 'v34_customer_provisioning',
        metadata
      })
    } catch (_) {}
  }

  async function getCustomer(customerId) {
    const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle()
    if (error) throw error
    return data
  }

  async function uniqueSlug(baseSlug, excludeQrId = null) {
    let slug = slugify(baseSlug)
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? slug : `${slug}-${i + 1}`
      let qrQuery = supabase.from('qr_campaigns').select('id').eq('slug', candidate).limit(1)
      if (excludeQrId) qrQuery = qrQuery.neq('id', excludeQrId)
      const qr = await qrQuery
      if (qr.error) throw qr.error
      const lp = await supabase.from('loyalty_programs').select('id').eq('slug', candidate).limit(1)
      if (lp.error && !isPostgrestSchemaCacheError(lp.error)) throw lp.error
      const landing = await supabase.from('public_landing_pages').select('id').eq('slug', candidate).limit(1)
      if (landing.error && !isPostgrestSchemaCacheError(landing.error)) throw landing.error
      const qrTaken = (qr.data || []).length > 0
      const lpTaken = (lp.data || []).length > 0
      const landingTaken = (landing.data || []).length > 0
      if (!qrTaken && !lpTaken && !landingTaken) return candidate
    }
    return `${slug}-${crypto.randomBytes(4).toString('hex')}`
  }

  async function createRecord(resource, payload = {}) {
    const body = payload && typeof payload === 'object' ? payload : {}
    const { data, error } = await supabase.from('v33_functional_records').insert({
      customer_id: body.customer_id || null,
      resource,
      local_id: body.id || body.local_id || null,
      title: body.title || body.name || body.label || resource,
      status: body.status || 'active',
      payload: body,
      updated_at: new Date().toISOString()
    }).select('*').single()
    if (error) throw error
    return data
  }

  async function upsertRecord(resource, payload = {}) {
    const body = payload && typeof payload === 'object' ? payload : {}
    const localId = body.id || body.local_id || null
    const customerId = body.customer_id || null

    if (!localId || !customerId) return createRecord(resource, body)

    const { data: existing, error: lookupError } = await supabase
      .from('v33_functional_records')
      .select('*')
      .eq('resource', resource)
      .eq('customer_id', customerId)
      .eq('local_id', localId)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (!existing) return createRecord(resource, body)

    const nextPayload = { ...(existing.payload || {}), ...body, id: localId }
    const { data, error } = await supabase.from('v33_functional_records').update({
      title: nextPayload.title || nextPayload.name || nextPayload.label || existing.title,
      status: nextPayload.status || existing.status || 'active',
      payload: nextPayload,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id).select('*').single()

    if (error) throw error
    return data
  }

  function isDeletedOrArchivedPayload(row) {
    const p = row?.payload || {}
    const merged = { ...(row || {}), ...p }
    const status = String(merged.status || '').toLowerCase()
    return merged.active === false || merged.is_deleted === true || merged.deleted === true || merged.archived === true || Boolean(merged.deleted_at || merged.archived_at || merged.removed_at) || ['deleted','gelöscht','geloescht','archived','archiviert','removed','inactive','inaktiv','disabled','deaktiviert'].includes(status)
  }

  function isActiveFunctionalRecord(row) {
    return !isDeletedOrArchivedPayload(row)
  }

  function activeFunctionalRecords(rows = []) {
    return (rows || []).filter(isActiveFunctionalRecord)
  }

  function qrScanTokenTtlMs() {
    return Math.max(5 * 60 * 1000, Number(process.env.QR_SCAN_TOKEN_TTL_MS || 20 * 60 * 1000))
  }

  async function createQrScanToken({ customerId, slug, program, qrCampaign, req }) {
    const token = safeToken('scan')
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + qrScanTokenTtlMs()).toISOString()
    const payload = {
      token,
      slug,
      customer_id: customerId,
      loyalty_program_id: program?.id || null,
      qr_campaign_id: qrCampaign?.id || program?.qr_campaign_id || null,
      used: false,
      used_at: null,
      active: true,
      expires_at: expiresAt,
      ip_hint: String(req?.headers?.['x-forwarded-for'] || req?.ip || '').split(',')[0].trim() || null,
      user_agent: req?.headers?.['user-agent'] || null,
      created_at: now
    }
    const record = await upsertRecord('qr_scan_tokens', { id: token, customer_id: customerId, title: `Scan Token ${slug}`, status: 'active', ...payload })
    return { token, expires_at: expiresAt, record }
  }

  async function findQrScanToken({ customerId, slug, token }) {
    if (!token) return { ok: false, status: 428, code: 'QR_SCAN_TOKEN_REQUIRED', error: 'Für neue Punkte muss der QR-Code erneut gescannt werden.' }
    const found = await supabase.from('v33_functional_records')
      .select('*')
      .eq('resource', 'qr_scan_tokens')
      .eq('local_id', token)
      .eq('customer_id', customerId)
      .limit(1)
      .maybeSingle()
    if (found.error || !found.data) return { ok: false, status: 428, code: 'QR_SCAN_TOKEN_INVALID', error: 'Scan-Token ist ungültig. Bitte QR-Code erneut scannen.' }
    const p = found.data.payload || {}
    if (p.slug && String(p.slug) !== String(slug)) return { ok: false, status: 428, code: 'QR_SCAN_TOKEN_WRONG_SLUG', error: 'Scan-Token passt nicht zu dieser Kampagne. Bitte QR-Code erneut scannen.' }
    if (p.used === true || found.data.status === 'used') return { ok: false, status: 409, code: 'QR_SCAN_TOKEN_USED', error: 'Dieser QR-Scan wurde bereits verwendet. Bitte QR-Code erneut scannen.' }
    if (p.active === false || found.data.status === 'deleted') return { ok: false, status: 428, code: 'QR_SCAN_TOKEN_INACTIVE', error: 'Scan-Token ist nicht mehr aktiv. Bitte QR-Code erneut scannen.' }
    if (p.expires_at && new Date(p.expires_at).getTime() < Date.now()) return { ok: false, status: 410, code: 'QR_SCAN_TOKEN_EXPIRED', error: 'Scan-Token ist abgelaufen. Bitte QR-Code erneut scannen.' }
    return { ok: true, record: found.data, payload: p }
  }

  async function consumeQrScanToken({ customerId, slug, token, memberId }) {
    const check = await findQrScanToken({ customerId, slug, token })
    if (!check.ok) return check
    const now = new Date().toISOString()
    const payload = { ...(check.payload || {}), used: true, used_at: now, used_by_member_id: memberId || null }
    const saved = await supabase.from('v33_functional_records')
      .update({ status: 'used', payload, updated_at: now })
      .eq('id', check.record.id)
      .eq('status', 'active')
      .select('*')
      .maybeSingle()
    if (saved.error || !saved.data) return { ok: false, status: 409, code: 'QR_SCAN_TOKEN_USED', error: 'Dieser QR-Scan wurde bereits verwendet. Bitte QR-Code erneut scannen.' }
    return { ok: true, record: saved.data, payload }
  }

  function qrRotationEnabled(qrCampaign, program) {
    const sources = [qrCampaign, qrCampaign?.metadata, program, program?.metadata]
    return sources.some((s) => s && (s.rotate_qr_after_scan === true || s.metadata?.rotate_qr_after_scan === true))
  }

  async function rotateQrCampaignAfterSuccessfulScan({ customerId, slug, program, qrCampaign }) {
    if (!customerId || !slug || !program || !qrRotationEnabled(qrCampaign, program)) return null
    const oldMeta = { ...(qrCampaign?.metadata || {}) }
    if (oldMeta.next_qr_slug) {
      return { rotated: true, already_rotated: true, previous_slug: slug, next_slug: oldMeta.next_qr_slug, next_qr_scan_url: `/q/${oldMeta.next_qr_slug}`, next_landing_url: `/l/${oldMeta.next_qr_slug}` }
    }
    const now = new Date().toISOString()
    const nextSlug = await uniqueSlug(`${slug}-next-${Date.now().toString(36).slice(-5)}`)
    const purpose = clean(qrCampaign?.purpose || qrCampaign?.mode || oldMeta.purpose || program?.metadata?.purpose || 'loyalty')
    const pointsPerScan = num(qrCampaign?.points_per_scan ?? oldMeta.points_per_scan ?? program?.points_per_scan ?? program?.metadata?.points_per_scan, 10)
    const clonePayload = {
      customer_id: customerId,
      title: qrCampaign?.title || qrCampaign?.name || program?.title || program?.name || 'QR Kampagne',
      name: qrCampaign?.name || qrCampaign?.title || program?.name || program?.title || 'QR Kampagne',
      slug: nextSlug,
      target_url: `/q/${nextSlug}`,
      scans: 0,
      conversions: 0,
      active: true,
      status: 'Aktiv',
      max_scans_per_member: Math.max(0, Math.floor(num(qrCampaign?.max_scans_per_member ?? oldMeta.max_scans_per_member, 0))),
      scan_cooldown_minutes: Math.max(0, Math.floor(num(qrCampaign?.scan_cooldown_minutes ?? oldMeta.scan_cooldown_minutes, 0))),
      daily_point_limit_per_member: Math.max(0, Math.floor(num(qrCampaign?.daily_point_limit_per_member ?? oldMeta.daily_point_limit_per_member, 0))),
      suspicion_score_threshold: Math.max(0, Math.min(100, Math.floor(num(qrCampaign?.suspicion_score_threshold ?? oldMeta.suspicion_score_threshold, 70)))),
      metadata: {
        ...oldMeta,
        purpose,
        points_per_scan: pointsPerScan,
        require_rescan_for_points: true,
        rotate_qr_after_scan: true,
        previous_qr_campaign_id: qrCampaign?.id || null,
        previous_slug: slug,
        qr_rotation_generation: Number(oldMeta.qr_rotation_generation || 0) + 1,
        qr_rotation_created_at: now,
        qr_scan_url: `/q/${nextSlug}`,
        landing_url: `/l/${nextSlug}`
      }
    }
    const created = await supabase.from('qr_campaigns').insert(clonePayload).select('*').single()
    if (created.error) throw created.error
    const nextQr = created.data

    const nextProgramMeta = { ...(program.metadata || {}), purpose, points_per_scan: pointsPerScan, require_rescan_for_points: true, rotate_qr_after_scan: true, previous_slug: slug, qr_rotation_updated_at: now, qr_campaign_id: nextQr.id }
    await supabase.from('loyalty_programs').update({ slug: nextSlug, qr_campaign_id: nextQr.id, metadata: nextProgramMeta, updated_at: now }).eq('id', program.id)

    if (qrCampaign?.id) {
      await supabase.from('qr_campaigns').update({
        active: false,
        status: 'Rotiert',
        metadata: { ...oldMeta, rotate_qr_after_scan: true, next_qr_campaign_id: nextQr.id, next_qr_slug: nextSlug, next_qr_scan_url: `/q/${nextSlug}`, rotated_at: now },
        updated_at: now
      }).eq('id', qrCampaign.id)
    }

    try {
      await upsertRecord('qr_rotations', {
        id: `qrrot_${slug}_${nextSlug}`,
        customer_id: customerId,
        title: 'QR-Code automatisch erneuert',
        status: 'created',
        previous_slug: slug,
        next_slug: nextSlug,
        previous_qr_campaign_id: qrCampaign?.id || null,
        next_qr_campaign_id: nextQr.id,
        metadata: { previous_slug: slug, next_slug: nextSlug, reason: 'rotate_qr_after_scan' }
      })
    } catch (_) {}

    return { rotated: true, previous_slug: slug, next_slug: nextSlug, next_qr_campaign_id: nextQr.id, next_qr_scan_url: `/q/${nextSlug}`, next_landing_url: `/l/${nextSlug}` }
  }

  async function provisionCustomer(customerId, options = {}) {
    const customer = await getCustomer(customerId)
    if (!customer) throw new Error('Kunde nicht gefunden')

    const customerName = customer.name || customer.title || customer.company || 'Kunde'
    const base = slugify(options.base_slug || customerName)
    const defaultSlug = await uniqueSlug(`l-${base}`)
    const now = new Date().toISOString()
      const warnings = []
      // v39_duplicate_lead_protection

    const { data: existingPrograms, error: programLookupError } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('customer_id', customerId)
      .limit(1)

    if (programLookupError) throw programLookupError

    let loyaltyProgram = existingPrograms && existingPrograms[0] ? existingPrograms[0] : null
    let qrCampaign = null

    const campaignTitle = options.title || `${customerName} Loyalty QR`

    if (!loyaltyProgram) {
      const { data: qrData, error: qrError } = await supabase.from('qr_campaigns').insert({
        customer_id: customerId,
        title: campaignTitle,
        name: campaignTitle,
        slug: defaultSlug,
        target_url: `/q/${defaultSlug}`,
        scans: 0,
        conversions: 0,
        active: true,
        status: 'Aktiv',
        metadata: { v34_auto_provisioned: true, customer_name: customerName }
      }).select('*').single()

      if (qrError) throw qrError
      qrCampaign = qrData

      const { data: programData, error: programError } = await supabase.from('loyalty_programs').insert({
        customer_id: customerId,
        qr_campaign_id: qrCampaign.id,
        title: `${customerName} Bonusclub`,
        name: `${customerName} Bonusclub`,
        slug: defaultSlug,
        points_per_scan: num(options.points_per_scan, 10),
        active: true,
        status: 'active',
        require_staff_code: true,
        metadata: { v34_auto_provisioned: true, qr_campaign_id: qrCampaign.id }
      }).select('*').single()

      if (programError) throw programError
      loyaltyProgram = programData
    } else {
      if (loyaltyProgram.qr_campaign_id) {
        const foundQr = await supabase.from('qr_campaigns').select('*').eq('id', loyaltyProgram.qr_campaign_id).maybeSingle()
        if (!foundQr.error) qrCampaign = foundQr.data || null
      }

      if (!qrCampaign) {
        const slug = loyaltyProgram.slug || defaultSlug
        const { data: qrData, error: qrError } = await supabase.from('qr_campaigns').insert({
          customer_id: customerId,
          title: campaignTitle,
          name: campaignTitle,
          slug,
          target_url: `/q/${slug}`,
          scans: 0,
          conversions: 0,
          active: true,
          status: 'Aktiv',
          metadata: { v34_auto_provisioned: true, customer_name: customerName }
        }).select('*').single()

        if (qrError) throw qrError
        qrCampaign = qrData

        await supabase.from('loyalty_programs').update({
          qr_campaign_id: qrCampaign.id,
          slug,
          updated_at: now
        }).eq('id', loyaltyProgram.id)

        loyaltyProgram = { ...loyaltyProgram, qr_campaign_id: qrCampaign.id, slug }
      }
    }

    await upsertRecord('public_landing_pages', {
      id: `landing_${qrCampaign.slug}`,
      customer_id: customerId,
      title: `${customerName} Landingpage`,
      slug: qrCampaign.slug,
      headline: `Willkommen bei ${customerName}`,
      mode: 'loyalty',
      active: true,
      qr_campaign_id: qrCampaign.id,
      loyalty_program_id: loyaltyProgram.id
    })

    await upsertRecord('staff_codes', {
      id: `staff_${customerId}`,
      customer_id: customerId,
      label: 'Standard Thekencode',
      code: options.staff_code || '2468',
      uses: 0,
      active: true
    })

    await audit('v34_customer_provisioned', {
      customer_id: customerId,
      qr_campaign_id: qrCampaign.id,
      loyalty_program_id: loyaltyProgram.id,
      slug: qrCampaign.slug
    })

    return { customer, qr_campaign: qrCampaign, loyalty_program: loyaltyProgram, public_url_path: `/q/${qrCampaign.slug}`, landing_url_path: `/l/${qrCampaign.slug}` }
  }

  async function createQrCampaignForCustomer(customerId, payload = {}) {
    const customer = await getCustomer(customerId)
    if (!customer) throw new Error('Kunde nicht gefunden')

    const customerName = customer.name || customer.title || customer.company || 'Kunde'
    const title = payload.title || payload.name || `${customerName} QR Kampagne`
    const purpose = payload.purpose || payload.mode || 'loyalty'
    const slugBase = payload.slug || `${slugify(customerName)}-${slugify(title)}`
    const slug = await uniqueSlug(slugBase)
    const targetUrl = `/q/${slug}`
    const pointsPerScan = num(payload.points_per_scan, 10)
    const maxScansPerMember = Math.max(0, Math.floor(num(payload.max_scans_per_member ?? payload.maxScansPerMember ?? payload.scan_limit_per_member, 0)))
    const scanCooldownMinutes = Math.max(0, Math.floor(num(payload.scan_cooldown_minutes ?? payload.scanCooldownMinutes ?? payload.cooldown_minutes, 0)))
    const dailyScanLimitPerMember = Math.max(0, Math.floor(num(payload.daily_scan_limit_per_member ?? payload.dailyScanLimitPerMember ?? payload.daily_scan_limit ?? payload.max_daily_redemptions_per_member, 0)))
    const dailyPointLimitPerMember = Math.max(0, Math.floor(num(payload.daily_point_limit_per_member ?? payload.dailyPointLimitPerMember ?? payload.points_daily_limit, 0)))
    const suspicionScoreThreshold = Math.max(0, Math.min(100, Math.floor(num(payload.suspicion_score_threshold ?? payload.suspicionScoreThreshold ?? payload.abuse_score_threshold, 70))))
    const requireRescanForPoints = payload.require_rescan_for_points === false ? false : (pointsPerScan > 0 && (purpose === 'loyalty' || purpose === 'both'))
    const rotateQrAfterScan = payload.rotate_qr_after_scan === true

    const { data: qrCampaign, error: qrError } = await supabase.from('qr_campaigns').insert({
      customer_id: customerId,
      title,
      name: title,
      slug,
      target_url: targetUrl,
      scans: 0,
      conversions: 0,
      active: true,
      status: 'Aktiv',
      max_scans_per_member: maxScansPerMember,
      scan_cooldown_minutes: scanCooldownMinutes,
      daily_point_limit_per_member: dailyPointLimitPerMember,
      suspicion_score_threshold: suspicionScoreThreshold,
      metadata: { v34_auto_created: true, purpose, customer_name: customerName, google_review_url: payload.google_review_url || null, points_per_scan: pointsPerScan, max_scans_per_member: maxScansPerMember, scan_cooldown_minutes: scanCooldownMinutes, daily_scan_limit_per_member: dailyScanLimitPerMember, daily_point_limit_per_member: dailyPointLimitPerMember, suspicion_score_threshold: suspicionScoreThreshold, require_rescan_for_points: requireRescanForPoints, rotate_qr_after_scan: rotateQrAfterScan, qr_scan_url: targetUrl, landing_url: `/l/${slug}` }
    }).select('*').single()

    if (qrError) throw qrError

    let loyaltyProgram = null

    if (purpose === 'loyalty' || payload.create_loyalty !== false) {
      const { data: program, error: programError } = await supabase.from('loyalty_programs').insert({
        customer_id: customerId,
        qr_campaign_id: qrCampaign.id,
        title: payload.loyalty_name || `${customerName} Bonusclub`,
        name: payload.loyalty_name || `${customerName} Bonusclub`,
        slug,
        points_per_scan: pointsPerScan,
        active: true,
        status: 'active',
        require_staff_code: true,
        metadata: { v34_auto_created: true, qr_campaign_id: qrCampaign.id, purpose, points_per_scan: pointsPerScan, max_scans_per_member: maxScansPerMember, scan_cooldown_minutes: scanCooldownMinutes, daily_scan_limit_per_member: dailyScanLimitPerMember, daily_point_limit_per_member: dailyPointLimitPerMember, suspicion_score_threshold: suspicionScoreThreshold, require_rescan_for_points: requireRescanForPoints, rotate_qr_after_scan: rotateQrAfterScan, qr_scan_url: targetUrl, landing_url: `/l/${slug}` }
      }).select('*').single()

      if (programError) throw programError
      loyaltyProgram = program
    }

    await upsertRecord('public_landing_pages', {
      id: `landing_${slug}`,
      customer_id: customerId,
      title: `${title} Landingpage`,
      slug,
      headline: payload.headline || `Willkommen bei ${customerName}`,
      mode: purpose,
      active: true,
      qr_campaign_id: qrCampaign.id,
      loyalty_program_id: loyaltyProgram?.id || null
    })

    await upsertRecord('loyalty_programs', {
      id: loyaltyProgram?.id || `loy_${slug}`,
      customer_id: customerId,
      name: loyaltyProgram?.name || `${customerName} Bonusclub`,
      qr_campaign_id: qrCampaign.id,
      slug,
      points_per_scan: pointsPerScan,
      active: true
    })

    try {
      await supabase.from('customer_timeline_events').insert({
        customer_id: customerId,
        event_type: 'qr_campaign_provisioned',
        title: 'QR/Loyalty Kampagne erstellt',
        description: `${title} wurde mit /q/${slug} erstellt.`,
        source_module: 'qr_loyalty',
        severity: 'success',
        metadata: { qr_campaign_id: qrCampaign.id, loyalty_program_id: loyaltyProgram?.id || null, slug }
      })
    } catch (_) {}

    await audit('v34_qr_campaign_created', {
      customer_id: customerId,
      qr_campaign_id: qrCampaign.id,
      loyalty_program_id: loyaltyProgram?.id || null,
      slug
    })

    return { customer, qr_campaign: qrCampaign, loyalty_program: loyaltyProgram, public_url_path: targetUrl }
  }

  router.post('/customers/:customer_id/provision', async (req, res, next) => {
    try {
      const provisioned = await provisionCustomer(req.params.customer_id, req.body || {})
      res.json({ ok: true, ...provisioned })
    } catch (e) { next(e) }
  })

  router.post('/customers/:customer_id/qr-campaigns', async (req, res, next) => {
    try {
      const created = await createQrCampaignForCustomer(req.params.customer_id, req.body || {})
      res.json({ ok: true, ...created })
    } catch (e) { next(e) }
  })

  router.get('/customers/:customer_id/qr-campaigns', async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('qr_campaigns')
        .select('*')
        .eq('customer_id', req.params.customer_id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      res.json({ ok: true, campaigns: data || [] })
    } catch (e) { next(e) }
  })

  router.get('/customers/:customer_id/bootstrap', async (req, res, next) => {
    try {
      const provisioned = await provisionCustomer(req.params.customer_id, { title: req.query.title || undefined })
      const [records, qrCampaigns, leads] = await Promise.all([
        supabase.from('v33_functional_records').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(500),
        supabase.from('qr_campaigns').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(200),
        supabase.from('v33_public_leads').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(200)
      ])

      if (records.error) throw records.error
      if (qrCampaigns.error) throw qrCampaigns.error
      if (leads.error) throw leads.error

      res.json({
        ok: true,
        ...provisioned,
        records: records.data || [],
        qr_campaigns: qrCampaigns.data || [],
        leads: leads.data || []
      })
    } catch (e) { next(e) }
  })

  router.get('/records/:resource', async (req, res, next) => {
    try {
      let q = supabase.from('v33_functional_records')
        .select('*')
        .eq('resource', req.params.resource)
        .order('created_at', { ascending: false })
        .limit(500)

      if (req.query.customer_id) q = q.eq('customer_id', req.query.customer_id)

      const { data, error } = await q
      if (error) throw error
      const records = req.query.include_deleted === 'true' ? (data || []) : activeFunctionalRecords(data || [])
      res.json({ ok: true, records })
    } catch (e) { next(e) }
  })

  router.post('/records/:resource', async (req, res, next) => {
    try {
      const record = await upsertRecord(req.params.resource, req.body || {})
      await audit('v34_record_saved', { resource: req.params.resource, customer_id: req.body?.customer_id || null })
      res.json({ ok: true, record })
    } catch (e) { next(e) }
  })

  router.patch('/records/:resource/local/:local_id', async (req, res, next) => {
    try {
      const record = await upsertRecord(req.params.resource, { ...(req.body || {}), id: req.params.local_id })
      await audit('v34_record_updated', { resource: req.params.resource, local_id: req.params.local_id })
      res.json({ ok: true, record })
    } catch (e) { next(e) }
  })

  router.delete('/records/:resource/local/:local_id', async (req, res, next) => {
    try {
      let lookup = supabase.from('v33_functional_records')
        .select('*')
        .eq('resource', req.params.resource)
        .eq('local_id', req.params.local_id)

      if (req.query.customer_id) lookup = lookup.eq('customer_id', req.query.customer_id)

      const found = await lookup.limit(20)
      if (found.error) throw found.error
      const now = new Date().toISOString()
      for (const row of (found.data || [])) {
        const payload = { ...(row.payload || {}), active: false, deleted: true, deleted_at: now }
        await supabase.from('v33_functional_records').update({ status: 'deleted', payload, updated_at: now }).eq('id', row.id)
      }
      await audit('v34_record_deleted', { resource: req.params.resource, local_id: req.params.local_id, soft_delete: true })
      res.json({ ok: true, deleted: (found.data || []).length })
    } catch (e) { next(e) }
  })

  router.post('/staff-codes/verify', async (req, res, next) => {
    try {
      const code = clean(req.body?.code)
      if (!code) return res.status(400).json({ ok: false, error: 'Code fehlt' })

      const { data, error } = await supabase.from('v33_functional_records')
        .select('*')
        .eq('resource', 'staff_codes')
        .eq('customer_id', req.body.customer_id)
        .limit(200)

      if (error) throw error

      const match = activeFunctionalRecords(data || []).find(r => {
        const p = r.payload || {}
        return p.active !== false && String(p.code || '') === String(code)
      })

      if (!match) return res.status(400).json({ ok: false, valid: false, error: 'Code ungültig' })
      const payload = { ...(match.payload || {}), uses: num(match.payload?.uses, 0) + 1 }

      await supabase.from('v33_functional_records').update({ payload, updated_at: new Date().toISOString() }).eq('id', match.id)
      res.json({ ok: true, valid: true, staff_code: { ...match, payload } })
    } catch (e) { next(e) }
  })

  router.post('/rewards/:local_id/redeem', async (req, res, next) => {
    try {
      const body = req.body || {}
      const limitCheck = await v39CheckRewardLimits(body.customer_id, req.params.local_id, body.member_name) // v39_reward_limit_enforcement
      if (!limitCheck.ok) return res.status(400).json(v39ErrorPayload(limitCheck.code, limitCheck.error, null, 'Prüfe Reward-Limits im Loyalty Programm.', limitCheck.warnings || []))
      if (body.staff_code) {
        const codes = await supabase.from('v33_functional_records')
          .select('*')
          .eq('resource', 'staff_codes')
          .eq('customer_id', body.customer_id)
          .limit(200)

        if (codes.error) throw codes.error
        const valid = activeFunctionalRecords(codes.data || []).some(r => (r.payload || {}).active !== false && String((r.payload || {}).code || '') === String(body.staff_code))
        if (!valid) return res.status(400).json({ ok: false, error: 'Mitarbeitercode ungültig' })
      }

      const redemption = await createRecord('redemptions', {
        customer_id: body.customer_id,
        reward_id: req.params.local_id,
        staff_code_used: Boolean(body.staff_code),
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
        member_name: body.member_name || null
      })

      await audit('v34_reward_redeemed', { customer_id: body.customer_id, reward_id: req.params.local_id })
      res.json({ ok: true, redemption })
    } catch (e) { next(e) }
  })

  router.get('/public/loyalty/:slug/status', async (req, res, next) => {
    try {
      const slug = String(req.params.slug || '').trim()
      const ctx = await resolvePublicLoyaltyContext(slug)
      const program = ctx.program
      if (!program) return res.status(404).json({ ok: false, error: `Kein Loyalty-Programm für /l/${slug} gefunden.` })

      const customerId = ctx.customerId || program.customer_id
      const resolvedQrCampaign = ctx.qrCampaign || null
      const [settings, qr, rewards, rewardRecords, rules] = await Promise.all([
        v37GetOrCreateLoyaltySettings(customerId).catch(() => null),
        resolvedQrCampaign
          ? Promise.resolve({ error: null, data: resolvedQrCampaign })
          : program.qr_campaign_id
            ? supabase.from('qr_campaigns').select('*').eq('id', program.qr_campaign_id).maybeSingle()
            : supabase.from('qr_campaigns').select('*').eq('slug', slug).maybeSingle(),
        supabase.from('loyalty_rewards').select('*').eq('customer_id', customerId).eq('active', true).limit(50),
        supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource', 'loyalty_rewards').limit(100),
        supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource', 'loyalty_reward_rules').limit(50)
      ])

      const qrData = qr.error ? null : (qr.data || null)
      const campaignId = qrData?.id || program.qr_campaign_id || null
      const activeRules = (rules.data || [])
        .map(r => r.payload || r)
        .filter(r => r && r.active !== false)
        .filter(r => !r.qr_campaign_id || !campaignId || String(r.qr_campaign_id) === String(campaignId))

      const activeActions = activeRules.map(r => {
        const action = String(r.action || '')
        const condition = String(r.condition || '')
        const points = Number(r.points || 0)
        const multiplier = Number(r.multiplier || 0)
        if ((action === 'multiply_points' && points > 1) || multiplier > 1) {
          const factor = multiplier > 1 ? multiplier : points
          return {
            label: `Doppelter Punkte-Vorteil ist aktiv`,
            message: `Sammle jetzt ${factor}x Punkte${condition === 'weekday' ? ' an Wochentagen' : condition === 'weekend' ? ' am Wochenende' : ''}.`,
            type: 'points_multiplier'
          }
        }
        if (action === 'add_points' && points > 0) {
          return { label: 'Bonuspunkte-Aktion ist aktiv', message: `Sammle jetzt zusätzlich ${points} Punkte.`, type: 'bonus_points' }
        }
        if (action === 'unlock_reward') {
          return { label: 'Reward-Aktion ist aktiv', message: 'Scanne jetzt und schalte einen Reward frei.', type: 'reward_unlock' }
        }
        return null
      }).filter(Boolean)

      const tableRewards = rewards.error ? [] : (rewards.data || [])
      const allRecordRewardRows = rewardRecords.error ? [] : (rewardRecords.data || [])
      const activeRecordRewardRows = activeFunctionalRecords(allRecordRewardRows)
      const recordRewards = activeRecordRewardRows.map(r => ({ id: r.local_id || r.id, local_id: r.local_id, customer_id: r.customer_id, ...(r.payload || {}) }))
      const rewardKeys = (row = {}) => {
        const p = row.payload && typeof row.payload === 'object' ? row.payload : {}
        return [row.id, row.local_id, row.reward_id, p.id, p.local_id, p.reward_id]
          .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
          .map(v => String(v))
      }
      const activeRecordRewardIds = new Set(recordRewards.flatMap(rewardKeys))
      const inactiveRecordRewardIds = new Set((allRecordRewardRows || [])
        .filter(r => !isActiveFunctionalRecord(r))
        .flatMap(rewardKeys))
      const hasActiveRecordRewards = activeRecordRewardIds.size > 0

      // V084: Die öffentliche Slug-Seite nutzt aktive v33-Reward-Records als
      // führende Quelle, weil Admin-Löschen/Umbenennen dort zuerst landet.
      // Tabellen-Rewards werden nur ergänzt, wenn es keine aktiven Records gibt
      // oder wenn sie nicht durch einen aktiven/gelöschten Record überlagert sind.
      const tableRewardCandidates = tableRewards
        .filter((r) => !rewardKeys(r).some(k => inactiveRecordRewardIds.has(k)))
        .filter((r) => !rewardKeys(r).some(k => activeRecordRewardIds.has(k)))
      const rawRewardRows = hasActiveRecordRewards ? [...recordRewards, ...tableRewardCandidates] : tableRewardCandidates
      const rewardSourceRows = rawRewardRows
        .filter((r) => rewardBelongsToPublicSlug(r, { program, campaignId, activeRecordRewardIds, hasActiveRecordRewards: false }))

      const activeCampaignIds = new Set()
      try {
        const campaignRows = await supabase.from('qr_campaigns').select('id,active,status,deleted_at,archived_at,is_deleted,metadata').eq('customer_id', customerId).limit(500)
        if (!campaignRows.error) {
          for (const c of (campaignRows.data || [])) {
            if (isPublicActiveCampaign(c)) activeCampaignIds.add(String(c.id))
          }
        }
      } catch (_) {}
      if (campaignId) activeCampaignIds.add(String(campaignId))

      const rewardById = new Map()
      for (const raw of rewardSourceRows) {
        if (!raw || !isPublicActiveReward(raw)) continue
        const normalized = normalizeReward(raw, raw.payload ? 'v33_functional_records_legacy' : 'loyalty_rewards')
        if (!normalized) continue
        // Kampagnengebundene Rewards nur anzeigen, wenn die Kampagne noch aktiv existiert.
        if (normalized.qr_campaign_id && !activeCampaignIds.has(String(normalized.qr_campaign_id))) continue
        const key = String(normalized.id || normalized.local_id || normalized.title || Math.random())
        if (!rewardById.has(key)) rewardById.set(key, normalized)
      }

      const mergedRewards = Array.from(rewardById.values())
        .map(r => ({
          ...r,
          campaign_match: Boolean(r.qr_campaign_id && campaignId && String(r.qr_campaign_id) === String(campaignId)),
          global_customer_reward: !r.qr_campaign_id
        }))
        .sort((a, b) => {
          if (a.campaign_match !== b.campaign_match) return a.campaign_match ? -1 : 1
          if (a.global_customer_reward !== b.global_customer_reward) return a.global_customer_reward ? -1 : 1
          return Number(a.points_required || 0) - Number(b.points_required || 0)
        })
        .slice(0, 50)
      res.json({
        ok: true,
        slug,
        program,
        customer_id: customerId,
        qr_campaign: qrData,
        settings,
        rewards: mergedRewards,
        active_actions: activeActions,
        scan_limits: qrScanLimitSettings(qrData, program),
        mode: qrData?.metadata?.purpose || qrData?.mode || program?.metadata?.purpose || 'loyalty',
        google_review_url: qrData?.google_review_url || qrData?.metadata?.google_review_url || null,
        scan_start_url: `/q/${slug}`,
        active: program.active !== false && qrData?.active !== false
      })
    } catch (e) { next(e) }
  })

  router.get('/public/loyalty/:slug/scan-start', async (req, res, next) => {
    try {
      const slug = String(req.params.slug || '').trim()
      const shield = inspectPublicAction({ req, action: 'public_scan_start', slug, email: null, body: req.query || {}, max: 80 })
      await recordPublicShieldEvent(supabase, shield, { action: 'public_scan_start', slug, user_agent: req.get('user-agent') })
      if (!shield.ok) return res.status(shield.status || 429).json({ ok:false, code: shield.code, error: shield.error, retry_after_ms: shield.retry_after_ms })

      const ctx = await resolvePublicLoyaltyContext(slug)
      const program = ctx.program
      if (!program || program.active === false) return res.status(404).json({ ok:false, code:'SLUG_INACTIVE', error:'Dieser QR-Link ist nicht aktiv.' })

      const qrCampaign = ctx.qrCampaign || await getQrCampaignForPublicProgram(program, slug)
      if (qrCampaign && qrCampaign.active === false) return res.status(410).json({ ok:false, code:'QR_CAMPAIGN_INACTIVE', error:'Diese Kampagne ist beendet.' })

      const token = await createQrScanToken({ customerId: program.customer_id, slug, program, qrCampaign, req })
      const redirectPath = `/l/${encodeURIComponent(slug)}?scan_token=${encodeURIComponent(token.token)}`
      if (req.query.redirect === '1' || req.query.redirect === 'true') return res.redirect(302, redirectPath)
      res.json({ ok:true, slug, scan_token: token.token, expires_at: token.expires_at, redirect_path: redirectPath, direct_path: `/l/${slug}` })
    } catch (e) { next(e) }
  })


  router.post('/public/loyalty/:slug/join-or-scan', async (req, res, next) => {
    try {
      const slug = String(req.params.slug || '').trim()
      const body = req.body || {}
      const email = clean(body.email)?.toLowerCase() || null
      const password = clean(body.password)
      const authOnly = body.auth_only === true || body.authOnly === true
      const displayName = clean(body.display_name || body.displayName || body.name) || (email ? email.split('@')[0] : 'QR Lead')
      const deviceId = clean(body.device_id)
      const scanToken = clean(body.scan_token || body.scanToken)
      const now = new Date().toISOString()
      const warnings = []
      const marketingConsentRequest = marketingConsentFromBody(body)

      const shield = inspectPublicAction({ req, action: authOnly ? 'public_auth_only' : 'public_join_or_scan', slug, email, body, max: authOnly ? 45 : 30 })
      await recordPublicShieldEvent(supabase, shield, { action: authOnly ? 'public_auth_only' : 'public_join_or_scan', slug, email, user_agent: req.get('user-agent') })
      if (!shield.ok) return res.status(shield.status || 429).json({ ok: false, error: shield.error, code: shield.code, retry_after_ms: shield.retry_after_ms })

      if (!email || !password || String(password).length < PUBLIC_PASSWORD_MIN_LENGTH) {
        return res.status(400).json({ ok: false, error: 'E-Mail und Passwort mit mindestens 8 Zeichen sind erforderlich.' })
      }
      const rate = checkPublicAuthRateLimit(slug, email, req.ip || req.get('x-forwarded-for'))
      if (!rate.ok) return res.status(429).json({ ok:false, error:'Zu viele Login-Versuche. Bitte versuche es später erneut.', retry_after_ms: Math.max(0, rate.reset_at - Date.now()) })

      const ctx = await resolvePublicLoyaltyContext(slug)
      const program = ctx.program

      if (!program) {
        return res.status(404).json({ ok: false, error: `Kein Loyalty-Programm für /l/${slug} gefunden.` })
      }

      const customerId = ctx.customerId || program.customer_id
      const settings = await v37GetOrCreateLoyaltySettings(customerId)
      const qrCampaign = ctx.qrCampaign || await getQrCampaignForPublicProgram(program, slug)
      const qrLimitsForProgram = qrScanLimitSettings(qrCampaign, program)
      let points = authOnly ? 0 : num(qrCampaign?.points_per_scan ?? qrCampaign?.metadata?.points_per_scan ?? program.points_per_scan ?? program.metadata?.points_per_scan, 10)
      let member = null
      // v37_loyalty_limits_applied

      let q = supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', program.id).eq('email', email).limit(1)
      const existing = await q.maybeSingle()
      if (!existing.error) member = existing.data || null

      if (member) {
        const storedPasswordHash = getPublicPasswordHash(member)
        if (storedPasswordHash && !publicPasswordVerify(password, storedPasswordHash)) {
          return res.status(401).json({ ok: false, error: 'E-Mail oder Passwort ist falsch.' })
        }
        if (!storedPasswordHash) {
          member.metadata = withPublicPassword(member, password, now)
          await supabase.from('loyalty_customers').update({ metadata: member.metadata }).eq('id', member.id)
        }
        if (!authOnly) {
          if (qrLimitsForProgram.require_rescan_for_points) {
            const tokenCheck = await findQrScanToken({ customerId, slug, token: scanToken })
            if (!tokenCheck.ok) return res.status(tokenCheck.status || 428).json({ ok:false, code:tokenCheck.code, error:tokenCheck.error })
          }
          const sinceDay = new Date(Date.now() - 24*60*60*1000).toISOString()
          const dayTx = await supabase.from('loyalty_transactions').select('id').eq('loyalty_customer_id', member.id).eq('action', 'qr_scan').gte('created_at', sinceDay)
          const dailyScanLimit = qrLimitsForProgram.daily_scan_limit_per_member_configured ? Number(qrLimitsForProgram.daily_scan_limit_per_member || 0) : Number(settings.daily_scan_limit || 0)
          if (dailyScanLimit > 0 && (dayTx.data || []).length >= dailyScanLimit) {
            return res.status(429).json({ ok: false, error: 'Tageslimit erreicht', code:'QR_DAILY_SCAN_LIMIT_REACHED', limit: dailyScanLimit })
          }
          // Kein verstecktes Wochenlimit mehr. Wochenlimits greifen nur noch,
          // wenn sie ausdrücklich aktiviert/konfiguriert wurden.
          const weeklyScanLimitEnabled = settings.weekly_scan_limit_enabled === true || settings.metadata?.weekly_scan_limit_enabled === true
          if (weeklyScanLimitEnabled && Number(settings.weekly_scan_limit || 0) > 0) {
            const sinceWeek = new Date(Date.now() - 7*24*60*60*1000).toISOString()
            const weekTx = await supabase.from('loyalty_transactions').select('id').eq('loyalty_customer_id', member.id).eq('action', 'qr_scan').gte('created_at', sinceWeek)
            if ((weekTx.data || []).length >= Number(settings.weekly_scan_limit)) {
              return res.status(429).json({ ok: false, error: 'Wochenlimit erreicht', code:'QR_WEEKLY_SCAN_LIMIT_REACHED', limit: settings.weekly_scan_limit })
            }
          }
          const qrLimit = await checkQrScanRedemptionLimits({ customerId, program, qrCampaign, member, slug })
          if (!qrLimit.ok) {
            return res.status(qrLimit.status || 429).json({ ok: false, error: qrLimit.error, code: qrLimit.code, retry_after_ms: qrLimit.retry_after_ms, next_available_at: qrLimit.next_available_at, scan_limits: qrLimit.settings, previous_scans: qrLimit.previous_scans })
          }
          if (qrLimit.warning) warnings.push({ code: 'QR_LIMIT_CHECK_WARNING', message: qrLimit.warning })
          const currentTierMultiplier = Number(member.metadata?.v37_level_multiplier || 1)
          points = Math.round(points * currentTierMultiplier)
          const pointLimit = await checkDailyPointLimit({ customerId, member, pointsToAdd: points, program, qrCampaign })
          if (!pointLimit.ok) return res.status(pointLimit.status || 429).json({ ok:false, error: pointLimit.error, code: pointLimit.code, limit: pointLimit.limit, points_today: pointLimit.points_today })
          if (pointLimit.warning) warnings.push({ code:'POINT_LIMIT_WARNING', message: pointLimit.warning })
          const weeklyPointLimit = await checkWeeklyPointLimit({ customerId, member, pointsToAdd: points, program, qrCampaign })
          if (!weeklyPointLimit.ok) return res.status(weeklyPointLimit.status || 429).json({ ok:false, error: weeklyPointLimit.error, code: weeklyPointLimit.code, limit: weeklyPointLimit.limit, points_week: weeklyPointLimit.points_week })
          if (weeklyPointLimit.warning) warnings.push({ code:'WEEKLY_POINT_LIMIT_WARNING', message: weeklyPointLimit.warning })
        }
      }

      if (!member) {
        if (!authOnly && qrLimitsForProgram.require_rescan_for_points) { const tokenCheck = await findQrScanToken({ customerId, slug, token: scanToken }); if (!tokenCheck.ok) return res.status(tokenCheck.status || 428).json({ ok:false, code:tokenCheck.code, error:tokenCheck.error }) }
        const pointLimitNew = await checkDailyPointLimit({ customerId, member: { id: '__new__' }, pointsToAdd: points, program, qrCampaign })
        if (!authOnly && pointLimitNew.limit > 0 && points > pointLimitNew.limit) return res.status(429).json({ ok:false, error: pointLimitNew.error || `Punkte-Tageslimit erreicht. Heute sind maximal ${pointLimitNew.limit} Punkte pro Bonuskonto möglich.`, code:'DAILY_POINT_LIMIT_REACHED', limit: pointLimitNew.limit, points_today: 0 })
        const weeklyPointLimitNew = await checkWeeklyPointLimit({ customerId, member: { id: '__new__' }, pointsToAdd: points, program, qrCampaign })
        if (!authOnly && weeklyPointLimitNew.limit > 0 && points > weeklyPointLimitNew.limit) return res.status(429).json({ ok:false, error: weeklyPointLimitNew.error || `Punkte-Wochenlimit erreicht. Diese Woche sind maximal ${weeklyPointLimitNew.limit} Punkte pro Bonuskonto möglich.`, code:'WEEKLY_POINT_LIMIT_REACHED', limit: weeklyPointLimitNew.limit, points_week: 0 })
        const created = await insertLoyaltyCustomerSafe({
          customer_id: customerId,
          loyalty_program_id: program.id,
          email,
          phone: null,
          display_name: displayName,
          member_token: body.member_token || safeToken('loy'),
          device_id: deviceId,
          points_balance: points,
          total_points: points,
          total_scans: authOnly ? 0 : 1,
          last_seen_at: now,
          last_activity_at: now,
          metadata: { source: 'public_qr', slug, consent_marketing: false, marketing_consent_pending: marketingConsentRequest || null, marketing_consent_status: marketingConsentRequest?.requested ? 'pending_double_opt_in' : 'none', public_auth: { password_hash: publicPasswordHash(password), password_set_at: now, auth_method: 'email_password' } }
        })

        if (created.error) throw created.error
        member = created.data
      } else {
        const nextMemberMetadata = marketingConsentRequest?.requested ? {
          ...(member.metadata || {}),
          consent_marketing: false,
          marketing_consent_status: 'pending_double_opt_in',
          marketing_consent_pending_at: marketingConsentRequest.requested_at,
          marketing_consent_version: marketingConsentRequest.version,
          marketing_consent_pending: marketingConsentRequest
        } : member.metadata
        const patch = authOnly ? {
          last_seen_at: now,
          last_activity_at: now,
          ...(marketingConsentRequest?.requested ? { metadata: nextMemberMetadata } : {})
        } : {
          points_balance: num(member.points_balance, 0) + points,
          total_points: num(member.total_points, 0) + points,
          total_scans: num(member.total_scans, 0) + 1,
          last_seen_at: now,
          last_activity_at: now,
          ...(marketingConsentRequest?.requested ? { metadata: nextMemberMetadata } : {})
        }
        const updated = await updateLoyaltyCustomerSafe(member.id, patch)

        if (updated.error) throw updated.error
        member = updated.data || member
      }

      resetPublicAuthRateLimit(slug, email, req.ip || req.get('x-forwarded-for'))
      let marketingConsentResult = null
      try {
        marketingConsentResult = await persistMarketingConsent(supabase, { customerId, program, qrCampaign, member, slug, email, displayName, body, req })
        if (marketingConsentResult?.member) member = marketingConsentResult.member
      } catch (e) {
        warnings.push({ code: 'MARKETING_CONSENT_SAVE_FAILED', message: String(e?.message || e) })
      }
      if (authOnly) {
        const redemptions = await getPublicRewardRedemptions(customerId, member.id).catch(() => [])
        return res.json({
          ok: true,
          authenticated: true,
          program,
          member,
          points_added: 0,
          points_balance: num(member.points_balance, 0),
          redemptions,
          warnings,
          scan_limits: qrScanLimitSettings(qrCampaign, program),
          marketing_consent: marketingConsentResult ? { granted: false, status: marketingConsentResult.status || 'pending_double_opt_in', double_opt_in_required: true, email_sent: Boolean(marketingConsentResult.email_sent), dryRun: Boolean(marketingConsentResult.dryRun), expires_at: marketingConsentResult.expires_at } : { granted: false }
        })
      }

      if (qrLimitsForProgram.require_rescan_for_points) {
        const consumed = await consumeQrScanToken({ customerId, slug, token: scanToken, memberId: member.id })
        if (!consumed.ok) return res.status(consumed.status || 409).json({ ok:false, code: consumed.code, error: consumed.error })
      }

      try {
        const tx = await insertLoyaltyTransactionSafe({
          customer_id: customerId,
          loyalty_program_id: program.id,
          loyalty_customer_id: member.id,
          qr_campaign_id: qrCampaign?.id || program.qr_campaign_id || null,
          action: 'qr_scan',
          points,
          source: 'qr',
          description: `QR Scan über /l/${slug}`,
          metadata: { public: true, slug, email, display_name: displayName, auth_method: 'email_password', scan_token_id: scanToken || null, require_rescan_for_points: Boolean(qrLimitsForProgram.require_rescan_for_points), scan_limits: qrScanLimitSettings(qrCampaign, program) }
        })
        if (tx.error) warnings.push({ code: 'LOYALTY_TRANSACTION_SAVE_FAILED', message: String(tx.error.message || tx.error) })
      } catch (e) { warnings.push({ code: 'LOYALTY_TRANSACTION_SAVE_FAILED', message: String(e?.message || e) }) }

      const suspicion = await updateMemberSuspicionScore({ customerId, member, program, qrCampaign })
      if (suspicion) warnings.push({ code:'SUSPICION_SCORE', message:`Verdachts-Score ${suspicion.score}/100`, status:suspicion.status })

      try {
        if (program.qr_campaign_id) {
          const currentQr = await supabase.from('qr_campaigns').select('scans,conversions').eq('id', program.qr_campaign_id).maybeSingle()
          if (!currentQr.error && currentQr.data) {
            await supabase.from('qr_campaigns').update({
              scans: num(currentQr.data.scans, 0) + 1,
              conversions: num(currentQr.data.conversions, 0) + 1,
              updated_at: now
            }).eq('id', program.qr_campaign_id)
          }
        }
      } catch (_) {}

      let levelResult = null
      try { levelResult = await v37ApplyLevel(customerId, member.id) } catch (e) { warnings.push({ code:'LEVEL_UPDATE_FAILED', message:String(e?.message || e) }) }

      const existingLead = await v39FindRecentLead(customerId, slug, email, deviceId).catch((e) => { warnings.push({ code:'RECENT_LEAD_LOOKUP_FAILED', message:String(e?.message || e) }); return null })
      const leadPayload = {
        customer_id: customerId,
        loyalty_program_id: program.id,
        loyalty_customer_id: member.id,
        qr_campaign_id: program.qr_campaign_id || null,
        slug,
        name: displayName,
        email,
        phone: null,
        source: 'qr_loyalty',
        status: 'new',
        points_added: points,
        points_balance: member.points_balance || points,
        metadata: { device_id: deviceId }
      }

      let publicLead = { data: existingLead, error: null }
      if (!existingLead) {
        publicLead = await supabase.from('v33_public_leads').insert(leadPayload).select('*').single()
        if (publicLead.error) {
          warnings.push({ code: 'PUBLIC_LEAD_SAVE_FAILED', message: String(publicLead.error.message || publicLead.error) })
          publicLead = { data: null, error: publicLead.error }
        }
      } else {
        warnings.push({ code: 'DUPLICATE_LEAD_SUPPRESSED', message: 'Lead existierte bereits innerhalb von 24h und wurde nicht doppelt angelegt.' })
      }

      let pipelineLead = null
      try {
        const pipeline = await supabase.from('pipeline_leads').insert({
          customer_id: customerId,
          title: `QR/Loyalty Lead – ${displayName}`,
          source: 'qr_loyalty',
          stage: 'new',
          value: 0,
          probability: 20,
          metadata: leadPayload
        }).select('*').single()
        if (!pipeline.error) pipelineLead = pipeline.data
      } catch (_) {}

      try {
        await supabase.from('customer_timeline_events').insert({
          customer_id: customerId,
          event_type: 'qr_loyalty_lead_created',
          title: 'QR/Loyalty Lead erzeugt',
          description: `${displayName} hat über /l/${slug} Punkte gesammelt.`,
          source_module: 'qr_loyalty',
          severity: 'success',
          metadata: leadPayload
        })
      } catch (_) {}

      try { await audit('v34_qr_loyalty_lead_created', { customer_id: customerId, slug, email, auth_method: 'email_password' }) } catch (e) { warnings.push({ code:'AUDIT_FAILED', message:String(e?.message || e) }) }
      let v35Snapshot = null
      try { v35Snapshot = await engine.recalculateCustomer(customerId) } catch (e) { warnings.push({ code:'ENGINE_RECALCULATE_FAILED', message:String(e?.message || e) }) }
      let rotatedQr = null
      try { rotatedQr = await rotateQrCampaignAfterSuccessfulScan({ customerId, slug, program, qrCampaign }) } catch (e) { warnings.push({ code:'QR_ROTATION_FAILED', message: String(e?.message || e) }) }

      res.json({
        ok: true,
        program,
        member,
        points_added: points,
        points_balance: member.points_balance || points,
        lead: publicLead.data,
        pipeline_lead: pipelineLead,
        warnings,
        scan_limits: qrScanLimitSettings(qrCampaign, program),
        engine_snapshot: v35Snapshot,
        loyalty_level: levelResult,
        redemptions: await getPublicRewardRedemptions(customerId, member.id).catch(() => []),
        scan_token_consumed: Boolean(scanToken && qrLimitsForProgram.require_rescan_for_points),
        qr_rotation: rotatedQr,
        marketing_consent: marketingConsentResult ? { granted: false, status: marketingConsentResult.status || 'pending_double_opt_in', double_opt_in_required: true, email_sent: Boolean(marketingConsentResult.email_sent), dryRun: Boolean(marketingConsentResult.dryRun), expires_at: marketingConsentResult.expires_at } : { granted: false }
      })
    } catch (e) { next(e) }
  })




  router.get('/public/loyalty/:slug/marketing-consent/confirm', async (req, res, next) => {
    try {
      const token = clean(req.query.token)
      if (!token) return res.status(400).json({ ok:false, error:'Bestätigungstoken fehlt.' })
      const result = await confirmMarketingConsentToken(supabase, { token, slug: req.params.slug, req })
      res.status(result.ok ? 200 : 400).json(result)
    } catch (e) { next(e) }
  })

  router.post('/public/loyalty/:slug/marketing-consent/confirm', async (req, res, next) => {
    try {
      const token = clean(req.body?.token)
      if (!token) return res.status(400).json({ ok:false, error:'Bestätigungstoken fehlt.' })
      const result = await confirmMarketingConsentToken(supabase, { token, slug: req.params.slug, req })
      res.status(result.ok ? 200 : 400).json(result)
    } catch (e) { next(e) }
  })


  router.post('/public/loyalty/:slug/marketing-consent/status', async (req, res, next) => {
    try {
      const slug = String(req.params.slug || '').trim()
      const body = req.body || {}
      const email = clean(body.email)?.toLowerCase() || null
      const password = clean(body.password)
      if (!email || !password) return res.status(400).json({ ok:false, error:'E-Mail und Passwort sind erforderlich.' })

      const ctx = await resolvePublicLoyaltyContext(slug)
      const program = ctx.program
      if (!program) return res.status(404).json({ ok:false, error:'Bonusprogramm nicht gefunden.' })

      const existing = await supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', program.id).eq('email', email).maybeSingle()
      const member = existing.error ? null : (existing.data || null)
      if (!member) return res.status(404).json({ ok:false, error:'Bonusmitglied nicht gefunden.' })
      const storedPasswordHash = getPublicPasswordHash(member)
      if (storedPasswordHash && !publicPasswordVerify(password, storedPasswordHash)) return res.status(401).json({ ok:false, error:'E-Mail oder Passwort ist falsch.' })

      const metadata = member.metadata || {}
      res.json({
        ok: true,
        slug,
        email,
        loyalty_customer_id: member.id,
        consent_marketing: Boolean(metadata.consent_marketing),
        status: metadata.marketing_consent_status || 'none',
        consent_at: metadata.marketing_consent_at || null,
        pending_at: metadata.marketing_consent_pending_at || null,
        withdrawn_at: metadata.marketing_consent_withdrawn_at || null,
        version: metadata.marketing_consent_version || null,
        purposes: metadata.marketing_consent?.purposes || metadata.marketing_consent_pending?.purposes || [],
        can_receive_reminders: Boolean(metadata.consent_marketing && metadata.marketing_consent_status === 'granted')
      })
    } catch (e) { next(e) }
  })

  router.post('/public/loyalty/:slug/marketing-consent/resend-double-opt-in', async (req, res, next) => {
    try {
      const slug = String(req.params.slug || '').trim()
      const body = req.body || {}
      const email = clean(body.email)?.toLowerCase() || null
      const password = clean(body.password)
      if (!email || !password) return res.status(400).json({ ok:false, error:'E-Mail und Passwort sind erforderlich.' })

      const ctx = await resolvePublicLoyaltyContext(slug)
      const program = ctx.program
      if (!program) return res.status(404).json({ ok:false, error:'Bonusprogramm nicht gefunden.' })

      const existing = await supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', program.id).eq('email', email).maybeSingle()
      const member = existing.error ? null : (existing.data || null)
      if (!member) return res.status(404).json({ ok:false, error:'Bonusmitglied nicht gefunden.' })
      const storedPasswordHash = getPublicPasswordHash(member)
      if (storedPasswordHash && !publicPasswordVerify(password, storedPasswordHash)) return res.status(401).json({ ok:false, error:'E-Mail oder Passwort ist falsch.' })

      const result = await requestMarketingDoubleOptIn(supabase, {
        customerId: program.customer_id,
        program,
        qrCampaign: null,
        member,
        slug,
        email,
        displayName: member.display_name || member.name || email,
        body: { ...body, marketing_consent: true, marketing_consent_source: 'public_consent_center' },
        req,
        requireDelivery: false
      })
      res.json(result || { ok:false, error:'Double-Opt-in konnte nicht vorbereitet werden.' })
    } catch (e) { next(e) }
  })

  router.post('/public/loyalty/:slug/marketing-consent/withdraw', async (req, res, next) => {
    try {
      const slug = String(req.params.slug || '').trim()
      const body = req.body || {}
      const token = clean(body.token || req.query.token)
      const email = clean(body.email)?.toLowerCase() || null
      const password = clean(body.password)
      if (token) {
        const result = await withdrawMarketingConsentByTokenOrLogin(supabase, { token, slug, email, req, reason: body.reason || 'unsubscribe_link' })
        return res.status(result.ok ? 200 : 400).json(result)
      }
      if (!email || !password) return res.status(400).json({ ok:false, error:'E-Mail und Passwort sind erforderlich.' })

      const ctx = await resolvePublicLoyaltyContext(slug)
      const program = ctx.program
      if (!program) return res.status(404).json({ ok:false, error:'Bonusprogramm nicht gefunden.' })

      const existing = await supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', program.id).eq('email', email).maybeSingle()
      const member = existing.error ? null : (existing.data || null)
      if (!member) return res.status(404).json({ ok:false, error:'Bonusmitglied nicht gefunden.' })
      const storedPasswordHash = getPublicPasswordHash(member)
      if (storedPasswordHash && !publicPasswordVerify(password, storedPasswordHash)) return res.status(401).json({ ok:false, error:'E-Mail oder Passwort ist falsch.' })

      const result = await withdrawMarketingConsent(supabase, { customerId: program.customer_id, member, slug, email, req, reason: body.reason || 'withdrawn_by_user' })
      res.json(result)
    } catch (e) { next(e) }
  })


  router.post('/public/loyalty/:slug/rewards/:reward_id/redeem', async (req, res, next) => {
    try {
      const slug = String(req.params.slug || '').trim()
      const rewardId = String(req.params.reward_id || '').trim()
      const body = req.body || {}
      const email = clean(body.email)?.toLowerCase() || null
      const password = clean(body.password)
      const staffCode = clean(body.staff_code || body.staffCode || body.pin || body.staff_pin)
      const now = new Date().toISOString()

      const shield = inspectPublicAction({ req, action: 'public_reward_redeem', slug, email, body, max: 20 })
      await recordPublicShieldEvent(supabase, shield, { action: 'public_reward_redeem', slug, email, user_agent: req.get('user-agent') })
      if (!shield.ok) return res.status(shield.status || 429).json({ ok:false, code: shield.code, error: shield.error, retry_after_ms: shield.retry_after_ms })

      if (!email || !password) return res.status(400).json({ ok: false, error: 'E-Mail und Passwort sind erforderlich.' })
      const rate = checkPublicAuthRateLimit(`${slug}:redeem`, email, req.ip || req.get('x-forwarded-for'))
      if (!rate.ok) return res.status(429).json({ ok:false, error:'Zu viele Einlöse-Versuche. Bitte versuche es später erneut.', retry_after_ms: Math.max(0, rate.reset_at - Date.now()) })

      const ctx = await resolvePublicLoyaltyContext(slug)
      const program = ctx.program
      if (!program) return res.status(404).json({ ok: false, error: `Kein Loyalty-Programm für /l/${slug} gefunden.` })
      const customerId = ctx.customerId || program.customer_id
      const campaignId = ctx.qrCampaign?.id || program.qr_campaign_id || null

      const memberQuery = await supabase.from('loyalty_customers')
        .select('*')
        .eq('loyalty_program_id', program.id)
        .eq('email', email)
        .maybeSingle()
      const member = memberQuery.error ? null : memberQuery.data
      if (!member) return res.status(401).json({ ok: false, error: 'Bonus-Konto nicht gefunden. Bitte zuerst anmelden und Punkte sammeln.' })
      const storedPasswordHash = getPublicPasswordHash(member)
      if (storedPasswordHash && !publicPasswordVerify(password, storedPasswordHash)) return res.status(401).json({ ok: false, error: 'E-Mail oder Passwort ist falsch.' })
      if (!storedPasswordHash) return res.status(401).json({ ok:false, error:'Bitte melde dich zuerst erneut an, um dein Bonuskonto mit Passwort zu schützen.' })

      const reward = await findPublicReward(customerId, rewardId, campaignId)
      if (!reward) return res.status(404).json({ ok: false, error: 'Reward nicht gefunden oder nicht aktiv.' })

      const requiredPoints = rewardRequiredPoints(reward)
      const balance = num(member.points_balance, 0)
      if (balance < requiredPoints) return res.status(400).json({ ok: false, error: `Für diese Prämie fehlen noch ${Math.max(0, requiredPoints - balance)} Punkte.`, required_points: requiredPoints, points_balance: balance })

      if (rewardNeedsStaffCode(reward)) {
        const staff = await validatePublicStaffCode(customerId, staffCode, campaignId)
        if (!staff.ok) return res.status(400).json({ ok: false, error: staff.error || 'Mitarbeitercode ungültig.' })
      }

      const existingRedemptions = await getPublicRewardRedemptions(customerId, member.id, reward.id)
      const allowMultiple = rewardAllowsMultiple(reward)
      const maxPerMember = rewardMaxPerMember(reward)
      if (!allowMultiple && existingRedemptions.length > 0) {
        return res.status(409).json({ ok: false, error: 'Diese Prämie wurde bereits eingelöst und ist nur einmal pro Bonuskonto verfügbar.', already_redeemed: true })
      }
      if (allowMultiple && maxPerMember > 0 && existingRedemptions.length >= maxPerMember) {
        return res.status(409).json({ ok: false, error: `Diese Prämie kann maximal ${maxPerMember}x pro Bonuskonto eingelöst werden.`, already_redeemed: true })
      }

      const nextBalance = Math.max(0, balance - requiredPoints)
      const updateMember = await supabase.from('loyalty_customers').update({
        points_balance: nextBalance,
        last_activity_at: now,
        last_seen_at: now,
        metadata: {
          ...(member.metadata || {}),
          last_reward_redemption: { reward_id: reward.id, title: reward.title, redeemed_at: now, points_spent: requiredPoints }
        }
      }).eq('id', member.id).select('*').single()
      if (updateMember.error) throw updateMember.error

      const redemptionPayload = {
        customer_id: customerId,
        loyalty_program_id: program.id,
        loyalty_customer_id: member.id,
        qr_campaign_id: campaignId,
        reward_id: reward.id,
        reward_title: reward.title,
        points_spent: requiredPoints,
        staff_code_used: Boolean(staffCode),
        status: 'redeemed',
        redeemed_at: now,
        allow_multiple_redemptions: allowMultiple,
        metadata: { slug, email, reward, auth_method: 'email_password' },
        created_at: now,
        updated_at: now
      }
      const redemption = await savePublicRewardRedemption(redemptionPayload)

      try {
        await supabase.from('loyalty_transactions').insert({
          customer_id: customerId,
          loyalty_program_id: program.id,
          loyalty_customer_id: member.id,
          qr_campaign_id: campaignId,
          action: 'reward_redemption',
          points: -requiredPoints,
          description: `Reward eingelöst: ${reward.title}`,
          metadata: { public: true, slug, reward_id: reward.id, staff_code_used: Boolean(staffCode) }
        })
      } catch (_) {}

      try {
        await supabase.from('activity_logs').insert({
          type: 'public_reward_redeemed',
          title: 'Prämie eingelöst',
          message: `${email} hat ${reward.title} eingelöst.`,
          customer_id: customerId,
          severity: 'success',
          metadata: { slug, reward_id: reward.id, loyalty_customer_id: member.id, points_spent: requiredPoints, staff_code_used: Boolean(staffCode) },
          created_at: now
        })
      } catch (_) {}

      resetPublicAuthRateLimit(`${slug}:redeem`, email, req.ip || req.get('x-forwarded-for'))
      const redemptions = await getPublicRewardRedemptions(customerId, member.id)
      return res.json({ ok: true, reward, redemption: redemption.data, member: updateMember.data, points_balance: nextBalance, points_spent: requiredPoints, redemptions })
    } catch (e) { next(e) }
  })

  router.post('/public/loyalty/:slug/password-reset-request', async (req, res, next) => {
    try {
      const slug = String(req.params.slug || '').trim()
      const email = clean(req.body?.email)?.toLowerCase()
      if (!email) return res.status(400).json({ ok:false, error:'E-Mail fehlt.' })
      const ctx = await resolvePublicLoyaltyContext(slug)
      const program = ctx.program
      if (!program) return res.status(404).json({ ok:false, error:`Kein Loyalty-Programm für /l/${slug} gefunden.` })
      const member = await supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', program.id).eq('email', email).maybeSingle()
      const resetToken = safeToken('reset')
      if (!member.error && member.data) {
        await supabase.from('loyalty_customers').update({
          metadata: { ...(member.data.metadata || {}), public_auth_reset: { token: resetToken, requested_at: new Date().toISOString(), used: false } },
          updated_at: new Date().toISOString()
        }).eq('id', member.data.id)
      }
      try { await supabase.from('activity_logs').insert({ type:'public_loyalty_password_reset_requested', title:'Slug Passwort-Reset angefragt', message:`Passwort-Reset für ${email} über /l/${slug}`, customer_id: program.customer_id, severity:'info', metadata:{ slug }, created_at:new Date().toISOString() }) } catch (_) {}
      res.json({ ok:true, message:'Wenn ein Bonuskonto existiert, wurde ein Reset-Vorgang vorbereitet.', reset_prepared: Boolean(member.data) })
    } catch (e) { next(e) }
  })

  router.post('/public/loyalty/:slug/review', async (req, res, next) => {
    try {
      const slug = String(req.params.slug || '').trim()
      const body = req.body || {}
      const rating = num(body.rating, 0)
      const shield = inspectPublicAction({ req, action: 'public_review', slug, email: body.reviewer_email || body.email, body, max: 25 })
      await recordPublicShieldEvent(supabase, shield, { action: 'public_review', slug, email: body.reviewer_email || body.email, user_agent: req.get('user-agent') })
      if (!shield.ok) return res.status(shield.status || 429).json({ ok:false, code: shield.code, error: shield.error, retry_after_ms: shield.retry_after_ms })

      const ctx = await resolvePublicLoyaltyContext(slug)
      const program = ctx.program
      const qrCampaign = ctx.qrCampaign || (program
        ? await getQrCampaignForPublicProgram(program, slug).catch(() => null)
        : (await supabase.from('qr_campaigns').select('*').eq('slug', slug).maybeSingle().then(r => r.error ? null : r.data).catch(() => null)))

      const customerId = body.customer_id || program?.customer_id || qrCampaign?.customer_id || null
      const loyaltyProgramId = body.loyalty_program_id || program?.id || null
      const qrCampaignId = body.qr_campaign_id || program?.qr_campaign_id || qrCampaign?.id || null

      const reviewPayload = {
        customer_id: customerId,
        loyalty_program_id: loyaltyProgramId,
        loyalty_customer_id: body.loyalty_customer_id || null,
        qr_campaign_id: qrCampaignId,
        rating,
        feedback_text: body.feedback_text || body.comment || null,
        comment: body.feedback_text || body.comment || null,
        reviewer_name: body.reviewer_name || body.name || null,
        reviewer_email: body.reviewer_email || body.email || null,
        source: 'public_qr_loyalty',
        status: rating <= 3 ? 'needs_followup' : 'new',
        sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
        metadata: {
          slug,
          public_slug: slug,
          inferred_from_slug: true,
          qr_campaign_id: qrCampaignId,
          loyalty_program_id: loyaltyProgramId,
          campaign_title: qrCampaign?.title || qrCampaign?.name || null
        }
      }

      const { data, error } = await supabase.from('review_feedback').insert(reviewPayload).select('*').single()
      if (error) throw error

      // Review zusätzlich direkt an der QR-Kampagne spiegeln, damit die Kampagne
      // Review-Zählung/letzte Bewertung kennt.
      if (qrCampaignId) {
        try {
          const current = await supabase.from('qr_campaigns').select('metadata,conversions').eq('id', qrCampaignId).maybeSingle()
          const currentMeta = current.error ? {} : (current.data?.metadata || {})
          const reviewCount = Number(currentMeta.review_count || 0) + 1
          await supabase.from('qr_campaigns').update({
            conversions: Number(current.data?.conversions || 0) + 1,
            metadata: {
              ...currentMeta,
              review_count: reviewCount,
              last_review_id: data.id,
              last_review_rating: rating,
              last_review_at: new Date().toISOString(),
              last_review_sentiment: reviewPayload.sentiment
            },
            updated_at: new Date().toISOString()
          }).eq('id', qrCampaignId)
        } catch (_) {}
      }

      try {
        await supabase.from('customer_timeline_events').insert({
          customer_id: customerId,
          event_type: 'public_review_submitted',
          title: 'Bewertung über Slug-Seite gespeichert',
          description: `${reviewPayload.reviewer_name || reviewPayload.reviewer_email || 'Gast'} hat ${rating} Sterne über /l/${slug} abgegeben.`,
          source_module: 'qr_review',
          severity: rating <= 3 ? 'warning' : 'success',
          metadata: { review_id: data.id, qr_campaign_id: qrCampaignId, loyalty_program_id: loyaltyProgramId, slug }
        })
      } catch (_) {}

      let rotatedQr = null
      try { if (program && qrCampaign) rotatedQr = await rotateQrCampaignAfterSuccessfulScan({ customerId, slug, program, qrCampaign }) } catch (_) {}
      res.json({ ok: true, feedback: data, qr_campaign_id: qrCampaignId, loyalty_program_id: loyaltyProgramId, campaign_review_saved: Boolean(qrCampaignId), qr_rotation: rotatedQr })
    } catch (e) { next(e) }
  })

  router.get('/leads/:customer_id', async (req, res, next) => {
    try {
      const [publicLeads, pipelineLeads, qrCampaigns] = await Promise.all([
        supabase.from('v33_public_leads').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(200),
        supabase.from('pipeline_leads').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(200),
        supabase.from('qr_campaigns').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(200)
      ])

      if (publicLeads.error) throw publicLeads.error
      if (pipelineLeads.error) throw pipelineLeads.error
      if (qrCampaigns.error) throw qrCampaigns.error
      res.json({ ok: true, leads: publicLeads.data || [], pipeline_leads: pipelineLeads.data || [], qr_campaigns: qrCampaigns.data || [] })
    } catch (e) { next(e) }
  })


  router.post('/engine/:customer_id/recalculate', async (req, res, next) => {
    try {
      const snapshot = await engine.recalculateCustomer(req.params.customer_id)
      res.json({ ok: true, snapshot })
    } catch (e) { next(e) }
  })

  router.post('/engine/:customer_id/review', async (req, res, next) => {
    try {
      const rating = n(req.body?.rating, 0)
      const review = {
        customer_id: req.params.customer_id,
        rating,
        feedback_text: req.body?.feedback_text || req.body?.text || req.body?.comment || null,
        comment: req.body?.feedback_text || req.body?.text || req.body?.comment || null,
        reviewer_name: req.body?.reviewer_name || req.body?.name || 'Gast',
        reviewer_email: req.body?.reviewer_email || req.body?.email || null,
        source: 'v35_business_engine',
        status: rating <= 3 ? 'needs_followup' : 'new',
        sentiment: sentimentFromRating(rating),
        metadata: { v35_engine: true }
      }

      const inserted = await supabase.from('review_feedback').insert(review).select('*').single()
      if (inserted.error) throw inserted.error

      const engineResult = await engine.applyReview(req.params.customer_id, inserted.data)
      res.json({ ok: true, review: inserted.data, ...engineResult })
    } catch (e) { next(e) }
  })

  router.post('/engine/:customer_id/automation/run', async (req, res, next) => {
    try {
      const result = await engine.runAutomation(req.params.customer_id, req.body || {})
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  router.post('/engine/:customer_id/marketing/run', async (req, res, next) => {
    try {
      const result = await engine.runMarketingCampaign(req.params.customer_id, req.body || {})
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  router.post('/engine/:customer_id/billing/calculate', async (req, res, next) => {
    try {
      const result = await engine.calculateBilling(req.params.customer_id)
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  router.post('/engine/:customer_id/rewards/:reward_id/redeem', async (req, res, next) => {
    try {
      const limitCheck = await v39CheckRewardLimits(req.params.customer_id, req.params.reward_id, req.body?.member_name)
      if (!limitCheck.ok) return res.status(400).json(v39ErrorPayload(limitCheck.code, limitCheck.error, null, 'Prüfe Reward-Limits im Loyalty Programm.', limitCheck.warnings || []))
      const result = await engine.redeemReward(req.params.customer_id, req.params.reward_id, req.body?.staff_code, req.body?.member_name)
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })


  router.get('/v36/system-status', async (req, res, next) => {
    try {
      const tables = ['customers','qr_campaigns','loyalty_programs','loyalty_customers','loyalty_transactions','v33_public_leads','v33_functional_records','pipeline_leads','customer_timeline_events','review_feedback','v35_engine_runs']
      const checks = { backend: true, supabase: false, tables: {}, timestamp: new Date().toISOString() }
      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select('*').limit(1)
          checks.tables[table] = !error
        } catch (_) { checks.tables[table] = false }
      }
      checks.supabase = Object.values(checks.tables).some(Boolean)
      const ready = ['customers','qr_campaigns','loyalty_programs','v33_public_leads'].every(t => checks.tables[t])
      res.json({ ok: true, status: ready ? 'ready' : 'warning', checks })
    } catch (e) { next(e) }
  })

  router.get('/v36/:customer_id/qa-report', async (req, res, next) => {
    try {
      const cid = req.params.customer_id
      const [qr, programs, leads, members, records, timeline, runs] = await Promise.all([
        supabase.from('qr_campaigns').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100),
        supabase.from('loyalty_programs').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100),
        supabase.from('v33_public_leads').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100),
        supabase.from('loyalty_customers').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100),
        supabase.from('v33_functional_records').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(300),
        supabase.from('customer_timeline_events').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100),
        supabase.from('v35_engine_runs').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100)
      ])
      const report = {
        qr_campaigns: qr.data || [],
        loyalty_programs: programs.data || [],
        leads: leads.data || [],
        loyalty_members: members.data || [],
        functional_records: records.data || [],
        timeline_events: timeline.data || [],
        engine_runs: runs.data || [],
        counts: {
          qr_campaigns: (qr.data || []).length,
          loyalty_programs: (programs.data || []).length,
          leads: (leads.data || []).length,
          loyalty_members: (members.data || []).length,
          functional_records: (records.data || []).length,
          timeline_events: (timeline.data || []).length,
          engine_runs: (runs.data || []).length
        }
      }
      res.json({ ok: true, report })
    } catch (e) { next(e) }
  })

  router.post('/v36/:customer_id/worker/run', async (req, res, next) => {
    try {
      const cid = req.params.customer_id
      const automation = await engine.runAutomation(cid, { source: 'v36_worker' })
      const marketing = req.body?.run_marketing ? await engine.runMarketingCampaign(cid, { name: 'V36 Auto Booster', source: 'v36_worker' }) : null
      const billing = await engine.calculateBilling(cid)
      const snapshot = await engine.recalculateCustomer(cid)
      try {
        await supabase.from('v35_engine_runs').insert({ customer_id: cid, engine_key: 'v36_worker', status: 'completed', input: req.body || {}, output: { automation, marketing, billing, snapshot } })
      } catch (_) {}
      res.json({ ok: true, automation, marketing, billing, snapshot })
    } catch (e) { next(e) }
  })

  async function resetCustomerTestData(req, res, next) {
    try {
      const cid = req.params.customer_id
      try { await supabase.from('v33_public_leads').delete().eq('customer_id', cid) } catch (_) {}
      try { await supabase.from('loyalty_transactions').delete().eq('customer_id', cid) } catch (_) {}
      try { await supabase.from('loyalty_customers').delete().eq('customer_id', cid) } catch (_) {}
      try { await supabase.from('v33_functional_records').delete().eq('customer_id', cid) } catch (_) {}
      const provisioned = await provisionCustomer(cid, { title: 'V36 Reset QR/Loyalty' })
      const snapshot = await engine.recalculateCustomer(cid)
      try { await supabase.from('v35_engine_runs').insert({ customer_id: cid, engine_key: 'v36_reset_test_data', status: 'completed', input: {}, output: { provisioned, snapshot } }) } catch (_) {}
      res.json({ ok: true, provisioned, snapshot })
    } catch (e) { next(e) }
  }

  router.post('/v36/:customer_id/reset-test-data', resetCustomerTestData)


  async function v37GetOrCreateLoyaltySettings(customerId) {
    const customer = await getCustomer(customerId)
    const customerName = customer?.name || customer?.title || customer?.company || 'Kunde'

    const existing = await supabase
      .from('v37_loyalty_settings')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle()

    if (!existing.error && existing.data) return existing.data

    const defaults = {
      customer_id: customerId,
      brand_name: customerName,
      brand_font: 'Pacifico',
      brand_primary: '#d4af37',
      brand_secondary: '#111827',
      brand_accent: '#f8fafc',
      hero_headline: `Willkommen bei ${customerName}`,
      hero_subline: 'Sammle Punkte, sichere dir Rewards und werde VIP.',
      qr_style: 'luxury',
      qr_foreground: '#111827',
      qr_background: '#ffffff',
      qr_logo_text: customerName.slice(0, 2).toUpperCase(),
      daily_scan_limit: 1,
      weekly_scan_limit: 0,
      weekly_scan_limit_enabled: false,
      require_rescan_for_points: true,
      birthday_bonus_points: 100,
      referral_bonus_referrer: 100,
      referral_bonus_friend: 50,
      level_rules: [
        { tier: 'Basic', min_points: 0, multiplier: 1 },
        { tier: 'Silver', min_points: 250, multiplier: 1.1 },
        { tier: 'Gold', min_points: 500, multiplier: 1.25 },
        { tier: 'VIP', min_points: 1000, multiplier: 1.5 }
      ],
      active: true,
      metadata: { v37_defaults: true, require_rescan_for_points: true, rotate_qr_after_scan: false }
    }

    const created = await insertTableSchemaSafe('v37_loyalty_settings', defaults, { single: true })
    if (created.error) throw created.error
    return created.data
  }

  async function v37ApplyLevel(customerId, loyaltyCustomerId) {
    const settings = await v37GetOrCreateLoyaltySettings(customerId)
    const member = await supabase
      .from('loyalty_customers')
      .select('*')
      .eq('id', loyaltyCustomerId)
      .maybeSingle()

    if (member.error || !member.data) return null

    const points = Number(member.data.points_balance || member.data.total_points || 0)
    const rules = Array.isArray(settings.level_rules) ? settings.level_rules : []
    const sorted = rules.sort((a, b) => Number(a.min_points || 0) - Number(b.min_points || 0))
    let tier = sorted[0]?.tier || 'Basic'
    let multiplier = Number(sorted[0]?.multiplier || 1)

    for (const rule of sorted) {
      if (points >= Number(rule.min_points || 0)) {
        tier = rule.tier
        multiplier = Number(rule.multiplier || 1)
      }
    }

    await supabase.from('loyalty_customers').update({
      tier,
      metadata: {
        ...(member.data.metadata || {}),
        v37_level_multiplier: multiplier,
        v37_level_updated_at: new Date().toISOString()
      }
    }).eq('id', loyaltyCustomerId)

    return { tier, multiplier, points }
  }

  router.get('/v37/loyalty/:customer_id/settings', async (req, res, next) => {
    try {
      const settings = await v37GetOrCreateLoyaltySettings(req.params.customer_id)
      res.json({ ok: true, settings })
    } catch (e) { next(e) }
  })

  router.post('/v37/loyalty/:customer_id/settings', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      await v37GetOrCreateLoyaltySettings(customerId)

      const body = req.body || {}
      const patch = {
        brand_name: body.brand_name,
        brand_font: body.brand_font,
        brand_primary: body.brand_primary,
        brand_secondary: body.brand_secondary,
        brand_accent: body.brand_accent,
        hero_headline: body.hero_headline,
        hero_subline: body.hero_subline,
        qr_style: body.qr_style,
        qr_foreground: body.qr_foreground,
        qr_background: body.qr_background,
        qr_logo_text: body.qr_logo_text,
        daily_scan_limit: body.daily_scan_limit,
        weekly_scan_limit: body.weekly_scan_limit_enabled === true ? body.weekly_scan_limit : 0,
        weekly_scan_limit_enabled: body.weekly_scan_limit_enabled === true,
        metadata: { ...(body.metadata || {}), weekly_point_limit_per_member: Math.max(0, Math.floor(num(body.weekly_point_limit_per_member, body.metadata?.weekly_point_limit_per_member || 0))), weekly_scan_limit_enabled: body.weekly_scan_limit_enabled === true, require_rescan_for_points: body.require_rescan_for_points !== false, rotate_qr_after_scan: body.rotate_qr_after_scan === true },
        birthday_bonus_points: body.birthday_bonus_points,
        referral_bonus_referrer: body.referral_bonus_referrer,
        referral_bonus_friend: body.referral_bonus_friend,
        level_rules: body.level_rules,
        active: body.active !== false,
        updated_at: new Date().toISOString()
      }

      Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k])

      const updated = await updateTableSchemaSafe('v37_loyalty_settings', patch, (q) => q.eq('customer_id', customerId), { single: true })

      if (updated.error) throw updated.error

      await audit('v37_loyalty_settings_updated', { customer_id: customerId })
      res.json({ ok: true, settings: updated.data })
    } catch (e) { next(e) }
  })

  router.post('/v37/loyalty/:customer_id/rewards', async (req, res, next) => {
    try {
      const body = req.body || {}
      const payload = {
        id: body.id || safeToken('reward'),
        customer_id: req.params.customer_id,
        title: body.title || 'Neuer Reward',
        type: body.type || 'Rabatt',
        points: Number(body.points || 100),
        expires_at: body.expires_at || null,
        max_redemptions: Number(body.max_redemptions || 0),
        max_per_customer: Number(body.max_per_customer ?? body.max_redemptions_per_member ?? 0),
        daily_limit: Number(body.daily_limit || 0),
        weekly_limit: Number(body.weekly_limit || 0),
        active: body.active !== false,
        v37_rules: true
      }

      const record = await upsertRecord('loyalty_rewards', payload)
      await audit('v37_reward_saved', { customer_id: req.params.customer_id, reward_id: payload.id })
      res.json({ ok: true, reward: record })
    } catch (e) { next(e) }
  })

  router.post('/v37/loyalty/:customer_id/referral', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const settings = await v37GetOrCreateLoyaltySettings(customerId)
      const body = req.body || {}
      const referrerToken = body.referrer_token || body.referrer_member_token || null
      const friendEmail = clean(body.friend_email || body.email)
      const friendName = clean(body.friend_name || body.name) || 'Referral Lead'

      let referrer = null
      if (referrerToken) {
        const found = await supabase
          .from('loyalty_customers')
          .select('*')
          .eq('customer_id', customerId)
          .eq('member_token', referrerToken)
          .maybeSingle()
        if (!found.error) referrer = found.data || null
      }

      if (referrer) {
        await supabase.from('loyalty_customers').update({
          points_balance: Number(referrer.points_balance || 0) + Number(settings.referral_bonus_referrer || 0),
          total_points: Number(referrer.total_points || 0) + Number(settings.referral_bonus_referrer || 0),
          last_activity_at: new Date().toISOString()
        }).eq('id', referrer.id)
      }

      const lead = await supabase.from('v33_public_leads').insert({
        customer_id: customerId,
        name: friendName,
        email: friendEmail,
        source: 'loyalty_referral',
        status: 'new',
        points_added: Number(settings.referral_bonus_friend || 0),
        points_balance: Number(settings.referral_bonus_friend || 0),
        metadata: {
          referrer_member_token: referrerToken,
          referrer_bonus: Number(settings.referral_bonus_referrer || 0),
          friend_bonus: Number(settings.referral_bonus_friend || 0)
        }
      }).select('*').single()

      if (lead.error) throw lead.error

      await supabase.from('customer_timeline_events').insert({
        customer_id: customerId,
        event_type: 'loyalty_referral_created',
        title: 'Referral Lead erzeugt',
        description: `${friendName} wurde über das Loyalty Referral Programm empfohlen.`,
        source_module: 'loyalty',
        severity: 'success',
        metadata: { lead: lead.data, referrer_member_token: referrerToken }
      })

      const snapshot = await engine.recalculateCustomer(customerId)
      res.json({ ok: true, lead: lead.data, referrer_updated: Boolean(referrer), snapshot })
    } catch (e) { next(e) }
  })

  router.post('/v37/loyalty/:customer_id/birthday-bonus', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const settings = await v37GetOrCreateLoyaltySettings(customerId)
      const body = req.body || {}
      const memberToken = body.member_token
      const email = clean(body.email)?.toLowerCase()

      let q = supabase.from('loyalty_customers').select('*').eq('customer_id', customerId).limit(1)
      if (memberToken) q = q.eq('member_token', memberToken)
      else if (email) q = q.eq('email', email)
      else return res.status(400).json({ ok: false, error: 'member_token oder email fehlt' })

      const found = await q.maybeSingle()
      if (found.error) throw found.error
      if (!found.data) return res.status(404).json({ ok: false, error: 'Loyalty Member nicht gefunden' })

      const bonus = Number(settings.birthday_bonus_points || 0)
      const member = found.data
      const updated = await supabase.from('loyalty_customers').update({
        birthday: body.birthday || member.birthday || null,
        points_balance: Number(member.points_balance || 0) + bonus,
        total_points: Number(member.total_points || 0) + bonus,
        last_activity_at: new Date().toISOString(),
        metadata: { ...(member.metadata || {}), birthday_bonus_last_applied_at: new Date().toISOString() }
      }).eq('id', member.id).select('*').single()

      if (updated.error) throw updated.error

      await supabase.from('loyalty_transactions').insert({
        customer_id: customerId,
        loyalty_customer_id: member.id,
        loyalty_program_id: member.loyalty_program_id || null,
        action: 'birthday_bonus',
        points: bonus,
        description: 'Geburtstagsbonus',
        metadata: { v37_birthday_bonus: true }
      })

      const level = await v37ApplyLevel(customerId, member.id)
      const snapshot = await engine.recalculateCustomer(customerId)
      res.json({ ok: true, member: updated.data, level, snapshot })
    } catch (e) { next(e) }
  })


  async function v38Signals(customerId) {
    const [customer, qr, programs, leads, members, tx, reviews, tickets, records, timeline, pipeline, runs] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
      supabase.from('qr_campaigns').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('loyalty_programs').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('v33_public_leads').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('loyalty_customers').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('loyalty_transactions').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(250),
      supabase.from('review_feedback').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('tickets').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(500),
      supabase.from('customer_timeline_events').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('pipeline_leads').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('v35_engine_runs').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(100)
    ])
    const safe = r => r.error ? [] : (r.data || [])
    return { customer: customer.data || null, qr_campaigns:safe(qr), loyalty_programs:safe(programs), leads:safe(leads), loyalty_members:safe(members), loyalty_transactions:safe(tx), reviews:safe(reviews), tickets:safe(tickets), functional_records:safe(records), timeline_events:safe(timeline), pipeline_leads:safe(pipeline), engine_runs:safe(runs) }
  }

  function v38Counts(s) {
    return {
      qrScans: (s.qr_campaigns || []).reduce((a,x)=>a+Number(x.scans||0),0),
      leads: (s.leads || []).length,
      members: (s.loyalty_members || []).length,
      rewards: (s.loyalty_transactions || []).filter(x => String(x.action||'').includes('reward') || String(x.action||'').includes('redeem')).length,
      reviews: (s.reviews || []).length,
      negativeReviews: (s.reviews || []).filter(x => Number(x.rating||0) <= 2 || String(x.sentiment||'').toLowerCase().includes('negative')).length,
      openTickets: (s.tickets || []).filter(x => !['closed','done','resolved','erledigt'].includes(String(x.status||'').toLowerCase())).length,
      pipelineValue: (s.pipeline_leads || []).reduce((a,x)=>a+Number(x.value||0),0),
      engineRuns: (s.engine_runs || []).length
    }
  }

  router.get('/v38/:customer_id/customer-360', async (req, res, next) => {
    try {
      const signals = await v38Signals(req.params.customer_id)
      const counts = v38Counts(signals)
      const snapshot = await engine.recalculateCustomer(req.params.customer_id)
      const ai_explanations = [
        { title: snapshot.upsell >= 75 ? 'Premium Add-on empfehlen' : 'Loyalty weiter aktivieren', severity: snapshot.upsell >= 75 ? 'success' : 'info', reason: [`${counts.qrScans} QR-Scans`, `${counts.leads} Leads`, `${counts.members} Loyalty Members`, `Upsell ${snapshot.upsell}`] },
        { title: snapshot.risk >= 60 ? 'Retention prüfen' : 'Kunde stabil', severity: snapshot.risk >= 60 ? 'warn' : 'success', reason: [`${counts.negativeReviews} negative Reviews`, `${counts.openTickets} offene Tickets`, `Health ${snapshot.health}`] }
      ]
      res.json({ ok:true, signals, counts, snapshot, ai_explanations })
    } catch(e) { next(e) }
  })

  router.post('/v38/:customer_id/simulate-scan', async (req, res, next) => {
    try {
      const cid = req.params.customer_id
      let program = null
      const found = await supabase.from('loyalty_programs').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(1)
      if (!found.error && found.data?.[0]) program = found.data[0]
      if (!program) program = (await provisionCustomer(cid, { title:'V38 Testscan QR' })).loyalty_program
      const points = Number(program.points_per_scan || 10)
      const email = req.body?.email || `testscan-${Date.now()}@example.invalid`
      const name = req.body?.name || 'V38 Testlead'
      const now = new Date().toISOString()
      const member = await supabase.from('loyalty_customers').insert({ customer_id:cid, loyalty_program_id:program.id, email, display_name:name, member_token:safeToken('v38'), points_balance:points, total_points:points, total_scans:1, last_seen_at:now, last_activity_at:now, metadata:{v38_simulated:true} }).select('*').single()
      if (member.error) throw member.error
      await supabase.from('loyalty_transactions').insert({ customer_id:cid, loyalty_program_id:program.id, loyalty_customer_id:member.data.id, qr_campaign_id:program.qr_campaign_id || null, action:'qr_scan', points, description:'V38 Testscan', metadata:{v38_simulated:true} })
      if (program.qr_campaign_id) {
        const currentQr = await supabase.from('qr_campaigns').select('scans,conversions').eq('id', program.qr_campaign_id).maybeSingle()
        if (!currentQr.error && currentQr.data) await supabase.from('qr_campaigns').update({ scans:Number(currentQr.data.scans||0)+1, conversions:Number(currentQr.data.conversions||0)+1, updated_at:now }).eq('id', program.qr_campaign_id)
      }
      const lead = await supabase.from('v33_public_leads').insert({ customer_id:cid, loyalty_program_id:program.id, loyalty_customer_id:member.data.id, qr_campaign_id:program.qr_campaign_id || null, slug:program.slug, name, email, source:'v38_testscan', status:'new', points_added:points, points_balance:points, metadata:{v38_simulated:true} }).select('*').single()
      try { await supabase.from('pipeline_leads').insert({ customer_id:cid, title:`V38 Testscan Lead – ${name}`, source:'v38_testscan', stage:'new', value:0, probability:20, metadata:{lead:lead.data} }) } catch(_) {}
      try { await supabase.from('customer_timeline_events').insert({ customer_id:cid, event_type:'v38_testscan', title:'Testscan simuliert', description:`${name} wurde als Testscan-Lead erzeugt.`, source_module:'v38', severity:'success', metadata:{lead:lead.data} }) } catch(_) {}
      const snapshot = await engine.recalculateCustomer(cid)
      res.json({ ok:true, simulated:true, member:member.data, lead:lead.data, snapshot })
    } catch(e) { next(e) }
  })

  router.get('/v38/:customer_id/reward-history', async (req, res, next) => {
    try {
      const cid = req.params.customer_id
      const [tx, records] = await Promise.all([
        supabase.from('loyalty_transactions').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(250),
        supabase.from('v33_functional_records').select('*').eq('customer_id', cid).in('resource', ['redemptions','loyalty_rewards']).order('created_at', { ascending:false }).limit(250)
      ])
      if (tx.error) throw tx.error
      if (records.error) throw records.error
      const rewards = (records.data || []).filter(r => r.resource === 'loyalty_rewards').map(r => {
        const p = r.payload || {}
        return { id:r.local_id || r.id, title:p.title || r.title, expires_at:p.expires_at || null, max_redemptions:Number(p.max_redemptions||0), daily_limit:Number(p.daily_limit||0), weekly_limit:Number(p.weekly_limit||0), total_used:(records.data || []).filter(x => x.resource === 'redemptions' && String(x.payload?.reward_id||'') === String(p.id || r.local_id)).length, status:p.expires_at && new Date(p.expires_at) < new Date() ? 'expired' : 'active' }
      })
      const history = [...(tx.data || []), ...(records.data || []).filter(r=>r.resource==='redemptions')]
      res.json({ ok:true, rewards, history })
    } catch(e) { next(e) }
  })

  router.post('/v38/:customer_id/review-loyalty-action', async (req, res, next) => {
    try {
      const cid=req.params.customer_id
      const rating=Number(req.body?.rating||5)
      const text=req.body?.text||req.body?.comment||'Review ohne Text'
      const name=req.body?.name||'Review Gast'
      const email=req.body?.email||null
      const result=await engine.applyReview(cid,{rating,reviewer_name:name,reviewer_email:email,feedback_text:text,comment:text})
      let bonus=null
      if(rating>=4 && email){
        const member=await supabase.from('loyalty_customers').select('*').eq('customer_id',cid).eq('email',email).maybeSingle()
        if(!member.error && member.data){
          bonus=await supabase.from('loyalty_transactions').insert({customer_id:cid,loyalty_customer_id:member.data.id,loyalty_program_id:member.data.loyalty_program_id||null,action:'review_bonus',points:50,description:'Review Bonus',metadata:{v38:true}}).select('*').single()
          await supabase.from('loyalty_customers').update({points_balance:Number(member.data.points_balance||0)+50,total_points:Number(member.data.total_points||0)+50,total_reviews:Number(member.data.total_reviews||0)+1,last_activity_at:new Date().toISOString()}).eq('id',member.data.id)
        }
      }
      if(rating===3) await upsertRecord('marketing_campaigns',{id:`neutral_review_followup_${Date.now()}`,customer_id:cid,name:'Neutrale Review Follow-up Kampagne',audience:'Neutrale Reviews',reward:'Wiedergutmachungs-Reward',status:'Bereit',active:true})
      const snapshot=await engine.recalculateCustomer(cid)
      res.json({ok:true,result,bonus:bonus?.data||null,snapshot})
    } catch(e) { next(e) }
  })

  router.get('/v38/:customer_id/billing-revenue', async (req,res,next)=>{
    try{
      const billing=await engine.calculateBilling(req.params.customer_id)
      const snapshot=await engine.recalculateCustomer(req.params.customer_id)
      const records=await supabase.from('v33_functional_records').select('*').eq('customer_id',req.params.customer_id).in('resource',['dynamic_billing_usage','revenue_forecasts','revenue_shares','package_recommendations']).order('updated_at',{ascending:false}).limit(100)
      if(records.error) throw records.error
      res.json({ok:true,billing,snapshot,records:records.data||[]})
    }catch(e){next(e)}
  })

  router.post('/v38/:customer_id/reset/:scope', async (req,res,next)=>{
    try{
      const cid=req.params.customer_id
      const scope=req.params.scope
      const groups={loyalty:['public_landing_pages','loyalty_programs','loyalty_rewards','loyalty_reward_rules','staff_codes','loyalty_segments','loyalty_members','redemptions'],reviews:['reviews','review_intelligence','review_response_templates'],automation:['smart_automations','marketing_campaigns','marketing_runs','assistant_messages'],billing:['dynamic_billing_usage','revenue_forecasts','revenue_shares','package_recommendations','package_matrix']}
      if(scope==='leads'||scope==='all'){try{await supabase.from('v33_public_leads').delete().eq('customer_id',cid)}catch(_){} try{await supabase.from('pipeline_leads').delete().eq('customer_id',cid)}catch(_){}}
      if(scope==='loyalty'||scope==='all'){try{await supabase.from('loyalty_transactions').delete().eq('customer_id',cid)}catch(_){} try{await supabase.from('loyalty_customers').delete().eq('customer_id',cid)}catch(_){}}
      if(scope==='reviews'||scope==='all') try{await supabase.from('review_feedback').delete().eq('customer_id',cid)}catch(_){}
      if(scope==='all') await supabase.from('v33_functional_records').delete().eq('customer_id',cid)
      else if(groups[scope]) await supabase.from('v33_functional_records').delete().eq('customer_id',cid).in('resource',groups[scope])
      const snapshot=await engine.recalculateCustomer(cid)
      res.json({ok:true,scope,snapshot})
    }catch(e){next(e)}
  })

  router.get('/v38/:customer_id/qa-checklist', async (req,res,next)=>{
    try{
      const s=await v38Signals(req.params.customer_id)
      const c=v38Counts(s)
      const qr=s.qr_campaigns[0], program=s.loyalty_programs[0]
      const checklist=[
        {key:'backend',label:'Backend erreichbar',ok:true},
        {key:'customer',label:'Kunde vorhanden',ok:Boolean(s.customer)},
        {key:'qr',label:'QR-Kampagne vorhanden',ok:Boolean(qr)},
        {key:'loyalty',label:'Loyalty-Programm vorhanden',ok:Boolean(program)},
        {key:'landing',label:'Landingpage Link vorhanden',ok:Boolean(qr?.slug||program?.slug),url:qr?.slug?`/l/${qr.slug}`:program?.slug?`/l/${program.slug}`:null},
        {key:'lead',label:'Mindestens ein Lead vorhanden',ok:c.leads>0},
        {key:'member',label:'Mindestens ein Loyalty Member vorhanden',ok:c.members>0},
        {key:'engine',label:'Engine mindestens einmal gelaufen',ok:c.engineRuns>0},
        {key:'timeline',label:'Timeline Events vorhanden',ok:(s.timeline_events||[]).length>0}
      ]
      res.json({ok:true,ready:checklist.every(x=>x.ok),checklist})
    }catch(e){next(e)}
  })


  router.get('/v39/schema-health', async (req, res, next) => {
    try {
      const required = {
        customers: ['id'],
        qr_campaigns: ['id','customer_id','slug','target_url','scans','conversions','active','metadata'],
        loyalty_programs: ['id','customer_id','slug','qr_campaign_id','points_per_scan','active','metadata'],
        loyalty_customers: ['id','customer_id','loyalty_program_id','email','member_token','points_balance','total_points','total_scans','metadata'],
        loyalty_transactions: ['id','customer_id','loyalty_program_id','loyalty_customer_id','action','points','metadata'],
        v33_public_leads: ['id','customer_id','slug','email','source','status','metadata'],
        v33_functional_records: ['id','customer_id','resource','local_id','payload'],
        pipeline_leads: ['id','customer_id','title','source','stage','value','probability','metadata'],
        customer_timeline_events: ['id','customer_id','event_type','title','source_module','severity','metadata'],
        review_feedback: ['id','customer_id','rating','sentiment','metadata'],
        v35_engine_runs: ['id','customer_id','engine_key','status','input','output'],
        v37_loyalty_settings: ['id','customer_id','brand_name','level_rules']
      }

      const results = {}
      for (const [table, columns] of Object.entries(required)) {
        const tableResult = { exists: false, columns: {}, ok: false, hint: null }
        try {
          const { data, error } = await supabase.from(table).select(columns.join(',')).limit(1)
          if (!error) {
            tableResult.exists = true
            columns.forEach(c => tableResult.columns[c] = true)
            tableResult.ok = true
          } else {
            tableResult.hint = error.message
            // Fallback: check table existence with wildcard select
            const fallback = await supabase.from(table).select('*').limit(1)
            tableResult.exists = !fallback.error
            if (fallback.error) tableResult.hint = fallback.error.message
          }
        } catch (e) {
          tableResult.hint = e.message
        }
        results[table] = tableResult
      }

      const missing = Object.entries(results).filter(([_, v]) => !v.ok).map(([k, v]) => ({ table: k, hint: v.hint }))
      res.json({
        ok: true,
        ready: missing.length === 0,
        migration_hint: missing.length ? 'Führe 0050_full_schema_stabilizer.sql aus.' : 'Schema bereit.',
        results,
        missing
      })
    } catch (e) { next(e) }
  })

  router.post('/v39/:customer_id/provision-safe', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const existingPrograms = await supabase.from('loyalty_programs').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1)
      const existingQr = await supabase.from('qr_campaigns').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1)

      if (!existingPrograms.error && existingPrograms.data?.[0] && !existingQr.error && existingQr.data?.[0]) {
        return res.json({
          ok: true,
          reused: true,
          customer: await getCustomer(customerId),
          loyalty_program: existingPrograms.data[0],
          qr_campaign: existingQr.data[0],
          public_url_path: `/q/${existingQr.data[0].slug || existingPrograms.data[0].slug}`, landing_url_path: `/l/${existingQr.data[0].slug || existingPrograms.data[0].slug}`
        })
      }

      const provisioned = await provisionCustomer(customerId, req.body || {})
      res.json({ ok: true, reused: false, ...provisioned })
    } catch (e) { next(e) }
  })


  router.get('/v40/:customer_id/contract-tests', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const tests = []

      async function test(name, fn, hint) {
        const started = Date.now()
        try {
          const result = await fn()
          tests.push({ name, ok: true, duration_ms: Date.now() - started, result: result || null, hint: null })
        } catch (e) {
          tests.push({ name, ok: false, duration_ms: Date.now() - started, error: e.message, hint })
        }
      }

      await test('schema: customers', async () => {
        const r = await supabase.from('customers').select('id,name').eq('id', customerId).limit(1)
        if (r.error) throw r.error
        return { rows: (r.data || []).length }
      }, 'Führe 0050_full_schema_stabilizer.sql aus.')

      await test('schema: qr_campaigns', async () => {
        const r = await supabase.from('qr_campaigns').select('id,customer_id,slug,target_url,scans,conversions').eq('customer_id', customerId).limit(5)
        if (r.error) throw r.error
        return { rows: (r.data || []).length }
      }, 'Prüfe qr_campaigns Spalten oder führe 0050 aus.')

      await test('schema: loyalty_programs', async () => {
        const r = await supabase.from('loyalty_programs').select('id,customer_id,slug,points_per_scan,qr_campaign_id').eq('customer_id', customerId).limit(5)
        if (r.error) throw r.error
        return { rows: (r.data || []).length }
      }, 'Prüfe loyalty_programs Spalten oder führe 0050 aus.')

      await test('endpoint-ready: customer360 signals', async () => {
        const signals = await v38Signals(customerId)
        const counts = v38Counts(signals)
        return counts
      }, 'Prüfe V38 Routes und Engine Service.')

      await test('engine: recalculate', async () => {
        const snapshot = await engine.recalculateCustomer(customerId)
        return { health: snapshot.health, risk: snapshot.risk, upsell: snapshot.upsell, forecast: snapshot.forecast }
      }, 'Prüfe v35BusinessEngine.js und Tabellen v33_functional_records/v35_engine_runs.')

      await test('qa: checklist', async () => {
        const signals = await v38Signals(customerId)
        const counts = v38Counts(signals)
        const qr = signals.qr_campaigns[0]
        const program = signals.loyalty_programs[0]
        return {
          customer: Boolean(signals.customer),
          qr: Boolean(qr),
          loyalty: Boolean(program),
          landing: Boolean(qr?.slug || program?.slug),
          leads: counts.leads,
          members: counts.members
        }
      }, 'Provisioniere den Kunden oder simuliere einen Testscan.')

      await test('public: link health', async () => {
        const q = await supabase.from('qr_campaigns').select('id,slug,target_url,active').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (q.error) throw q.error
        if (!q.data?.slug) throw new Error('Kein öffentlicher QR/Landingpage Slug vorhanden.')
        return { slug: q.data.slug, target_url: q.data.target_url || `/q/${q.data.slug}`, active: q.data.active !== false }
      }, 'Klicke Safe Provisioning oder QR/Loyalty vorbereiten.')

      const passed = tests.filter(t => t.ok).length
      const failed = tests.length - passed

      try {
        await supabase.from('v35_engine_runs').insert({
          customer_id: customerId,
          engine_key: 'v40_contract_tests',
          status: failed ? 'warning' : 'completed',
          input: {},
          output: { passed, failed, tests }
        })
      } catch (_) {}

      res.json({ ok: true, passed, failed, ready: failed === 0, tests })
    } catch (e) { next(e) }
  })

  router.get('/v40/:customer_id/audit-log', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const [audit, runs, events] = await Promise.all([
        supabase.from('security_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('v35_engine_runs').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(50),
        supabase.from('customer_timeline_events').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(50)
      ])

      res.json({
        ok: true,
        audit: audit.error ? [] : (audit.data || []),
        engine_runs: runs.error ? [] : (runs.data || []),
        timeline_events: events.error ? [] : (events.data || [])
      })
    } catch (e) { next(e) }
  })

  router.get('/v40/:customer_id/public-link-health', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const q = await supabase.from('qr_campaigns')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (q.error) throw q.error
      if (!q.data?.slug) {
        return res.status(404).json(v39ErrorPayload('PUBLIC_LINK_MISSING', 'Kein Public-Link vorhanden.', null, 'Klicke Safe Provisioning oder Kunden für QR/Loyalty vorbereiten.'))
      }

      const program = await supabase.from('loyalty_programs')
        .select('*')
        .eq('customer_id', customerId)
        .eq('slug', q.data.slug)
        .maybeSingle()

      const warnings = []
      if (program.error || !program.data) warnings.push({ code: 'LOYALTY_PROGRAM_NOT_MATCHING_SLUG', message: 'QR Slug hat kein passendes Loyalty Programm.' })
      if (q.data.active === false) warnings.push({ code: 'QR_INACTIVE', message: 'QR Kampagne ist inaktiv.' })

      res.json({
        ok: true,
        ready: warnings.length === 0,
        slug: q.data.slug,
        public_url_path: `/q/${q.data.slug}`,
        landing_url_path: `/l/${q.data.slug}`,
        target_url: q.data.target_url || `/q/${q.data.slug}`,
        qr_campaign: q.data,
        loyalty_program: program.data || null,
        warnings
      })
    } catch (e) { next(e) }
  })

  router.post('/v42/qr-campaigns/:id/final-slug-settings', async (req, res, next) => {
    try {
      const id = String(req.params.id || '').trim()
      const body = req.body || {}
      if (!id) return res.status(400).json({ ok:false, error:'QR-Kampagnen-ID fehlt.' })

      const found = await supabase.from('qr_campaigns').select('*').eq('id', id).maybeSingle()
      if (found.error) throw found.error
      const current = found.data
      if (!current) return res.status(404).json({ ok:false, error:'QR-Kampagne wurde nicht gefunden.' })

      const toInt = (value, fallback = 0, max = null) => {
        let n = Math.max(0, Math.floor(num(value, fallback)))
        if (max !== null) n = Math.min(max, n)
        return n
      }
      const title = clean(body.title || body.name || current.title || current.name || 'QR Kampagne')
      const headline = clean(body.headline || body.hero_headline || current.headline || current.metadata?.hero_headline || 'Willkommen im Bonusclub')
      const mode = clean(body.mode || body.purpose || current.mode || current.purpose || current.metadata?.purpose || 'loyalty')
      const slugValue = clean(body.slug || current.slug)
      const metadata = {
        ...(current.metadata || {}),
        purpose: mode,
        hero_headline: headline,
        hero_subline: body.subline ?? body.hero_subline ?? current.metadata?.hero_subline ?? '',
        cta_label: body.cta_label ?? current.metadata?.cta_label ?? 'Punkte sammeln',
        review_cta_label: body.review_cta_label ?? current.metadata?.review_cta_label ?? 'Bewertung absenden',
        success_title: body.success_title ?? current.metadata?.success_title ?? 'Deine Punkte wurden gespeichert.',
        success_message: body.success_message ?? current.metadata?.success_message ?? 'Danke für deine Teilnahme. Deine Vorteile werden direkt deinem Bonuskonto zugeordnet.',
        fineprint: body.fineprint ?? current.metadata?.fineprint ?? 'Mit dem Absenden nimmst du am digitalen Bonusprogramm teil.',
        points_per_scan: toInt(body.points_per_scan ?? current.points_per_scan ?? current.metadata?.points_per_scan ?? 10),
        max_scans_per_member: toInt(body.max_scans_per_member ?? current.max_scans_per_member ?? current.metadata?.max_scans_per_member ?? 0),
        daily_scan_limit_per_member: toInt(body.daily_scan_limit_per_member ?? current.metadata?.daily_scan_limit_per_member ?? current.metadata?.daily_scan_limit ?? 0),
        scan_cooldown_minutes: toInt(body.scan_cooldown_minutes ?? current.scan_cooldown_minutes ?? current.metadata?.scan_cooldown_minutes ?? 0),
        daily_point_limit_per_member: toInt(body.daily_point_limit_per_member ?? current.daily_point_limit_per_member ?? current.metadata?.daily_point_limit_per_member ?? 0),
        suspicion_score_threshold: toInt(body.suspicion_score_threshold ?? current.suspicion_score_threshold ?? current.metadata?.suspicion_score_threshold ?? 70, 70, 100),
        require_rescan_for_points: body.require_rescan_for_points === undefined ? (current.metadata?.require_rescan_for_points !== false && toInt(body.points_per_scan ?? current.points_per_scan ?? current.metadata?.points_per_scan ?? 10) > 0 && mode !== 'review') : body.require_rescan_for_points !== false,
        rotate_qr_after_scan: body.rotate_qr_after_scan === undefined ? current.metadata?.rotate_qr_after_scan === true : body.rotate_qr_after_scan === true,
        qr_scan_url: slugValue ? `/q/${slugValue}` : current.metadata?.qr_scan_url,
        landing_url: slugValue ? `/l/${slugValue}` : current.metadata?.landing_url,
        final_slug_rules_source: 'qr_campaigns',
        final_slug_rules_updated_at: new Date().toISOString()
      }

      const fullPatch = {
        title,
        name: title,
        headline,
        mode,
        purpose: mode,
        points_per_scan: metadata.points_per_scan,
        max_scans_per_member: metadata.max_scans_per_member,
        daily_scan_limit_per_member: metadata.daily_scan_limit_per_member,
        scan_cooldown_minutes: metadata.scan_cooldown_minutes,
        daily_point_limit_per_member: metadata.daily_point_limit_per_member,
        suspicion_score_threshold: metadata.suspicion_score_threshold,
        metadata,
        public_url: slugValue ? `/q/${slugValue}` : current.public_url,
        target_url: slugValue ? `/q/${slugValue}` : current.target_url,
        active: body.active === undefined ? current.active !== false : body.active !== false,
        updated_at: new Date().toISOString()
      }
      const safePatch = {
        title: fullPatch.title,
        name: fullPatch.name,
        headline: fullPatch.headline,
        mode: fullPatch.mode,
        metadata: fullPatch.metadata,
        active: fullPatch.active,
        updated_at: fullPatch.updated_at
      }

      let saved = await supabase.from('qr_campaigns').update(fullPatch).eq('id', id).select('*').single()
      if (saved.error) saved = await supabase.from('qr_campaigns').update(safePatch).eq('id', id).select('*').single()
      if (saved.error) throw saved.error

      let program = null
      try {
        const programLookup = await supabase.from('loyalty_programs')
          .select('*')
          .or(`qr_campaign_id.eq.${id},slug.eq.${slugValue}`)
          .eq('customer_id', current.customer_id)
          .limit(1)
          .maybeSingle()
        program = programLookup.error ? null : programLookup.data
        if (program?.id) {
          const programMetadata = { ...(program.metadata || {}), purpose: mode, linked_qr_final_rules: metadata }
          const programPatch = {
            points_per_scan: metadata.points_per_scan,
            daily_scan_limit_per_member: metadata.daily_scan_limit_per_member,
            daily_point_limit_per_member: metadata.daily_point_limit_per_member,
            suspicion_score_threshold: metadata.suspicion_score_threshold,
            metadata: programMetadata,
            active: fullPatch.active,
            updated_at: fullPatch.updated_at
          }
          const programSafePatch = { metadata: programMetadata, active: fullPatch.active, updated_at: fullPatch.updated_at }
          let programSaved = await supabase.from('loyalty_programs').update(programPatch).eq('id', program.id).select('*').single()
          if (programSaved.error) programSaved = await supabase.from('loyalty_programs').update(programSafePatch).eq('id', program.id).select('*').single()
          if (!programSaved.error) program = programSaved.data
        }
      } catch (_) {}

      try { await audit('v42_final_slug_rules_updated', { customer_id: current.customer_id, qr_campaign_id: id, slug: slugValue, scan_limits: qrScanLimitSettings(saved.data, program) }) } catch (_) {}
      res.json({ ok:true, qr_campaign: saved.data, loyalty_program: program, scan_limits: qrScanLimitSettings(saved.data, program), message:'Finale Slug-Seiten-Regeln gespeichert.' })
    } catch (e) { next(e) }
  })


  function v41MonthLabel(offset = 0) {
    const d = new Date()
    d.setMonth(d.getMonth() + offset)
    return d.toLocaleString('de-DE', { month: 'short', year: '2-digit' })
  }

  router.get('/v41/:customer_id/deep-modules', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const signals = await v38Signals(customerId)
      const counts = v38Counts(signals)
      const snapshot = await engine.recalculateCustomer(customerId)
      const customer = signals.customer || {}
      const mrr = Number(customer.monthly_price || customer.amount || 299)
      const pipelineValue = counts.pipelineValue || 0
      const qrScans = counts.qrScans || 0
      const leads = counts.leads || 0
      const members = counts.members || 0
      const reviews = counts.reviews || 0
      const negativeReviews = counts.negativeReviews || 0
      const usage = Number(snapshot.usage_total || 0)

      const forecastSeries = [0,1,2,3,4,5].map((i) => {
        const growthFactor = 1 + (Math.min(0.22, (qrScans + leads * 4 + members) / 1000) * i)
        const expected = Math.round((mrr * growthFactor + pipelineValue * (0.08 + i * 0.035) + usage * (1 + i * 0.08)) * 100) / 100
        const conservative = Math.round(expected * 0.78 * 100) / 100
        const optimistic = Math.round(expected * 1.22 * 100) / 100
        return {
          month: v41MonthLabel(i),
          expected,
          conservative,
          optimistic,
          confidence: Math.max(45, Math.min(95, Number(snapshot.success || 70) - i * 3))
        }
      })

      const revenueShareItems = [
        { label: 'Basispaket / MRR', base: mrr, percent: 15, amount: Math.round(mrr * 0.15 * 100) / 100 },
        { label: 'Usage Add-ons', base: usage, percent: 20, amount: Math.round(usage * 0.20 * 100) / 100 },
        { label: 'Pipeline Potenzial', base: pipelineValue, percent: 8, amount: Math.round(pipelineValue * 0.08 * 100) / 100 }
      ]

      const packages = [
        {
          key: 'starter',
          name: 'Starter',
          price: 199,
          tools: ['QR Kampagnen', 'Landingpage', 'Basic Loyalty'],
          fit_score: Math.max(25, Math.min(75, 100 - Number(snapshot.upsell || 0))),
          recommended: false
        },
        {
          key: 'growth',
          name: 'Growth',
          price: 499,
          tools: ['QR + Loyalty', 'Reviews', 'Automation', 'CRM 360'],
          fit_score: Math.max(55, Math.min(92, Number(snapshot.success || 70))),
          recommended: Number(snapshot.upsell || 0) < 80
        },
        {
          key: 'premium',
          name: 'Premium',
          price: 899,
          tools: ['AI Assistant', 'Revenue Hub', 'Advanced Automation', 'Priority Support'],
          fit_score: Math.max(60, Math.min(98, Number(snapshot.upsell || 0) + 8)),
          recommended: Number(snapshot.upsell || 0) >= 80
        }
      ]

      const intelligenceDrivers = [
        { label: 'QR Aktivität', value: qrScans, impact: qrScans > 50 ? 'hoch' : qrScans > 10 ? 'mittel' : 'niedrig', explanation: 'Viele QR-Scans erhöhen Lead- und Upsell-Potenzial.' },
        { label: 'Lead-Aufkommen', value: leads, impact: leads > 10 ? 'hoch' : leads > 2 ? 'mittel' : 'niedrig', explanation: 'Neue Leads zeigen aktive Kampagnenwirkung.' },
        { label: 'Loyalty Members', value: members, impact: members > 25 ? 'hoch' : members > 5 ? 'mittel' : 'niedrig', explanation: 'Mehr Members machen Marketing-Automation wertvoller.' },
        { label: 'Review Risiko', value: negativeReviews, impact: negativeReviews > 2 ? 'hoch' : negativeReviews > 0 ? 'mittel' : 'niedrig', explanation: 'Negative Reviews senken Health und erhöhen Retention-Bedarf.' },
        { label: 'Pipeline Value', value: pipelineValue, impact: pipelineValue > 1000 ? 'hoch' : pipelineValue > 0 ? 'mittel' : 'niedrig', explanation: 'Pipeline deutet auf Umsatzpotenzial hin.' }
      ]

      const marketingCalendar = [
        { date_offset: 0, type: 'loyalty', title: 'Reward-bereite Kunden aktivieren', audience: 'Reward-bereit', status: 'bereit', expected_reach: Math.max(3, members) },
        { date_offset: 3, type: 'review', title: 'Positive Reviews pushen', audience: 'Aktive Gäste', status: 'geplant', expected_reach: Math.max(2, Math.round((reviews + members) / 2)) },
        { date_offset: 7, type: 'referral', title: 'Empfehlungsbonus bewerben', audience: 'VIP / Gold Kunden', status: 'geplant', expected_reach: Math.max(1, Math.round(members * 0.25)) },
        { date_offset: 14, type: 'reactivation', title: 'Inaktive Endkunden zurückholen', audience: 'Inaktive Kunden', status: 'idee', expected_reach: Math.max(1, Math.round(members * 0.15)) }
      ].map((item) => {
        const d = new Date()
        d.setDate(d.getDate() + item.date_offset)
        return { ...item, date: d.toISOString().slice(0, 10) }
      })

      const aiInsights = [
        {
          role: 'assistant',
          title: Number(snapshot.upsell || 0) >= 80 ? 'Premium Upgrade ist plausibel' : 'Growth-Paket weiter ausbauen',
          message: `Aktuelle Signale: ${qrScans} QR-Scans, ${leads} Leads, ${members} Loyalty Members. Upsell Score: ${snapshot.upsell}.`,
          reasons: [`QR Scans: ${qrScans}`, `Leads: ${leads}`, `Members: ${members}`, `Upsell: ${snapshot.upsell}`],
          action: Number(snapshot.upsell || 0) >= 80 ? 'Premium Add-on anbieten' : 'Loyalty Kampagne stärken'
        },
        {
          role: 'assistant',
          title: Number(snapshot.risk || 0) >= 60 ? 'Retention-Maßnahme empfohlen' : 'Kunde wirkt stabil',
          message: `Health ${snapshot.health}, Risk ${snapshot.risk}, negative Reviews ${negativeReviews}.`,
          reasons: [`Health: ${snapshot.health}`, `Risk: ${snapshot.risk}`, `Negative Reviews: ${negativeReviews}`],
          action: Number(snapshot.risk || 0) >= 60 ? 'Retention-Call einplanen' : 'Nächste Marketing-Aktion starten'
        }
      ]

      const detail = {
        customer,
        snapshot,
        counts,
        forecast: {
          series: forecastSeries,
          assumptions: [
            'Basis: aktueller MRR',
            'Pipeline wird anteilig gewichtet',
            'QR/Loyalty Aktivität erhöht Wachstumsfaktor',
            'Success Score beeinflusst Confidence'
          ]
        },
        revenue_share: {
          items: revenueShareItems,
          total: Math.round(revenueShareItems.reduce((sum, x) => sum + Number(x.amount || 0), 0) * 100) / 100
        },
        package_matrix: {
          packages,
          current_package: customer.package_key || customer.package || 'growth',
          recommended: packages.find(p => p.recommended) || packages[1]
        },
        customer_intelligence: {
          drivers: intelligenceDrivers,
          next_best_actions: [
            Number(snapshot.upsell || 0) >= 80 ? 'Premium Add-on pitchen' : 'Loyalty-Kampagne verlängern',
            negativeReviews > 0 ? 'Review Follow-up starten' : 'Review Booster aktivieren',
            leads > 0 ? 'Neue Leads zeitnah nachfassen' : 'Testscan/QR-Kampagne bewerben'
          ]
        },
        marketing: {
          calendar: marketingCalendar,
          funnel: [
            { stage: 'Idee', count: 4 },
            { stage: 'Geplant', count: 3 },
            { stage: 'Gestartet', count: signals.functional_records.filter(r => r.resource === 'marketing_campaigns' && r.payload?.status === 'Gestartet').length },
            { stage: 'Leads', count: leads },
            { stage: 'Conversion', count: Math.round(leads * 0.25) }
          ]
        },
        ai: {
          insights: aiInsights
        }
      }

      res.json({ ok: true, detail })
    } catch (e) { next(e) }
  })

  router.post('/v41/:customer_id/ai-message', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const message = String(req.body?.message || '').trim()
      const signals = await v38Signals(customerId)
      const counts = v38Counts(signals)
      const snapshot = await engine.recalculateCustomer(customerId)

      const answer = message
        ? `Basierend auf deiner Frage "${message}": Bei ${counts.qrScans} QR-Scans, ${counts.leads} Leads und Upsell Score ${snapshot.upsell} würde ich als nächsten Schritt ${Number(snapshot.upsell || 0) >= 80 ? 'ein Premium-Angebot vorbereiten' : 'die Loyalty-Aktivierung verstärken'}.`
        : `Aktueller Vorschlag: Loyalty-Kampagne prüfen, ${counts.leads} Leads nachfassen und Health ${snapshot.health} beobachten.`

      const record = await upsertRecord('assistant_messages', {
        id: `v41_ai_${Date.now()}`,
        customer_id: customerId,
        title: 'AI Assistant Antwort',
        severity: Number(snapshot.risk || 0) >= 60 ? 'warn' : 'success',
        message: answer,
        prompt: message,
        reasons: [`QR Scans: ${counts.qrScans}`, `Leads: ${counts.leads}`, `Upsell: ${snapshot.upsell}`, `Risk: ${snapshot.risk}`],
        active: true
      })

      res.json({ ok: true, answer, record, snapshot })
    } catch (e) { next(e) }
  })

  router.post('/v41/:customer_id/marketing-event', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const body = req.body || {}
      const record = await upsertRecord('marketing_campaigns', {
        id: body.id || `v41_campaign_${Date.now()}`,
        customer_id: customerId,
        name: body.title || body.name || 'Neue Marketing Aktion',
        title: body.title || body.name || 'Neue Marketing Aktion',
        audience: body.audience || 'Loyalty Members',
        reward: body.reward || null,
        scheduled_at: body.date || new Date().toISOString().slice(0, 10),
        status: body.status || 'geplant',
        channel: body.channel || 'Loyalty',
        active: true
      })

      try {
        await supabase.from('customer_timeline_events').insert({
          customer_id: customerId,
          event_type: 'v41_marketing_event_created',
          title: body.title || body.name || 'Marketing Aktion geplant',
          description: `${body.audience || 'Loyalty Members'} · ${body.date || 'ohne Datum'}`,
          source_module: 'marketing_automation',
          severity: 'info',
          metadata: { body }
        })
      } catch (_) {}

      res.json({ ok: true, event: record })
    } catch (e) { next(e) }
  })

  router.post('/v41/:customer_id/package-action', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const body = req.body || {}
      const key = body.package_key || body.key || 'growth'
      const value = Number(body.price || body.value || 499)

      const lead = await supabase.from('pipeline_leads').insert({
        customer_id: customerId,
        title: `Paket-Chance: ${body.name || key}`,
        source: 'v41_package_matrix',
        stage: 'new',
        value,
        probability: Number(body.probability || 35),
        metadata: { package_key: key, v41_package_action: true, body }
      }).select('*').single()

      const rec = await upsertRecord('package_recommendations', {
        id: `v41_package_${Date.now()}`,
        customer_id: customerId,
        title: `${body.name || key} empfehlen`,
        package_key: key,
        uplift: value,
        confidence: Number(body.fit_score || 75),
        status: 'als_chance_markiert',
        active: true
      })

      const snapshot = await engine.recalculateCustomer(customerId)
      res.json({ ok: true, pipeline_lead: lead.data || null, recommendation: rec, snapshot })
    } catch (e) { next(e) }
  })



  router.get('/v42/:customer_id/security-center', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const [settings, members, scores, events, dsar] = await Promise.all([
        getLoyaltySecuritySettings(customerId),
        supabase.from('loyalty_customers').select('*').eq('customer_id', customerId).limit(500),
        supabase.from('loyalty_member_security_scores').select('*').eq('customer_id', customerId).order('score', { ascending: false }).limit(100),
        supabase.from('security_events').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(100),
        supabase.from('dsar_requests').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(50)
      ])
      res.json({ ok:true, settings, members: members.data || [], scores: scores.data || [], events: events.data || [], dsar_requests: dsar.data || [] })
    } catch (e) { next(e) }
  })

  router.post('/v42/:customer_id/security-settings', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const body = req.body || {}
      const payload = {
        customer_id: customerId,
        daily_point_limit_per_member: Math.max(0, Math.floor(num(body.daily_point_limit_per_member, 0))),
        suspicion_score_threshold: Math.max(0, Math.min(100, Math.floor(num(body.suspicion_score_threshold, 70)))),
        auto_block_threshold: Math.max(0, Math.min(100, Math.floor(num(body.auto_block_threshold, 95)))),
        active: body.active !== false,
        updated_at: new Date().toISOString()
      }
      let existing = null
      try { existing = await supabase.from('loyalty_security_settings').select('id').eq('customer_id', customerId).maybeSingle() } catch (_) {}
      let saved = null
      if (existing && !existing.error && existing.data?.id) saved = await supabase.from('loyalty_security_settings').update(payload).eq('id', existing.data.id).select('*').single()
      else saved = await supabase.from('loyalty_security_settings').insert(payload).select('*').single()
      if (saved.error) throw saved.error
      await audit('security_settings_updated', { customer_id: customerId })
      res.json({ ok:true, settings: saved.data })
    } catch (e) { next(e) }
  })

  router.get('/v42/health', async (req, res) => {
    res.json({ ok: true, service: 'v42-functional-live' , timestamp: new Date().toISOString() })
  })

  router.post('/v42/:customer_id/loyalty-program', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const body = req.body || {}
      const provisioned = await provisionCustomer(customerId, { title: body.title || body.name || undefined })

      const points = Number(body.points_per_scan || body.pointsPerScan || provisioned.loyalty_program?.points_per_scan || 10)
      const patch = {
        title: body.title || body.name || provisioned.loyalty_program?.title || 'Loyalty Programm',
        name: body.name || body.title || provisioned.loyalty_program?.name || 'Loyalty Programm',
        points_per_scan: points,
        daily_point_limit_per_member: Math.max(0, Math.floor(num(body.daily_point_limit_per_member, provisioned.loyalty_program?.daily_point_limit_per_member || 0))),
        suspicion_score_threshold: Math.max(0, Math.min(100, Math.floor(num(body.suspicion_score_threshold, provisioned.loyalty_program?.suspicion_score_threshold || 70)))),
        active: body.active !== false,
        require_staff_code: body.require_staff_code !== false,
        metadata: {
          ...(provisioned.loyalty_program?.metadata || {}),
          v42_editable: true,
          notes: body.notes || null
        },
        updated_at: new Date().toISOString()
      }

      const updated = await supabase
        .from('loyalty_programs')
        .update(patch)
        .eq('id', provisioned.loyalty_program.id)
        .select('*')
        .single()

      if (updated.error) throw updated.error

      if (provisioned.qr_campaign?.id) {
        await supabase.from('qr_campaigns').update({
          title: body.qr_title || body.title || provisioned.qr_campaign.title || 'QR Kampagne',
          name: body.qr_title || body.title || provisioned.qr_campaign.name || 'QR Kampagne',
          active: body.active !== false,
          daily_point_limit_per_member: Math.max(0, Math.floor(num(body.daily_point_limit_per_member, 0))),
          suspicion_score_threshold: Math.max(0, Math.min(100, Math.floor(num(body.suspicion_score_threshold, 70)))),
          updated_at: new Date().toISOString()
        }).eq('id', provisioned.qr_campaign.id)
      }

      const settings = await v37GetOrCreateLoyaltySettings(customerId)
      await updateTableSchemaSafe('v37_loyalty_settings', {
        daily_scan_limit: Number(body.daily_scan_limit || settings.daily_scan_limit || 1),
        weekly_scan_limit: Number(body.weekly_scan_limit || settings.weekly_scan_limit || 5),
        daily_point_limit_per_member: Math.max(0, Math.floor(num(body.daily_point_limit_per_member, settings.daily_point_limit_per_member || 0))),
        suspicion_score_threshold: Math.max(0, Math.min(100, Math.floor(num(body.suspicion_score_threshold, settings.suspicion_score_threshold || 70)))),
        updated_at: new Date().toISOString()
      }, (q) => q.eq('customer_id', customerId))

      res.json({ ok: true, loyalty_program: updated.data, qr_campaign: provisioned.qr_campaign })
    } catch (e) { next(e) }
  })

  router.get('/v42/:customer_id/customer-loyalty-settings', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const settings = await v37GetOrCreateLoyaltySettings(customerId)
      const staff = await supabase.from('v33_functional_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('resource', 'staff_codes')
        .order('created_at', { ascending: false })
        .limit(20)

      const rules = await supabase.from('v33_functional_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('resource', 'loyalty_reward_rules')
        .order('created_at', { ascending: false })
        .limit(100)

      const programs = await supabase.from('loyalty_programs')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20)

      res.json({
        ok: true,
        settings,
        staff_codes: staff.error ? [] : (staff.data || []),
        rules: rules.error ? [] : (rules.data || []),
        loyalty_programs: programs.error ? [] : (programs.data || [])
      })
    } catch (e) { next(e) }
  })

  router.post('/v42/:customer_id/customer-loyalty-settings', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const body = req.body || {}

      if (body.staff_code || body.staff_label) {
        await upsertRecord('staff_codes', {
          id: body.staff_id || `staff_${customerId}`,
          customer_id: customerId,
          label: body.staff_label || 'Mitarbeiter-Code',
          code: body.staff_code || '2468',
          active: body.staff_active !== false,
          uses: Number(body.staff_uses || 0)
        })
      }

      if (body.points_per_scan || body.daily_scan_limit || body.weekly_scan_limit || body.daily_point_limit_per_member || body.weekly_point_limit_per_member || body.suspicion_score_threshold || body.require_rescan_for_points !== undefined || body.rotate_qr_after_scan !== undefined) {
        const provisioned = await provisionCustomer(customerId, {})
        const programMeta = { ...(provisioned.loyalty_program?.metadata || {}) }
        programMeta.weekly_point_limit_per_member = Math.max(0, Math.floor(num(body.weekly_point_limit_per_member, programMeta.weekly_point_limit_per_member || 0)))
        programMeta.weekly_scan_limit_enabled = body.weekly_scan_limit_enabled === true
        programMeta.require_rescan_for_points = body.require_rescan_for_points !== false
        programMeta.rotate_qr_after_scan = body.rotate_qr_after_scan === true
        await supabase.from('loyalty_programs').update({
          points_per_scan: Number(body.points_per_scan || provisioned.loyalty_program?.points_per_scan || 10),
          daily_point_limit_per_member: Math.max(0, Math.floor(num(body.daily_point_limit_per_member, provisioned.loyalty_program?.daily_point_limit_per_member || 0))),
          suspicion_score_threshold: Math.max(0, Math.min(100, Math.floor(num(body.suspicion_score_threshold, provisioned.loyalty_program?.suspicion_score_threshold || 70)))),
          metadata: programMeta,
          updated_at: new Date().toISOString()
        }).eq('id', provisioned.loyalty_program.id)

        const settings = await v37GetOrCreateLoyaltySettings(customerId)
        const settingsMeta = { ...(settings.metadata || {}) }
        settingsMeta.weekly_point_limit_per_member = Math.max(0, Math.floor(num(body.weekly_point_limit_per_member, settingsMeta.weekly_point_limit_per_member || 0)))
        settingsMeta.weekly_scan_limit_enabled = body.weekly_scan_limit_enabled === true
        settingsMeta.require_rescan_for_points = body.require_rescan_for_points !== false
        settingsMeta.rotate_qr_after_scan = body.rotate_qr_after_scan === true
        await updateTableSchemaSafe('v37_loyalty_settings', {
          daily_scan_limit: Number(body.daily_scan_limit || settings.daily_scan_limit || 1),
          weekly_scan_limit: body.weekly_scan_limit_enabled === true ? Math.max(0, Math.floor(num(body.weekly_scan_limit, settings.weekly_scan_limit || 0))) : 0,
          weekly_scan_limit_enabled: body.weekly_scan_limit_enabled === true,
          daily_point_limit_per_member: Math.max(0, Math.floor(num(body.daily_point_limit_per_member, settings.daily_point_limit_per_member || 0))),
          suspicion_score_threshold: Math.max(0, Math.min(100, Math.floor(num(body.suspicion_score_threshold, settings.suspicion_score_threshold || 70)))),
          metadata: settingsMeta,
          updated_at: new Date().toISOString()
        }, (q) => q.eq('customer_id', customerId))
      }

      if (Array.isArray(body.rules)) {
        for (const rule of body.rules) {
          if (!rule.trigger && !rule.condition && !rule.action) continue
          await upsertRecord('loyalty_reward_rules', {
            id: rule.id || `rule_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            customer_id: customerId,
            title: rule.title || `${rule.trigger || 'Trigger'} → ${rule.action || 'Aktion'}`,
            trigger: rule.trigger || 'qr_scan',
            condition: rule.condition || 'always',
            action: rule.action || 'add_points',
            points: Number(rule.points || 0),
            reward_id: rule.reward_id || null,
            active: rule.active !== false
          })
        }
      }

      const refreshed = await Promise.all([
        v37GetOrCreateLoyaltySettings(customerId),
        supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource', 'staff_codes').limit(20),
        supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource', 'loyalty_reward_rules').limit(100)
      ])

      res.json({
        ok: true,
        settings: refreshed[0],
        staff_codes: refreshed[1].data || [],
        rules: refreshed[2].data || []
      })
    } catch (e) { next(e) }
  })

  router.get('/v42/:customer_id/package-matrix', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const records = await supabase.from('v33_functional_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('resource', 'package_matrix')
        .order('created_at', { ascending: true })
        .limit(50)

      let packages = records.error ? [] : activeFunctionalRecords(records.data || []).map(r => r.payload || {})
      if (!packages.length) {
        packages = [
          { id: 'starter', name: 'Starter', price: 199, billing_interval: 'month', features: ['QR Kampagnen', 'Basic Loyalty', 'Landingpage'], visible_on_landing: true, visible_to_customer: true, active: true },
          { id: 'growth', name: 'Growth', price: 499, billing_interval: 'month', features: ['QR + Loyalty', 'Reviews', 'CRM 360', 'Marketing Automation'], visible_on_landing: true, visible_to_customer: true, active: true },
          { id: 'premium', name: 'Premium', price: 899, billing_interval: 'month', features: ['AI Assistant', 'Revenue Hub', 'Advanced Automation', 'Priority Support'], visible_on_landing: true, visible_to_customer: true, active: true }
        ]
        for (const p of packages) {
          await upsertRecord('package_matrix', { ...p, customer_id: customerId, title: p.name })
        }
      }

      res.json({ ok: true, packages })
    } catch (e) { next(e) }
  })

  router.post('/v42/:customer_id/package-matrix', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const body = req.body || {}
      const packages = Array.isArray(body.packages) ? body.packages : []

      for (const pkg of packages) {
        if (!pkg.name) continue
        await upsertRecord('package_matrix', {
          id: pkg.id || slugify(pkg.name, 'package'),
          customer_id: customerId,
          title: pkg.name,
          name: pkg.name,
          price: Number(pkg.price || 0),
          billing_interval: pkg.billing_interval || 'month',
          features: Array.isArray(pkg.features) ? pkg.features : String(pkg.features || '').split('\n').filter(Boolean),
          visible_on_landing: pkg.visible_on_landing !== false,
          visible_to_customer: pkg.visible_to_customer !== false,
          active: pkg.active !== false
        })
      }

      const refreshed = await supabase.from('v33_functional_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('resource', 'package_matrix')
        .order('created_at', { ascending: true })

      res.json({ ok: true, packages: activeFunctionalRecords(refreshed.data || []).map(r => r.payload || {}) })
    } catch (e) { next(e) }
  })

  router.get('/v42/:customer_id/reviews-hub', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const [reviews, templates, tickets] = await Promise.all([
        supabase.from('review_feedback').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(200),
        supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource', 'review_response_templates').limit(100),
        supabase.from('tickets').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(100)
      ])

      res.json({
        ok: true,
        reviews: reviews.error ? [] : (reviews.data || []),
        templates: templates.error ? [] : (templates.data || []),
        tickets: tickets.error ? [] : (tickets.data || []),
        stats: {
          total: reviews.error ? 0 : (reviews.data || []).length,
          positive: reviews.error ? 0 : (reviews.data || []).filter(r => Number(r.rating || 0) >= 4).length,
          negative: reviews.error ? 0 : (reviews.data || []).filter(r => Number(r.rating || 0) <= 2).length,
          open_tickets: tickets.error ? 0 : (tickets.data || []).filter(t => !['closed','done','resolved'].includes(String(t.status || '').toLowerCase())).length
        }
      })
    } catch (e) { next(e) }
  })

  router.get('/v42/:customer_id/analytics-billing', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const detail = await engine.recalculateCustomer(customerId)
      const billing = await engine.calculateBilling(customerId)
      const signals = await v38Signals(customerId)
      const counts = v38Counts(signals)

      res.json({
        ok: true,
        analytics: {
          qr_scans: counts.qrScans,
          leads: counts.leads,
          members: counts.members,
          reviews: counts.reviews,
          pipeline_value: counts.pipelineValue,
          health: detail.health,
          risk: detail.risk,
          upsell: detail.upsell,
          forecast: detail.forecast,
          revenue_share: detail.revenue_share
        },
        billing
      })
    } catch (e) { next(e) }
  })

  router.get('/v42/:customer_id/package-recommendations', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const customer = await getCustomer(customerId)
      const snapshot = await engine.recalculateCustomer(customerId)
      const signals = await v38Signals(customerId)
      const counts = v38Counts(signals)

      const recommendation = {
        customer_id: customerId,
        customer_name: customer?.name || customer?.title || customer?.company || 'Kunde',
        addon: Number(snapshot.upsell || 0) >= 80 ? 'Premium Growth Add-on' : 'Loyalty Booster Add-on',
        price: Number(snapshot.upsell || 0) >= 80 ? 499 : 199,
        reason: [
          `${counts.qrScans} QR-Scans`,
          `${counts.leads} Leads`,
          `${counts.members} Loyalty Members`,
          `Upsell Score ${snapshot.upsell}`,
          `Health Score ${snapshot.health}`
        ],
        confidence: Math.max(55, Number(snapshot.upsell || 60)),
        status: 'offen'
      }

      res.json({ ok: true, recommendation, snapshot })
    } catch (e) { next(e) }
  })



  async function verifyReactivationStaffCode(customerId, code) {
    const raw = clean(code)
    if (!raw) return false
    const normalized = String(raw).trim()
    try {
      const rows = await supabase.from('staff_codes').select('*').eq('customer_id', customerId).limit(300)
      if (!rows.error && (rows.data || []).some((row) => {
        const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
        const candidate = clean(row.code || row.pin || row.staff_code || row.value || meta.code || meta.pin)
        const status = String(row.status || meta.status || '').toLowerCase()
        return candidate === normalized && row.active !== false && !['deleted','archived','inactive','gesperrt','deaktiviert'].includes(status)
      })) return true
    } catch (_) {}
    try {
      const records = await supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource', 'staff_codes').limit(300)
      if (!records.error && activeFunctionalRecords(records.data || []).some((r) => {
        const payload = r.payload || r
        const candidate = clean(payload.code || payload.pin || payload.staff_code || payload.value)
        return candidate === normalized && payload.active !== false
      })) return true
    } catch (_) {}
    return false
  }

  async function recordReactivationEvent(payload = {}) {
    try { await insertTableSchemaSafe('customer_reactivation_events', { id: payload.id || safeToken('react_event'), created_at: new Date().toISOString(), ...payload }, { single: false }) } catch (_) {}
  }

  function reactivationMailFrom() {
    return clean(process.env.REACTIVATION_MAIL_FROM) || 'MecklenburgMarketing Loyalty <loyalty@mecklenburgmarketing.de>'
  }

  function publicFrontendBase(req) {
    const envBase = clean(process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)
    const origin = clean(req?.get?.('origin'))
    const referer = clean(req?.get?.('referer'))
    let fromReferer = null
    try { if (referer) fromReferer = new URL(referer).origin } catch (_) {}
    return String(envBase || origin || fromReferer || 'https://mecklenburgmarketing.de').replace(/\/+$/, '')
  }

  function reactivationUrl(req, link = {}) {
    return `${publicFrontendBase(req)}/reactivate/${encodeURIComponent(link.token || link.recovery_token || '')}`
  }

  function hasReactivationMailConsent(member = {}, settings = {}) {
    // V092: Rückholmails dürfen ausschließlich auf bestätigter Slug-/Loyalty-Werbeeinwilligung basieren.
    // Ein Settings-Fallback auf "ohne Consent versenden" ist bewusst deaktiviert.
    const meta = member?.metadata || {}
    const evidence = meta?.marketing_consent || meta?.marketingConsent || {}
    const purposes = [
      ...(Array.isArray(evidence?.purposes) ? evidence.purposes : []),
      ...(Array.isArray(meta?.marketing_consent_purposes) ? meta.marketing_consent_purposes : []),
      ...(Array.isArray(member?.marketing_consent_purposes) ? member.marketing_consent_purposes : [])
    ].map((v) => String(v || '').toLowerCase())
    const text = String(evidence?.text || meta?.marketing_consent_text || member?.marketing_consent_text || '').toLowerCase()
    const statusGranted = Boolean(
      member?.marketing_consent_status === 'granted' ||
      meta?.marketing_consent_status === 'granted' ||
      evidence?.status === 'granted'
    )
    const explicitlyForReactivation = purposes.includes('reactivation') || text.includes('reaktivierung') || text.includes('reaktivierungsaktion')
    return Boolean(statusGranted && explicitlyForReactivation)
  }

  function escapeReactivationHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
  }

  function reactivationTemplateContext({ link = {}, settings = {}, url = '', customer = null, isReminder = false } = {}) {
    const displayName = clean(link.display_name || link.name || link.email) || 'du'
    const firstName = String(displayName).split(/\s+/).filter(Boolean)[0] || displayName
    const reward = clean(link.reward_name || settings?.reward_name) || 'Deine Rückhol-Prämie'
    const points = num(link.reward_points ?? settings?.reward_points, 0)
    const expiry = link.expires_at ? new Date(link.expires_at).toLocaleDateString('de-DE') : 'auf Widerruf'
    const provider = clean(customer?.name || customer?.company || customer?.title || settings?.provider_name || settings?.business_name) || 'dein Anbieter'
    const redeemHint = clean(settings?.redeem_hint || settings?.email_redeem_hint) || 'Die Einlösung ist nur einmal möglich und wird vor Ort mit einem Mitarbeitercode bestätigt.'
    return {
      vorname: firstName,
      first_name: firstName,
      name: displayName,
      endkunde: displayName,
      kunde: provider,
      betrieb: provider,
      anbieter: provider,
      praemie: reward,
      prämie: reward,
      reward,
      punkte: points > 0 ? String(points) : '',
      points: points > 0 ? String(points) : '',
      punkte_text: points > 0 ? `${points} Bonuspunkte / Vorteil` : 'Persönliche Prämie',
      gueltig_bis: expiry,
      gültig_bis: expiry,
      rueckhol_link: url,
      rückhol_link: url,
      link: url,
      button_link: url,
      einloese_hinweis: redeemHint,
      einlöse_hinweis: redeemHint,
      mail_typ: isReminder ? 'Reminder' : 'Rückholmail'
    }
  }

  function renderReactivationTemplate(template, context = {}) {
    const source = String(template || '')
    return source.replace(/\{\s*([^{}]+?)\s*\}/g, (match, key) => {
      const normalized = String(key || '').trim().toLowerCase()
      if (Object.prototype.hasOwnProperty.call(context, normalized)) return context[normalized] ?? ''
      return match
    })
  }

  function defaultReactivationBody(isReminder = false) {
    return isReminder
      ? [
          'Hallo {vorname},',
          '',
          'deine persönliche Rückhol-Prämie bei {betrieb} wartet noch auf dich:',
          '',
          '{praemie}',
          '',
          'Hier kannst du sie öffnen:',
          '{rueckhol_link}',
          '',
          '{einloese_hinweis}'
        ].join('\n')
      : [
          'Hallo {vorname},',
          '',
          'wir haben dich bei {betrieb} vermisst. Als kleines Dankeschön wartet diese persönliche Rückhol-Prämie auf dich:',
          '',
          '{praemie}',
          '',
          'Öffne deinen persönlichen Einmal-Link:',
          '{rueckhol_link}',
          '',
          'Gültig bis: {gueltig_bis}',
          '{einloese_hinweis}'
        ].join('\n')
  }

  function reactivationMailSubject({ link, settings, url, customer, isReminder = false }) {
    const context = reactivationTemplateContext({ link, settings, url, customer, isReminder })
    const template = isReminder
      ? (settings?.reminder_subject || 'Erinnerung: Deine Rückhol-Prämie wartet noch')
      : (settings?.email_subject || 'Wir haben dich vermisst ☕')
    return renderReactivationTemplate(template, context).replace(/[\r\n]+/g, ' ').trim()
  }

  function reactivationMailHtml({ link, settings, url, customer, isReminder = false, unsubscribeUrl = '' }) {
    const context = reactivationTemplateContext({ link, settings, url, customer, isReminder })
    const bodyTemplate = isReminder
      ? (settings?.reminder_body_template || settings?.reminder_intro || defaultReactivationBody(true))
      : (settings?.email_body_template || settings?.email_intro || defaultReactivationBody(false))
    const renderedBody = renderReactivationTemplate(bodyTemplate, context)
    const signature = renderReactivationTemplate(settings?.email_signature || '', context)
    const reward = context.praemie
    const pointsText = context.punkte_text
    const expiry = context.gueltig_bis
    const buttonLabel = renderReactivationTemplate(isReminder ? (settings?.reminder_button_label || settings?.email_button_label || 'Rückhol-Prämie öffnen') : (settings?.email_button_label || 'Rückhol-Prämie öffnen'), context)
    const bodyEscUrl = escapeReactivationHtml(url)
    const bodyHtml = escapeReactivationHtml(renderedBody)
      .split(bodyEscUrl).join(`<a href="${escapeReactivationHtml(url)}">${bodyEscUrl}</a>`)
      .replace(/\n/g, '<br/>')
    const signatureHtml = signature ? `<p style="white-space:pre-line;color:#475569;margin-top:18px">${escapeReactivationHtml(signature)}</p>` : ''
    return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f6f7fb;margin:0;padding:24px;color:#172033"><div style="max-width:620px;margin:auto;background:#fff;border-radius:18px;padding:28px;border:1px solid #e7eaf3"><p style="margin:0 0 8px;color:#64748b;font-size:13px">${escapeReactivationHtml(context.betrieb)}</p><h1 style="margin:0 0 12px;font-size:26px">${isReminder ? 'Deine Rückhol-Prämie wartet noch' : 'Wir haben dich vermisst'}</h1><div style="line-height:1.58;font-size:15px;color:#172033">${bodyHtml}</div><div style="background:#f3f7ff;border:1px solid #dbe7ff;border-radius:14px;padding:18px;margin:20px 0"><b style="font-size:18px">${escapeReactivationHtml(reward)}</b><p style="margin:8px 0 0;color:#475569">${escapeReactivationHtml(pointsText)} · gültig bis ${escapeReactivationHtml(expiry)}</p></div><p><a href="${escapeReactivationHtml(url)}" style="display:inline-block;background:#172033;color:#fff;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:bold">${escapeReactivationHtml(buttonLabel)}</a></p><p style="color:#475569">${escapeReactivationHtml(context.einloese_hinweis)}</p>${signatureHtml}<hr style="border:none;border-top:1px solid #e7eaf3;margin:24px 0"/><p style="font-size:12px;color:#64748b">Du erhältst diese E-Mail, weil du die Werbe-, Prämien- und Reaktivierungsmails dieses Anbieters per Double-Opt-in bestätigt hast. Der Pflichtfooter und der Abmeldelink werden automatisch durch MMOS ergänzt. ${unsubscribeUrl ? `<br/><a href="${escapeReactivationHtml(unsubscribeUrl)}">Abmelden / Einwilligung widerrufen</a>` : ''}</p></div></body></html>`
  }

  function reactivationMailText({ link, settings, url, isReminder = false, unsubscribeUrl = '', customer = null }) {
    const context = reactivationTemplateContext({ link, settings, url, customer, isReminder })
    const bodyTemplate = isReminder
      ? (settings?.reminder_body_template || settings?.reminder_intro || defaultReactivationBody(true))
      : (settings?.email_body_template || settings?.email_intro || defaultReactivationBody(false))
    const body = renderReactivationTemplate(bodyTemplate, context)
    const signature = renderReactivationTemplate(settings?.email_signature || '', context)
    return [
      body,
      '',
      `Prämie: ${context.praemie}`,
      context.punkte ? `Bonuspunkte / Vorteil: ${context.punkte}` : '',
      `Gültig bis: ${context.gueltig_bis}`,
      `Link: ${url}`,
      '',
      context.einloese_hinweis,
      signature ? `\n${signature}` : '',
      '',
      'Du erhältst diese E-Mail, weil du die Werbe-, Prämien- und Reaktivierungsmails dieses Anbieters per Double-Opt-in bestätigt hast.',
      unsubscribeUrl ? `Abmelden / Einwilligung widerrufen: ${unsubscribeUrl}` : ''
    ].filter(Boolean).join('\n')
  }

  async function safeMaybeSingle(query) {
    try {
      const result = await query
      if (result?.error) return { data: null, error: result.error }
      return result || { data: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async function getReactivationSettings(customerId, qrCampaignId) {
    const byQr = qrCampaignId ? await safeMaybeSingle(supabase.from('customer_reactivation_settings').select('*').eq('qr_campaign_id', qrCampaignId).limit(1).maybeSingle()) : { data: null }
    if (byQr.data) return byQr.data
    const byCustomer = customerId ? await safeMaybeSingle(supabase.from('customer_reactivation_settings').select('*').eq('customer_id', customerId).limit(1).maybeSingle()) : { data: null }
    return byCustomer.data || {}
  }

  async function logReactivationMailEvent({ link, to, subject, status, provider = 'resend', result = null, error = null, isReminder = false }) {
    try {
      await insertTableSchemaSafe('mail_events', {
        customer_id: link.customer_id ? String(link.customer_id) : null,
        recipient: to,
        subject,
        template_key: isReminder ? 'customer_reactivation_reminder' : 'customer_reactivation',
        provider,
        status,
        metadata: { link_id: link.id, token: link.token, qr_campaign_id: link.qr_campaign_id, loyalty_customer_id: link.loyalty_customer_id, result, error },
        created_at: new Date().toISOString()
      }, { single: false })
    } catch (_) {}
  }

  async function sendReactivationLinkMail(req, link, { settings = null, isReminder = false, testTo = null } = {}) {
    if (!link?.token && !testTo) throw new Error('Rückhol-Link hat keinen Token.')
    const customerResult = link.customer_id ? await safeMaybeSingle(supabase.from('customers').select('*').eq('id', link.customer_id).maybeSingle()) : { data: null }
    const memberResult = link.loyalty_customer_id ? await safeMaybeSingle(supabase.from('loyalty_customers').select('*').eq('id', link.loyalty_customer_id).maybeSingle()) : { data: null }
    const customer = customerResult.data || null
    const member = memberResult.data || null
    const resolvedSettings = settings || await getReactivationSettings(link.customer_id, link.qr_campaign_id)
    if (!testTo && !hasReactivationMailConsent(member || {}, resolvedSettings || {})) {
      const now = new Date().toISOString()
      await updateTableSchemaSafe('customer_reactivation_links', { email_status: 'skipped_no_consent', last_mail_error: 'Keine bestätigte Slug-Double-Opt-in-Einwilligung für Reaktivierungsmails.', consent_basis: 'slug_double_opt_in_reactivation', consent_checked_at: now, updated_at: now, metadata: { ...(link.metadata || {}), last_mail_skip_reason: 'no_reactivation_double_opt_in', last_mail_skip_at: now } }, (q) => q.eq('id', link.id))
      await recordReactivationEvent({ customer_id: link.customer_id, qr_campaign_id: link.qr_campaign_id, loyalty_customer_id: link.loyalty_customer_id, reactivation_link_id: link.id, event_type: 'mail_skipped_no_consent', metadata: { email: link.email } })
      return { ok: false, skipped: true, reason: 'no_marketing_consent', email: link.email }
    }
    const to = clean(testTo || link.email || member?.email)
    if (!to) throw new Error('E-Mail-Adresse fehlt.')
    const url = testTo && !link.token ? `${publicFrontendBase(req)}/reactivate/test-token` : reactivationUrl(req, link)
    let unsubscribeUrl = ''
    try {
      if (!testTo && member?.id && to) {
        const unsub = await createUnsubscribeToken(supabase, { customer_id: link.customer_id, member_id: member.id, email: to, slug: link.metadata?.slug || '' })
        unsubscribeUrl = unsub?.url || ''
      }
    } catch (_) {}
    const subject = reactivationMailSubject({ link, settings: resolvedSettings, url, customer, isReminder })
    const html = reactivationMailHtml({ link, settings: resolvedSettings, url, customer, isReminder, unsubscribeUrl })
    const text = reactivationMailText({ link, settings: resolvedSettings, url, customer, isReminder, unsubscribeUrl })
    const mail = new MailService()
    const now = new Date().toISOString()
    try {
      const result = await mail.send({ to, subject, html, text, from: reactivationMailFrom(), replyTo: clean(process.env.REACTIVATION_MAIL_REPLY_TO || process.env.MAIL_REPLY_TO) || 'info@mecklenburgmarketing.de', requireDelivery: false })
      if (!testTo && link.id) {
        const patch = isReminder
          ? { email_status: result?.dryRun ? 'dry_run' : 'reminder_sent', last_reminder_at: now, reminder_count: num(link.reminder_count, 0) + 1, mail_provider_id: result?.id || link.mail_provider_id || null, consent_basis: 'slug_double_opt_in_reactivation', consent_checked_at: now, updated_at: now, metadata: { ...(link.metadata || {}), last_reminder_result: result } }
          : { status: ['open','created',''].includes(String(link.status || 'open').toLowerCase()) ? 'sent' : link.status, email_status: result?.dryRun ? 'dry_run' : 'sent', sent_at: link.sent_at || now, mail_sent_at: now, mail_provider_id: result?.id || null, consent_basis: 'slug_double_opt_in_reactivation', consent_checked_at: now, updated_at: now, metadata: { ...(link.metadata || {}), mail_result: result } }
        await updateTableSchemaSafe('customer_reactivation_links', patch, (q) => q.eq('id', link.id))
        await recordReactivationEvent({ customer_id: link.customer_id, qr_campaign_id: link.qr_campaign_id, loyalty_customer_id: link.loyalty_customer_id, reactivation_link_id: link.id, event_type: isReminder ? 'mail_reminder_sent' : 'mail_sent', metadata: { email: to, result } })
      }
      await logReactivationMailEvent({ link, to, subject, status: result?.dryRun ? 'dry_run' : 'sent', provider: result?.provider || 'resend', result, isReminder })
      return { ok: true, email: to, result }
    } catch (error) {
      if (!testTo && link.id) {
        await updateTableSchemaSafe('customer_reactivation_links', { email_status: 'failed', failed_at: now, last_mail_error: error.message, updated_at: now, metadata: { ...(link.metadata || {}), last_mail_error: error.message, last_mail_error_at: now } }, (q) => q.eq('id', link.id))
        await recordReactivationEvent({ customer_id: link.customer_id, qr_campaign_id: link.qr_campaign_id, loyalty_customer_id: link.loyalty_customer_id, reactivation_link_id: link.id, event_type: 'mail_failed', metadata: { email: to, error: error.message, code: error.code || null } })
      }
      await logReactivationMailEvent({ link, to, subject, status: 'failed', provider: 'resend', error: { message: error.message, code: error.code || null }, isReminder })
      throw error
    }
  }

  async function loadReactivationLinks(customerId, qrCampaignId, statuses = []) {
    let query = supabase.from('customer_reactivation_links').select('*').eq('customer_id', customerId).eq('qr_campaign_id', qrCampaignId).limit(500)
    if (statuses.length) query = query.in('status', statuses)
    const result = await query
    return result.error ? [] : (result.data || [])
  }

  async function getReactivationLinkByToken(token) {
    if (!token) return null
    const result = await supabase.from('customer_reactivation_links').select('*').eq('token', token).limit(1).maybeSingle()
    if (!result.error && result.data) return result.data
    return null
  }

  async function getReactivationContext(token) {
    const link = await getReactivationLinkByToken(token)
    if (!link) return { ok: false, status: 404, error: 'Rückhol-Link nicht gefunden.' }
    const nowMs = Date.now()
    const expiresMs = link.expires_at ? Date.parse(link.expires_at) : 0
    const expired = Boolean(expiresMs && expiresMs < nowMs)
    const status = String(link.status || 'open').toLowerCase()
    const [customerRow, qrRow, memberRow, settingRow] = await Promise.all([
      link.customer_id ? safeMaybeSingle(supabase.from('customers').select('*').eq('id', link.customer_id).maybeSingle()) : Promise.resolve({ data: null }),
      link.qr_campaign_id ? safeMaybeSingle(supabase.from('qr_campaigns').select('*').eq('id', link.qr_campaign_id).maybeSingle()) : Promise.resolve({ data: null }),
      link.loyalty_customer_id ? safeMaybeSingle(supabase.from('loyalty_customers').select('*').eq('id', link.loyalty_customer_id).maybeSingle()) : Promise.resolve({ data: null }),
      link.qr_campaign_id ? safeMaybeSingle(supabase.from('customer_reactivation_settings').select('*').eq('qr_campaign_id', link.qr_campaign_id).limit(1).maybeSingle()) : Promise.resolve({ data: null })
    ])
    return { ok: true, link, customer: customerRow.data || null, qr_campaign: qrRow.data || null, member: memberRow.data || null, settings: settingRow.data || null, expired, already_redeemed: ['redeemed','reactivated','used','eingeloest','eingelöst'].includes(status) }
  }

  router.get('/customers/:customer_id/reactivation/:qr_campaign_id/mail-diagnostics', async (req, res, next) => {
    try {
      const mail = new MailService()
      res.json({ ok: true, from: reactivationMailFrom(), diagnostics: mail.diagnostics(), automation_enabled: process.env.REACTIVATION_AUTOMATION_ENABLED === 'true' })
    } catch (e) { next(e) }
  })

  router.post('/customers/:customer_id/reactivation/:qr_campaign_id/test-mail', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const qrCampaignId = req.params.qr_campaign_id
      const body = req.body || {}
      const to = clean(body.to || body.email || process.env.ADMIN_NOTIFY_EMAIL || process.env.MAIL_REPLY_TO)
      if (!to) return res.status(400).json({ ok:false, error:'Test-E-Mail-Adresse fehlt.' })
      const settings = { ...(await getReactivationSettings(customerId, qrCampaignId)), ...(body.settings || {}) }
      const link = {
        id: 'test_reactivation_mail',
        customer_id: customerId,
        qr_campaign_id: qrCampaignId,
        loyalty_customer_id: null,
        email: to,
        display_name: body.display_name || 'Testkunde',
        token: body.token || 'test-token',
        reward_name: settings.reward_name || 'Test Rückhol-Prämie',
        reward_type: settings.reward_type || 'test',
        reward_points: num(settings.reward_points, 0),
        expires_at: new Date(Date.now() + num(settings.valid_days, 14) * 86400000).toISOString(),
        metadata: { slug: body.slug || '' }
      }
      const result = await sendReactivationLinkMail(req, link, { settings, testTo: to })
      res.json({ ok:true, from: reactivationMailFrom(), result })
    } catch (e) { next(e) }
  })

  router.post('/customers/:customer_id/reactivation/:qr_campaign_id/send-mails', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const qrCampaignId = req.params.qr_campaign_id
      const body = req.body || {}
      const settings = await getReactivationSettings(customerId, qrCampaignId)
      const limit = Math.max(1, Math.min(200, num(body.limit, 100)))
      let links = await loadReactivationLinks(customerId, qrCampaignId, [])
      const wantedIds = Array.isArray(body.link_ids || body.linkIds) ? (body.link_ids || body.linkIds).map(String) : []
      links = links.filter((l) => {
        if (wantedIds.length && !wantedIds.includes(String(l.id))) return false
        const st = String(l.status || 'open').toLowerCase()
        const emailStatus = String(l.email_status || '').toLowerCase()
        return ['open','created','pending',''].includes(st) && !['sent','dry_run','delivered'].includes(emailStatus)
      }).slice(0, limit)
      const sent = []
      const failed = []
      const skipped = []
      for (const link of links) {
        try {
          const result = await sendReactivationLinkMail(req, link, { settings, isReminder: false })
          if (result.skipped) skipped.push(result)
          else sent.push({ id: link.id, email: link.email, result: result.result })
        } catch (error) {
          failed.push({ id: link.id, email: link.email, error: error.message })
        }
      }
      res.json({ ok: failed.length === 0, from: reactivationMailFrom(), sent, failed, skipped, counts: { sent: sent.length, failed: failed.length, skipped: skipped.length, considered: links.length } })
    } catch (e) { next(e) }
  })

  router.post('/customers/:customer_id/reactivation/:qr_campaign_id/send-reminders', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const qrCampaignId = req.params.qr_campaign_id
      const body = req.body || {}
      const settings = await getReactivationSettings(customerId, qrCampaignId)
      const reminderEnabled = body.force === true || settings.reminder_enabled !== false
      if (!reminderEnabled) return res.json({ ok:true, sent:[], failed:[], skipped:[{ reason:'reminder_disabled' }] })
      const afterDays = Math.max(1, num(body.reminder_after_days ?? settings.reminder_after_days, 3))
      const maxCount = Math.max(1, num(body.reminder_max_count ?? settings.reminder_max_count, 1))
      const cutoff = Date.now() - afterDays * 86400000
      const links = (await loadReactivationLinks(customerId, qrCampaignId, []))
        .filter((l) => ['sent','opened'].includes(String(l.status || '').toLowerCase()))
        .filter((l) => !l.redeemed_at && !l.reactivated_at)
        .filter((l) => num(l.reminder_count, 0) < maxCount)
        .filter((l) => Date.parse(l.last_reminder_at || l.mail_sent_at || l.sent_at || l.created_at || '') < cutoff)
        .slice(0, Math.max(1, Math.min(200, num(body.limit, 100))))
      const sent = []
      const failed = []
      const skipped = []
      for (const link of links) {
        try {
          const result = await sendReactivationLinkMail(req, link, { settings, isReminder: true })
          if (result.skipped) skipped.push(result)
          else sent.push({ id: link.id, email: link.email, result: result.result })
        } catch (error) {
          failed.push({ id: link.id, email: link.email, error: error.message })
        }
      }
      res.json({ ok: failed.length === 0, from: reactivationMailFrom(), sent, failed, skipped, counts: { sent: sent.length, failed: failed.length, skipped: skipped.length, considered: links.length } })
    } catch (e) { next(e) }
  })

  router.post('/public/reactivation/mail-webhook', async (req, res, next) => {
    try {
      const secret = clean(process.env.REACTIVATION_WEBHOOK_SECRET || process.env.RESEND_WEBHOOK_SECRET)
      if (secret) {
        const supplied = clean(req.get('x-webhook-secret') || req.get('x-resend-webhook-secret') || req.query.secret)
        if (supplied !== secret) return res.status(401).json({ ok:false })
      }
      const body = req.body || {}
      const eventType = clean(body.type || body.event || body.event_type || body.data?.event) || 'mail_event'
      const data = body.data || body
      const providerId = clean(data.email_id || data.id || data.message_id || data.messageId || data.mail_id)
      const to = clean(data.to || data.recipient || (Array.isArray(data.recipients) ? data.recipients[0] : null))
      const statusMap = { delivered: 'delivered', bounced: 'bounced', bounce: 'bounced', complained: 'complained', complaint: 'complained', opened: 'mail_opened', clicked: 'mail_clicked', failed: 'failed' }
      const mapped = statusMap[String(eventType).toLowerCase()] || String(eventType).toLowerCase()
      let link = null
      if (providerId) {
        const r = await safeMaybeSingle(supabase.from('customer_reactivation_links').select('*').eq('mail_provider_id', providerId).limit(1).maybeSingle())
        link = r.data || null
      }
      if (!link && to) {
        const r = await safeMaybeSingle(supabase.from('customer_reactivation_links').select('*').eq('email', to).order('created_at', { ascending: false }).limit(1).maybeSingle())
        link = r.data || null
      }
      if (link?.id) {
        const now = new Date().toISOString()
        const patch = { email_status: mapped, updated_at: now, metadata: { ...(link.metadata || {}), last_mail_webhook: body, last_mail_webhook_at: now } }
        if (mapped === 'delivered') patch.delivered_at = now
        if (mapped === 'bounced') patch.bounced_at = now
        if (mapped === 'failed') patch.failed_at = now
        await updateTableSchemaSafe('customer_reactivation_links', patch, (q) => q.eq('id', link.id))
        await recordReactivationEvent({ customer_id: link.customer_id, qr_campaign_id: link.qr_campaign_id, loyalty_customer_id: link.loyalty_customer_id, reactivation_link_id: link.id, event_type: `mail_${mapped}`, metadata: body })
      }
      res.json({ ok:true, matched: Boolean(link), status: mapped })
    } catch (e) { next(e) }
  })

  router.get('/public/reactivation/:token/status', async (req, res, next) => {
    try {
      const token = clean(req.params.token)
      const ctx = await getReactivationContext(token)
      if (!ctx.ok) return res.status(ctx.status || 404).json({ ok:false, error: ctx.error })
      const { link, customer, qr_campaign, member, settings, expired, already_redeemed } = ctx
      await recordReactivationEvent({ customer_id: link.customer_id, qr_campaign_id: link.qr_campaign_id, loyalty_customer_id: link.loyalty_customer_id, reactivation_link_id: link.id, event_type: 'opened', metadata: { token, user_agent: req.get('user-agent') || null, ip_hash: marketingConsentIpHash(req) } })
      if (!already_redeemed && !expired) {
        await updateTableSchemaSafe('customer_reactivation_links', { status: String(link.status || 'open') === 'open' ? 'opened' : link.status, last_opened_at: new Date().toISOString(), opened_count: num(link.opened_count, 0) + 1, updated_at: new Date().toISOString() }, (q) => q.eq('id', link.id))
      }
      res.json({
        ok: true,
        token,
        status: expired ? 'expired' : already_redeemed ? 'redeemed' : (link.status || 'open'),
        expired,
        already_redeemed,
        customer_name: customer?.name || customer?.company || 'Dein Anbieter',
        display_name: link.display_name || member?.display_name || member?.name || link.email || 'Gast',
        email: link.email || member?.email || null,
        reward_name: link.reward_name || settings?.reward_name || 'Deine Rückhol-Prämie',
        reward_type: link.reward_type || settings?.reward_type || 'reactivation',
        reward_points: num(link.reward_points ?? settings?.reward_points, 0),
        staff_code_required: link.staff_code_required !== false && settings?.staff_code_required !== false,
        expires_at: link.expires_at || null,
        qr_slug: qr_campaign?.slug || link.metadata?.slug || null,
        metadata: link.metadata || {}
      })
    } catch (e) { next(e) }
  })

  router.post('/public/reactivation/:token/redeem', async (req, res, next) => {
    try {
      const token = clean(req.params.token)
      const body = req.body || {}
      const ctx = await getReactivationContext(token)
      if (!ctx.ok) return res.status(ctx.status || 404).json({ ok:false, error: ctx.error })
      const { link, member, settings, expired, already_redeemed } = ctx
      if (expired) return res.status(410).json({ ok:false, code:'REACTIVATION_LINK_EXPIRED', error:'Dieser Rückhol-Link ist abgelaufen.' })
      if (already_redeemed) return res.status(409).json({ ok:false, code:'REACTIVATION_LINK_ALREADY_REDEEMED', error:'Dieser Rückhol-Link wurde bereits eingelöst.' })
      const staffRequired = link.staff_code_required !== false && settings?.staff_code_required !== false
      if (staffRequired) {
        const ok = await verifyReactivationStaffCode(link.customer_id, body.staff_code || body.staffCode)
        if (!ok) return res.status(400).json({ ok:false, code:'INVALID_STAFF_CODE', error:'Mitarbeitercode ungültig.' })
      }
      const now = new Date().toISOString()
      let updatedMember = member
      const bonusPoints = num(link.reward_points ?? settings?.reward_points, 0)
      if (member?.id) {
        const patch = { points_balance: num(member.points_balance, 0) + bonusPoints, total_points: num(member.total_points, 0) + bonusPoints, last_seen_at: now, last_activity_at: now, metadata: { ...(member.metadata || {}), last_reactivation_at: now, last_reactivation_link_id: link.id } }
        const updated = await updateLoyaltyCustomerSafe(member.id, patch)
        if (!updated.error && updated.data) updatedMember = updated.data
      }
      await insertLoyaltyTransactionSafe({ customer_id: link.customer_id, loyalty_program_id: link.loyalty_program_id || member?.loyalty_program_id || null, loyalty_customer_id: link.loyalty_customer_id || member?.id || null, qr_campaign_id: link.qr_campaign_id || null, action: 'reactivation', points: bonusPoints, source: 'reactivation_link', description: `Rückholaktion eingelöst: ${link.reward_name || settings?.reward_name || ''}`, metadata: { token, link_id: link.id, staff_code_used: Boolean(body.staff_code || body.staffCode) } })
      await insertTableSchemaSafe('loyalty_reward_redemptions', { customer_id: link.customer_id, loyalty_customer_id: link.loyalty_customer_id || member?.id || null, qr_campaign_id: link.qr_campaign_id || null, points_spent: 0, status: 'Eingelöst', payload: { source: 'reactivation_link', token, link_id: link.id, reward_name: link.reward_name || settings?.reward_name || null, staff_code_used: Boolean(body.staff_code || body.staffCode) } }, { single: false })
      const linkPatch = { status: 'redeemed', redeemed_at: now, reactivated_at: now, staff_code_used: clean(body.staff_code || body.staffCode) || null, updated_at: now, metadata: { ...(link.metadata || {}), redeemed_user_agent: req.get('user-agent') || null, redeemed_ip_hash: marketingConsentIpHash(req), reactivated: true } }
      await updateTableSchemaSafe('customer_reactivation_links', linkPatch, (q) => q.eq('id', link.id))
      await recordReactivationEvent({ customer_id: link.customer_id, qr_campaign_id: link.qr_campaign_id, loyalty_customer_id: link.loyalty_customer_id || member?.id || null, reactivation_link_id: link.id, event_type: 'redeemed', metadata: { token, reward_points: bonusPoints, staff_code_used: Boolean(body.staff_code || body.staffCode) } })
      await recordReactivationEvent({ customer_id: link.customer_id, qr_campaign_id: link.qr_campaign_id, loyalty_customer_id: link.loyalty_customer_id || member?.id || null, reactivation_link_id: link.id, event_type: 'reactivated', metadata: { token, reward_points: bonusPoints } })
      res.json({ ok:true, status:'redeemed', reward_name: link.reward_name || settings?.reward_name || 'Rückhol-Prämie', points_added: bonusPoints, member: updatedMember })
    } catch (e) { next(e) }
  })

  async function runReactivationMailAutomation(reqLike = null) {
    const settingsResult = await supabase.from('customer_reactivation_settings').select('*').eq('active', true).limit(200).catch(() => ({ data: [], error: null }))
    const rows = (settingsResult.data || []).filter((s) => s.email_automation_enabled === true || s.metadata?.email_automation_enabled === true)
    const summary = { settings: rows.length, sent: 0, reminders: 0, failed: 0, skipped: 0, details: [] }
    for (const setting of rows) {
      const customerId = setting.customer_id
      const qrCampaignId = setting.qr_campaign_id
      if (!customerId || !qrCampaignId) continue
      const open = (await loadReactivationLinks(customerId, qrCampaignId, []))
        .filter((l) => ['open','created','pending',''].includes(String(l.status || 'open').toLowerCase()))
        .filter((l) => !['sent','dry_run','delivered'].includes(String(l.email_status || '').toLowerCase()))
        .slice(0, 50)
      for (const link of open) {
        try {
          const r = await sendReactivationLinkMail(reqLike, link, { settings: setting, isReminder: false })
          if (r.skipped) summary.skipped += 1
          else summary.sent += 1
        } catch (error) {
          summary.failed += 1
          summary.details.push({ link_id: link.id, error: error.message })
        }
      }
      if (setting.reminder_enabled !== false) {
        const afterDays = Math.max(1, num(setting.reminder_after_days, 3))
        const maxCount = Math.max(1, num(setting.reminder_max_count, 1))
        const cutoff = Date.now() - afterDays * 86400000
        const due = (await loadReactivationLinks(customerId, qrCampaignId, []))
          .filter((l) => ['sent','opened'].includes(String(l.status || '').toLowerCase()))
          .filter((l) => !l.redeemed_at && !l.reactivated_at)
          .filter((l) => num(l.reminder_count, 0) < maxCount)
          .filter((l) => Date.parse(l.last_reminder_at || l.mail_sent_at || l.sent_at || l.created_at || '') < cutoff)
          .slice(0, 50)
        for (const link of due) {
          try {
            const r = await sendReactivationLinkMail(reqLike, link, { settings: setting, isReminder: true })
            if (r.skipped) summary.skipped += 1
            else summary.reminders += 1
          } catch (error) {
            summary.failed += 1
            summary.details.push({ link_id: link.id, reminder: true, error: error.message })
          }
        }
      }
    }
    return summary
  }

  router.post('/reactivation-mail-automation/run', async (req, res, next) => {
    try {
      const result = await runReactivationMailAutomation(req)
      res.json({ ok: result.failed === 0, result })
    } catch (e) { next(e) }
  })

  if (!global.__mmosReactivationMailAutomationStarted && process.env.REACTIVATION_AUTOMATION_ENABLED === 'true') {
    global.__mmosReactivationMailAutomationStarted = true
    const intervalMs = Math.max(15 * 60 * 1000, num(process.env.REACTIVATION_AUTOMATION_INTERVAL_MS, 6 * 60 * 60 * 1000))
    setInterval(() => runReactivationMailAutomation(null).catch((e) => console.error('[reactivation-mail-automation]', e.message || e)), intervalMs)
  }

  router.get('/v42/url-debug', async (req, res) => {
    res.json({
      ok: true,
      service: 'v42-url-debug',
      protocol: req.protocol,
      host: req.get('host'),
      origin: req.get('origin') || null,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    })
  })

  return router
}

module.exports = v33FunctionalRoutes
