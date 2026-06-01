async function safeRun(name, fn, hint = '') {
  const started = Date.now()
  try {
    const result = await fn()
    const ok = result?.ok !== false
    return { name, ok, duration_ms: Date.now() - started, result: result || null, hint: ok ? null : (result?.hint || hint) }
  } catch (error) {
    return { name, ok: false, duration_ms: Date.now() - started, error: error.message || String(error), hint }
  }
}

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function isActive(row = {}) {
  const s = String(row.status || '').toLowerCase()
  return row.active !== false && row.is_deleted !== true && !row.deleted_at && !['deleted','archived','inactive','blocked'].includes(s)
}

async function runProductionSmokeTest(supabase, { customer_id = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', tests: [] }

  const tests = []
  tests.push(await safeRun('supabase_connection', async () => {
    const r = await safeQuery(supabase.from('customers').select('id').limit(1))
    if (r.error) return { ok: false, hint: r.error.message }
    return { ok: true, count_checked: Array.isArray(r.data) ? r.data.length : 0 }
  }, 'SUPABASE_URL/SERVICE_ROLE_KEY prüfen.'))

  tests.push(await safeRun('admin_tables_available', async () => {
    const tables = ['customers','customer_tool_access','activity_logs','user_profiles']
    const failed = []
    for (const table of tables) {
      const r = await safeQuery(supabase.from(table).select('*').limit(1))
      if (r.error) failed.push({ table, error: r.error.message })
    }
    return { ok: failed.length === 0, failed }
  }, 'Core Tabellen/Migrationen prüfen.'))

  tests.push(await safeRun('customer_context_available', async () => {
    let q = supabase.from('customers').select('*').limit(10)
    if (customer_id) q = q.eq('id', customer_id)
    const r = await safeQuery(q)
    if (r.error) return { ok: false, hint: r.error.message }
    const customer = (r.data || []).find(isActive) || (r.data || [])[0]
    return { ok: Boolean(customer), customer_id: customer?.id || null, customer_name: customer?.name || customer?.title || null }
  }, 'Mindestens einen aktiven Kunden anlegen.'))

  tests.push(await safeRun('qr_token_flow_structural', async () => {
    let q = supabase.from('qr_campaigns').select('*').limit(20)
    if (customer_id) q = q.eq('customer_id', customer_id)
    const qr = await safeQuery(q)
    if (qr.error) return { ok: false, hint: qr.error.message }
    const campaigns = qr.data || []
    const bad = campaigns.filter((c) => c.slug && !String(c.target_url || c.public_url || '').startsWith('/q/'))
    return { ok: bad.length === 0, campaigns: campaigns.length, bad_targets: bad.map((b) => ({ id: b.id, slug: b.slug, target_url: b.target_url, public_url: b.public_url })) }
  }, 'QR Legacy Target Migration ausführen.'))

  tests.push(await safeRun('mail_config', async () => {
    const hasProvider = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST)
    const hasFrom = Boolean(process.env.MAIL_FROM || process.env.PACKAGE_INQUIRY_FROM)
    return { ok: hasProvider && hasFrom, provider: process.env.RESEND_API_KEY ? 'resend' : (process.env.SMTP_HOST ? 'smtp' : null), from_present: hasFrom }
  }, 'RESEND_API_KEY/SMTP_HOST und MAIL_FROM setzen.'))

  tests.push(await safeRun('public_routes_ready', async () => {
    const r = await safeQuery(supabase.from('loyalty_programs').select('id,slug,active,metadata').limit(20))
    if (r.error) return { ok: false, hint: r.error.message }
    const rows = r.data || []
    return { ok: rows.every((x) => Boolean(x.slug) || x.active === false), programs: rows.length, missing_slug: rows.filter((x) => !x.slug).length }
  }, 'Loyalty Programme brauchen Slug für Public Flow.'))

  const ok = tests.every((t) => t.ok)
  return { ok, score: Math.round((tests.filter((t) => t.ok).length / Math.max(1, tests.length)) * 100), tests, checked_at: new Date().toISOString() }
}

module.exports = { runProductionSmokeTest }
