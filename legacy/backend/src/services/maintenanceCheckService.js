// Wartungs-Reminder-Service.
//
// Cron-Worker scannt taeglich alle Customer, prueft 10+ Rule-Checks,
// schreibt offene Befunde in maintenance_alerts (idempotent per
// unique(customer_id, rule_key, status='open')).
//
// Frontend zeigt offene Alerts mit "fixen"-Deep-Links pro Customer.

const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

const RULES = [
  {
    key: 'logo_missing',
    category: 'branding',
    severity: 'warning',
    title: 'Logo fehlt',
    description: 'In den Landing-Page-Einstellungen ist keine Logo-URL hinterlegt.',
    fix_action: 'open_branding_editor',
    fix_url: '/admin/seo',
    check: ({ customer, landing }) => {
      const url = landing?.logo_url || customer?.metadata?.brand_logo_url
      return !url
    }
  },
  {
    key: 'no_loyalty_program',
    category: 'loyalty',
    severity: 'info',
    title: 'Kein Loyalty-Programm',
    description: 'Dieser Customer hat noch kein aktives Loyalty-Programm.',
    fix_action: 'create_loyalty_program',
    fix_url: '/admin/onboarding',
    check: ({ loyaltyPrograms }) => (loyaltyPrograms?.length || 0) === 0
  },
  {
    key: 'no_active_reward',
    category: 'loyalty',
    severity: 'warning',
    title: 'Loyalty-Programm ohne Reward',
    description: 'Es gibt ein Loyalty-Programm, aber keine aktiven Rewards.',
    fix_action: 'create_first_reward',
    fix_url: '/admin/onboarding',
    check: ({ loyaltyPrograms, loyaltyRewards }) => (loyaltyPrograms?.length || 0) > 0 && (loyaltyRewards?.length || 0) === 0
  },
  {
    key: 'qr_inactive_30d',
    category: 'loyalty',
    severity: 'warning',
    title: 'QR-Kampagne inaktiv',
    description: 'Eine QR-Kampagne hat seit ueber 30 Tagen keinen Scan erhalten.',
    fix_action: 'review_qr_promotion',
    fix_url: '/admin/seo',
    check: ({ qrCampaigns, now }) => {
      const cutoff = new Date(now.getTime() - 30 * 86_400_000).toISOString()
      return (qrCampaigns || []).some((q) => {
        const last = q.last_scan_at || q.updated_at
        return last && last < cutoff
      })
    }
  },
  {
    key: 'mfa_admin_missing',
    category: 'security',
    severity: 'critical',
    title: '2FA nicht aktiv (Admin)',
    description: 'Mindestens ein Admin-User dieses Customers hat 2FA nicht aktiviert. Risiko fuer Account-Uebernahme.',
    fix_action: 'enable_mfa',
    fix_url: '/admin/security',
    check: ({ adminUsers }) => (adminUsers || []).some((u) => !u.mfa_enabled)
  },
  {
    key: 'no_dunning_levels',
    category: 'billing',
    severity: 'info',
    title: 'Mahnstufen nicht konfiguriert',
    description: 'Es sind keine Dunning-Levels fuer diesen Customer angelegt. Default-Stufen koennen mit einem Klick erzeugt werden.',
    fix_action: 'seed_dunning_defaults',
    fix_url: '/admin/dunning',
    check: ({ dunningLevels }) => (dunningLevels?.length || 0) === 0
  },
  {
    key: 'overdue_invoices',
    category: 'billing',
    severity: 'critical',
    title: 'Ueberfaellige Rechnungen',
    description: 'Es gibt offene, ueberfaellige Rechnungen — Mahnlauf empfohlen.',
    fix_action: 'run_dunning_sweep',
    fix_url: '/admin/dunning',
    check: ({ overdueInvoices }) => (overdueInvoices?.length || 0) > 0
  },
  {
    key: 'no_compliance_activities',
    category: 'compliance',
    severity: 'warning',
    title: 'Verfahrensverzeichnis leer',
    description: 'Art. 30 DSGVO verlangt ein Verzeichnis der Verarbeitungstaetigkeiten. Aktuell ist es leer.',
    fix_action: 'fill_processing_activities',
    fix_url: '/admin/compliance',
    check: ({ processingActivities }) => (processingActivities?.length || 0) === 0
  },
  {
    key: 'no_processors',
    category: 'compliance',
    severity: 'warning',
    title: 'Auftragsverarbeiter nicht dokumentiert',
    description: 'Liste der Auftragsverarbeiter ist leer. Bitte mindestens Supabase, Vercel/Railway und Mail-Provider ergaenzen.',
    fix_action: 'fill_processors',
    fix_url: '/admin/compliance',
    check: ({ dataProcessors }) => (dataProcessors?.length || 0) === 0
  },
  {
    key: 'expired_offer_active',
    category: 'content',
    severity: 'warning',
    title: 'Abgelaufenes Angebot noch sichtbar',
    description: 'Ein GMB-Angebot oder Reward hat sein Enddatum ueberschritten, ist aber noch aktiv.',
    fix_action: 'archive_expired_offer',
    fix_url: '/admin/gmb',
    check: ({ gmbPosts, now }) => (gmbPosts || []).some((p) =>
      p.post_type === 'OFFER' && p.end_time && new Date(p.end_time) < now && p.status === 'published'
    )
  }
]

async function loadCustomerContext(supabase, customer, now) {
  const cid = customer.id
  const [
    landing, loyaltyPrograms, loyaltyRewards, qrCampaigns,
    adminUsers, dunningLevels, overdueInvoices,
    processingActivities, dataProcessors, gmbPosts
  ] = await Promise.all([
    supabase.from('landing_page_settings').select('logo_url, hero_title').eq('customer_id', cid).maybeSingle().then((r) => r.data),
    supabase.from('loyalty_programs').select('id, active').eq('customer_id', cid).then((r) => r.data || []),
    supabase.from('loyalty_rewards').select('id, active, expires_at').eq('customer_id', cid).eq('active', true).then((r) => r.data || []),
    supabase.from('qr_campaigns').select('id, slug, last_scan_at, updated_at, active').eq('customer_id', cid).then((r) => r.data || []),
    supabase.from('customer_users').select('auth_user_id').eq('customer_id', cid).eq('role', 'owner').then(async ({ data }) => {
      const ids = (data || []).map((u) => u.auth_user_id).filter(Boolean)
      if (!ids.length) return []
      const { data: profiles } = await supabase.from('user_profiles').select('id, mfa_enabled, role, status').in('id', ids)
      return profiles || []
    }),
    supabase.from('dunning_levels').select('id, level').eq('customer_id', cid).then((r) => r.data || []),
    supabase.from('invoices').select('id, status, due_date').eq('customer_id', cid).lt('due_date', now.toISOString()).not('status', 'ilike', '%bezahlt%').not('status', 'ilike', '%paid%').then((r) => r.data || []),
    supabase.from('data_processing_activities').select('id, status').or(`customer_id.eq.${cid},customer_id.is.null`).eq('status', 'active').then((r) => r.data || []),
    supabase.from('data_processors').select('id, status').or(`customer_id.eq.${cid},customer_id.is.null`).eq('status', 'active').then((r) => r.data || []),
    supabase.from('gmb_posts').select('id, post_type, status, end_time').eq('customer_id', cid).limit(50).then((r) => r.data || [])
  ])

  return {
    customer, landing, loyaltyPrograms, loyaltyRewards, qrCampaigns,
    adminUsers, dunningLevels, overdueInvoices,
    processingActivities, dataProcessors, gmbPosts, now
  }
}

async function upsertAlert(supabase, alert) {
  // Versuche INSERT — bei Unique-Violation ist die Alert schon offen,
  // wir lassen sie unveraendert.
  try {
    await supabase.from('maintenance_alerts').insert(alert)
  } catch (_) {}
}

async function resolveAlert(supabase, customer_id, rule_key) {
  try {
    await supabase
      .from('maintenance_alerts')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('customer_id', customer_id)
      .eq('rule_key', rule_key)
      .eq('status', 'open')
  } catch (_) {}
}

async function runChecksForCustomer(supabase, customer, now) {
  const ctx = await loadCustomerContext(supabase, customer, now)
  const fired = []
  for (const rule of RULES) {
    let triggered = false
    try { triggered = Boolean(rule.check(ctx)) } catch (_) { triggered = false }
    if (triggered) {
      await upsertAlert(supabase, {
        customer_id: customer.id,
        category: rule.category,
        severity: rule.severity,
        rule_key: rule.key,
        title: rule.title,
        description: rule.description,
        fix_url: rule.fix_url,
        fix_action: rule.fix_action,
        metadata: {}
      })
      fired.push(rule.key)
    } else {
      // Auto-resolve: wenn eine Regel jetzt NICHT mehr triggert, aber
      // ein offener Alert existiert -> als resolved markieren.
      await resolveAlert(supabase, customer.id, rule.key)
    }
  }
  return { customer_id: customer.id, fired }
}

async function runAllChecks({ now = new Date() } = {}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { skipped: true, reason: 'no_supabase' }
  const { data: customers } = await supabase
    .from('customers').select('id, name, metadata, status').or('status.is.null,status.eq.active').limit(500)
  const results = []
  for (const customer of customers || []) {
    try {
      results.push(await runChecksForCustomer(supabase, customer, now))
    } catch (e) {
      results.push({ customer_id: customer.id, error: e?.message || String(e) })
    }
  }
  const fired = results.reduce((s, r) => s + (r.fired?.length || 0), 0)
  return { processed: results.length, fired_total: fired, results }
}

async function listOpenAlerts({ customer_id, severity } = {}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return []
  let q = supabase
    .from('maintenance_alerts')
    .select('*')
    .eq('status', 'open')
    .order('severity', { ascending: false })
    .order('detected_at', { ascending: false })
    .limit(500)
  if (customer_id) q = q.eq('customer_id', customer_id)
  if (severity) q = q.eq('severity', severity)
  const { data } = await q
  return data || []
}

async function dismissAlert({ id }) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  const { data, error } = await supabase
    .from('maintenance_alerts')
    .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status')
    .maybeSingle()
  if (error) throw error
  return data
}

module.exports = {
  RULES,
  runAllChecks,
  runChecksForCustomer,
  listOpenAlerts,
  dismissAlert
}
