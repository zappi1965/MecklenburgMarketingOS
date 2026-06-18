// SEO-Autopilot Worker (inkl. Autopilot 2.0).
//
// Pro faelligem Plan (seo_publishing_schedules.enabled, next_run_at <= jetzt):
//   1. performance-gesteuerte Keyword-Auswahl (deepen strong topics)
//   2. automatischer Keyword-Nachschub, wenn keine freien Keywords mehr da sind
//   3. Artikel generieren (+ KI-Titelbild) und als Entwurf anlegen
//   4. optional direkt veroeffentlichen (auto_publish, zielabhaengig)
//   5. Performance-Kennzahlen aller veroeffentlichten Artikel aktualisieren
//   6. einen schwachen Artikel als Verbesserungs-Entwurf nachschaerfen
// Schreibt einen Lauf-Eintrag nach job_runs.
//
// Betrieb (Railway):
//   einmalig:  node src/workers/seoAutopilotWorker.js
//   Daemon:    node src/workers/seoAutopilotWorker.js --cron
//   Cron-Ausdruck via SEO_AUTOPILOT_CRON (Default: '0 6 * * *' = taeglich 06:00).

const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const { logSeoEnv } = require('../lib/seoEnvCheck')
let getSentry = () => null
try { ({ getSentry } = require('../services/sentryService')) } catch (_) { /* Sentry optional */ }
const seo = require('../services/seoAutopilotService')
const seoPublish = require('../services/seoPublishService')
const seoImage = require('../services/seoImageService')
const seoMetrics = require('../services/seoMetricsService')
const seoKeywordData = require('../services/seoKeywordDataService')
const selection = require('../services/seoKeywordSelection')

function nextRun(cadence, from = new Date()) {
  const d = new Date(from)
  if (String(cadence) === 'daily') d.setUTCDate(d.getUTCDate() + 1)
  else d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString()
}

async function brandFor(db, customerId) {
  const { data: bp } = await db.from('seo_brand_profiles').select('tone, audience').eq('customer_id', customerId).maybeSingle()
  return { tone: bp?.tone || '', audience: bp?.audience || '' }
}

async function usedKeywordSet(db, customerId) {
  const { data } = await db.from('seo_articles').select('keyword').eq('customer_id', customerId).limit(500)
  return new Set((data || []).map((a) => String(a.keyword || '').toLowerCase()))
}

// Thematisches Signal aus gut performenden Artikeln (clicks > 0).
async function performanceSignal(db, customerId) {
  const { data: arts } = await db.from('seo_articles').select('id, keyword')
    .eq('customer_id', customerId).eq('status', 'published').limit(200)
  if (!arts || !arts.length) return new Map()
  const { data: mets } = await db.from('seo_article_metrics').select('article_id, clicks, metric_date')
    .eq('customer_id', customerId).order('metric_date', { ascending: false }).limit(2000)
  const latest = new Map()
  for (const m of mets || []) if (!latest.has(m.article_id)) latest.set(m.article_id, m)
  const perf = arts.map((a) => ({ keyword: a.keyword, clicks: latest.get(a.id)?.clicks || 0 })).filter((p) => p.clicks > 0)
  return selection.performanceSignal(perf)
}

// Automatischer Keyword-Nachschub: generiert neue Keywords inkl. Kennzahlen
// und speichert sie. Liefert die Anzahl neu hinzugefuegter Keywords.
async function replenishKeywords(db, customer) {
  const { audience } = await brandFor(db, customer.id)
  const gen = await seo.generateKeywords({
    businessName: customer.business_name || customer.name || '', branch: customer.branch || '',
    audience, city: customer.city || customer.metadata?.city || '', language: 'de', count: 12
  })
  const enriched = await seoKeywordData.enrichKeywords(gen.keywords, {})
  const rows = enriched.keywords.map((k) => ({
    customer_id: customer.id,
    keyword: String(k.keyword || '').trim(),
    intent: ['local', 'informational', 'transactional'].includes(String(k.intent)) ? String(k.intent) : 'informational',
    priority: Math.min(5, Math.max(1, Number(k.priority) || 3)),
    status: 'idea',
    search_volume: k.search_volume != null ? Math.max(0, Number(k.search_volume) || 0) : null,
    difficulty: k.difficulty != null ? Math.min(100, Math.max(0, Number(k.difficulty) || 0)) : null,
    cpc: k.cpc != null ? Math.round((Number(k.cpc) || 0) * 100) / 100 : null,
    data_provider: k.data_provider || null
  })).filter((k) => k.keyword)
  if (rows.length) {
    await db.from('seo_keyword_targets').upsert(rows, { onConflict: 'customer_id,keyword', ignoreDuplicates: true })
  }
  return rows.length
}

// Waehlt das beste freie Keyword; fuellt bei Bedarf automatisch nach.
async function chooseKeyword(db, customer, signal, summary) {
  const load = async () => (await db.from('seo_keyword_targets')
    .select('keyword, priority, search_volume, difficulty').eq('customer_id', customer.id).limit(300)).data || []
  const used = await usedKeywordSet(db, customer.id)
  let best = selection.pickBest(await load(), used, signal)
  if (!best) {
    const added = await replenishKeywords(db, customer)
    summary.replenished += added
    best = selection.pickBest(await load(), used, signal)
  }
  return best ? best.keyword : null
}

function modelLabel(provider) {
  return provider === 'mock' ? 'mock' : (process.env.ANTHROPIC_MODEL || process.env.OPENAI_MODEL || provider)
}

async function processSchedule(db, sched, summary) {
  const { data: customer } = await db.from('customers')
    .select('id, name, business_name, branch, brand_voice, city, metadata').eq('id', sched.customer_id).maybeSingle()
  if (!customer) { summary.skipped++; return }

  const signal = await performanceSignal(db, customer.id)
  const keyword = await chooseKeyword(db, customer, signal, summary)

  if (keyword) {
    const { tone, audience } = await brandFor(db, customer.id)
    const lang = sched.target_config?.language || 'de'
    const out = await seo.generateArticle({
      keyword, businessName: customer.business_name || customer.name || '', branch: customer.branch || '', tone: tone || customer.brand_voice || '', audience, language: lang
    })
    // KI-Titelbild automatisch erzeugen.
    let cover = null
    try { cover = (await seoImage.generateCoverImage({ title: out.article.title, branch: customer.branch || '', businessName: customer.business_name || customer.name || '' })).url } catch (_) {}

    const now = new Date().toISOString()
    const { data: inserted, error } = await db.from('seo_articles').insert({
      customer_id: customer.id, keyword,
      title: out.article.title, slug: out.article.slug, meta_description: out.article.meta_description,
      body_markdown: out.article.body_markdown, internal_link_ideas: out.article.internal_link_ideas || [],
      language: out.article.language, status: 'draft', provider: out.provider, model: modelLabel(out.provider),
      cover_image_url: cover, approved_at: now, updated_at: now
    }).select('id').maybeSingle()
    if (error) throw new Error(error.message)
    summary.created++

    if (sched.auto_publish && inserted?.id) {
      await seoPublish.publishArticle(db, inserted.id)
      summary.published++
    }
  } else {
    summary.noKeyword++
  }

  // Performance-Kennzahlen aktualisieren (Cron statt manuell).
  try { await refreshCustomerMetrics(db, customer.id) } catch (_) {}

  // Einen schwachen Artikel nachschaerfen (Verbesserungs-Entwurf).
  try { await refineWeakArticle(db, customer, summary) } catch (_) {}
}

async function refreshCustomerMetrics(db, customerId) {
  const { data: arts } = await db.from('seo_articles').select('id, published_at')
    .eq('customer_id', customerId).eq('status', 'published').limit(500)
  const today = new Date().toISOString().slice(0, 10)
  for (const a of arts || []) {
    const m = await seoMetrics.fetchMetrics(a)
    await db.from('seo_article_metrics').upsert({
      article_id: a.id, customer_id: customerId, metric_date: today,
      impressions: m.impressions, clicks: m.clicks, position: m.position, ctr: m.ctr, source: m.source
    }, { onConflict: 'article_id,metric_date' })
  }
}

// Findet den schwaechsten aelteren Artikel (>=14 Tage, wenige Klicks) ohne
// bestehende Ueberarbeitung und legt einen verbesserten Entwurf zur Freigabe an.
async function refineWeakArticle(db, customer, summary) {
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString()
  const { data: weak } = await db.from('seo_articles')
    .select('id, keyword, title, published_at')
    .eq('customer_id', customer.id).eq('status', 'published').lt('published_at', cutoff).limit(50)
  if (!weak || !weak.length) return

  const { data: mets } = await db.from('seo_article_metrics').select('article_id, clicks, metric_date')
    .eq('customer_id', customer.id).order('metric_date', { ascending: false }).limit(2000)
  const latest = new Map()
  for (const m of mets || []) if (!latest.has(m.article_id)) latest.set(m.article_id, m)

  const { data: existingRef } = await db.from('seo_articles').select('source_article_id')
    .eq('customer_id', customer.id).not('source_article_id', 'is', null).limit(500)
  const refined = new Set((existingRef || []).map((r) => r.source_article_id))

  const cand = weak
    .filter((a) => (latest.get(a.id)?.clicks || 0) < 3 && !refined.has(a.id))
    .sort((a, b) => (latest.get(a.id)?.clicks || 0) - (latest.get(b.id)?.clicks || 0))[0]
  if (!cand) return

  const { tone, audience } = await brandFor(db, customer.id)
  const out = await seo.generateArticle({
    keyword: cand.keyword, businessName: customer.business_name || customer.name || '',
    branch: customer.branch || '', tone: tone || customer.brand_voice || '', audience, language: 'de'
  })
  const now = new Date().toISOString()
  await db.from('seo_articles').insert({
    customer_id: customer.id, keyword: cand.keyword,
    title: out.article.title, slug: `${out.article.slug}-v2`, meta_description: out.article.meta_description,
    body_markdown: out.article.body_markdown, internal_link_ideas: out.article.internal_link_ideas || [],
    language: out.article.language, status: 'draft', provider: out.provider, model: modelLabel(out.provider),
    is_refinement: true, source_article_id: cand.id, approved_at: now, updated_at: now
  })
  summary.refined++
}

async function runOnce() {
  const db = getSupabaseAdmin()
  if (!db) { console.log('[seoAutopilotWorker] Supabase nicht konfiguriert – uebersprungen.'); return }
  logSeoEnv()
  const summary = { created: 0, published: 0, replenished: 0, refined: 0, skipped: 0, noKeyword: 0, errors: 0 }
  const nowIso = new Date().toISOString()

  const { data: due } = await db.from('seo_publishing_schedules').select('*')
    .eq('enabled', true).or(`next_run_at.is.null,next_run_at.lte.${nowIso}`).limit(200)

  for (const sched of due || []) {
    try {
      await processSchedule(db, sched, summary)
    } catch (e) {
      summary.errors++
      console.error('[seoAutopilotWorker] Fehler fuer Kunde', sched.customer_id, e.message)
      try { getSentry()?.captureException(e, { tags: { worker: 'seo_autopilot' }, extra: { customer_id: sched.customer_id } }) } catch (_) {}
    } finally {
      await db.from('seo_publishing_schedules').update({
        last_run_at: nowIso, next_run_at: nextRun(sched.cadence, new Date()), updated_at: nowIso
      }).eq('id', sched.id)
    }
  }

  const message = `due=${(due || []).length} created=${summary.created} published=${summary.published} `
    + `replenished=${summary.replenished} refined=${summary.refined} noKeyword=${summary.noKeyword} errors=${summary.errors}`
  console.log('[seoAutopilotWorker]', message)
  try {
    await db.from('job_runs').insert({
      job_name: 'seo_autopilot', status: summary.errors ? 'partial' : 'success', message, finished_at: nowIso
    })
  } catch (_) { /* job_runs optional */ }
  return summary
}

if (require.main === module) {
  if (process.argv.includes('--cron')) {
    const schedule = process.env.SEO_AUTOPILOT_CRON || '0 6 * * *'
    cron.schedule(schedule, () => { runOnce().catch((e) => console.error('[seoAutopilotWorker]', e.message)) })
    console.log(`[seoAutopilotWorker] geplant: ${schedule}`)
  } else {
    runOnce().then(() => process.exit(0)).catch((e) => { console.error('[seoAutopilotWorker]', e.message); process.exit(1) })
  }
}

module.exports = { runOnce, _nextRun: nextRun }
