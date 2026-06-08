async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function isLTarget(value = '') {
  return /^\/l\/[^/?#]+/i.test(String(value || '').trim())
}

function toQTarget(value = '') {
  const raw = String(value || '').trim()
  if (!isLTarget(raw)) return raw
  return raw.replace(/^\/l\//i, '/q/')
}

async function migrateQrLegacyTargets(supabase, { customer_id = null, dry_run = false } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', updated: [] }
  let q = supabase.from('qr_campaigns').select('*').limit(1000)
  if (customer_id) q = q.eq('customer_id', customer_id)
  const found = await safeQuery(q)
  if (found.error) return { ok: false, error: found.error.message, updated: [] }

  const updated = []
  for (const row of (found.data || [])) {
    const nextTarget = toQTarget(row.target_url || row.public_url || (row.slug ? `/l/${row.slug}` : ''))
    const nextPublic = toQTarget(row.public_url || row.target_url || (row.slug ? `/l/${row.slug}` : ''))
    const needs = nextTarget !== row.target_url || nextPublic !== row.public_url
    if (!needs) continue
    const patch = {
      target_url: nextTarget,
      public_url: nextPublic,
      metadata: { ...(row.metadata || {}), landing_url: row.slug ? `/l/${row.slug}` : row.metadata?.landing_url || null, qr_scan_url: row.slug ? `/q/${row.slug}` : nextTarget, legacy_target_migrated_at: new Date().toISOString() },
      updated_at: new Date().toISOString()
    }
    updated.push({ id: row.id, slug: row.slug, before: { target_url: row.target_url, public_url: row.public_url }, after: patch })
    if (!dry_run) await safeQuery(supabase.from('qr_campaigns').update(patch).eq('id', row.id))
  }
  return { ok: true, dry_run, updated_count: updated.length, updated }
}

async function cleanupQrScanTokens(supabase, { archive_used_after_days = 7, expire_after_minutes = null, dry_run = false } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', expired: 0, archived: 0 }
  const now = new Date()
  const found = await safeQuery(
    supabase.from('v33_functional_records').select('*').eq('resource', 'qr_scan_tokens').limit(5000)
  )
  if (found.error) return { ok: false, error: found.error.message, expired: 0, archived: 0 }

  let expired = 0
  let archived = 0
  const details = []
  for (const row of (found.data || [])) {
    const p = row.payload || {}
    const status = String(row.status || p.status || 'active').toLowerCase()
    const expiresAt = p.expires_at ? new Date(p.expires_at) : null
    const usedAt = p.used_at ? new Date(p.used_at) : null
    const hardExpireAt = expire_after_minutes ? new Date(new Date(row.created_at || now).getTime() + Number(expire_after_minutes) * 60 * 1000) : null
    const shouldExpire = status === 'active' && ((expiresAt && expiresAt < now) || (hardExpireAt && hardExpireAt < now))
    const shouldArchive = (status === 'used' || p.used === true) && usedAt && (now.getTime() - usedAt.getTime()) > Number(archive_used_after_days || 7) * 24 * 60 * 60 * 1000

    if (shouldExpire) {
      expired += 1
      const patch = { status: 'expired', payload: { ...p, active: false, expired_at: now.toISOString() }, updated_at: now.toISOString() }
      details.push({ id: row.id, action: 'expired' })
      if (!dry_run) await safeQuery(supabase.from('v33_functional_records').update(patch).eq('id', row.id))
    } else if (shouldArchive) {
      archived += 1
      const patch = { status: 'archived', payload: { ...p, archived: true, archived_at: now.toISOString() }, updated_at: now.toISOString() }
      details.push({ id: row.id, action: 'archived' })
      if (!dry_run) await safeQuery(supabase.from('v33_functional_records').update(patch).eq('id', row.id))
    }
  }

  return { ok: true, dry_run, expired, archived, details }
}

async function qrEndToEndDiagnostic(supabase, { customer_id = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', checks: [] }
  let q = supabase.from('qr_campaigns').select('*').order('created_at', { ascending: false }).limit(50)
  if (customer_id) q = q.eq('customer_id', customer_id)
  const qr = await safeQuery(q)
  const campaigns = qr.data || []
  const checks = []
  for (const campaign of campaigns) {
    const slug = campaign.slug
    const target = campaign.target_url || campaign.public_url || ''
    const points = []
    points.push({ key: 'has_slug', ok: Boolean(slug), hint: slug ? `/q/${slug}` : 'Slug fehlt' })
    points.push({ key: 'target_is_q', ok: /^\/q\//.test(target), hint: target || 'target_url fehlt' })
    points.push({ key: 'landing_exists', ok: Boolean(slug), hint: slug ? `/l/${slug}` : 'Landing fehlt' })
    points.push({ key: 'active', ok: campaign.active !== false && !campaign.deleted_at && campaign.is_deleted !== true, hint: campaign.status || 'Aktiv' })
    const overall = points.every((p) => p.ok)
    checks.push({ id: campaign.id, slug, title: campaign.title || campaign.name, ok: overall, points })
  }
  return { ok: checks.every((c) => c.ok), checks, recommendation: checks.some((c) => !c.ok) ? 'QR Legacy Migration ausführen und Slugs prüfen.' : 'QR-Ziele wirken bereit.' }
}

module.exports = { migrateQrLegacyTargets, cleanupQrScanTokens, qrEndToEndDiagnostic }
