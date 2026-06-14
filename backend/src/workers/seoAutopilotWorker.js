// SEO-Autopilot Worker (Milestone 3).
//
// Prueft faellige Veroeffentlichungs-Plaene (seo_publishing_schedules.enabled
// und next_run_at <= jetzt), erzeugt je Kunde aus dem naechsten freien Keyword
// einen Artikel und legt ihn als Entwurf an – oder veroeffentlicht ihn direkt,
// wenn auto_publish aktiv ist. Schreibt einen Lauf-Eintrag nach job_runs.
//
// Betrieb (Railway):
//   einmalig:  node src/workers/seoAutopilotWorker.js
//   Daemon:    node src/workers/seoAutopilotWorker.js --cron
//   Cron-Ausdruck via SEO_AUTOPILOT_CRON (Default: '0 6 * * *' = taeglich 06:00).

const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const seo = require('../services/seoAutopilotService')
const seoPublish = require('../services/seoPublishService')

function nextRun(cadence, from = new Date()) {
  const d = new Date(from)
  if (String(cadence) === 'daily') d.setUTCDate(d.getUTCDate() + 1)
  else d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString()
}

// Waehlt das naechste Keyword, fuer das es noch keinen Artikel gibt.
async function pickKeyword(db, customerId) {
  const { data: kws } = await db.from('seo_keyword_targets').select('keyword, priority')
    .eq('customer_id', customerId).order('priority', { ascending: false }).limit(100)
  if (!kws || !kws.length) return null
  const { data: existing } = await db.from('seo_articles').select('keyword').eq('customer_id', customerId).limit(500)
  const used = new Set((existing || []).map((a) => String(a.keyword || '').toLowerCase()))
  const fresh = kws.find((k) => !used.has(String(k.keyword).toLowerCase()))
  return fresh ? fresh.keyword : null
}

async function processSchedule(db, sched, summary) {
  const { data: customer } = await db.from('customers')
    .select('id, name, business_name, branch, brand_voice, city, metadata').eq('id', sched.customer_id).maybeSingle()
  if (!customer) { summary.skipped++; return }

  const keyword = await pickKeyword(db, sched.customer_id)
  if (!keyword) { summary.noKeyword++; return }

  let tone = customer.brand_voice || ''
  let audience = ''
  const { data: bp } = await db.from('seo_brand_profiles').select('tone, audience').eq('customer_id', sched.customer_id).maybeSingle()
  if (bp?.tone) tone = bp.tone
  audience = bp?.audience || ''

  const lang = sched.target_config?.language || 'de'
  const out = await seo.generateArticle({
    keyword, businessName: customer.business_name || customer.name || '', branch: customer.branch || '', tone, audience, language: lang
  })

  const now = new Date().toISOString()
  const row = {
    customer_id: sched.customer_id,
    keyword,
    title: out.article.title,
    slug: out.article.slug,
    meta_description: out.article.meta_description,
    body_markdown: out.article.body_markdown,
    internal_link_ideas: out.article.internal_link_ideas || [],
    language: out.article.language,
    status: 'draft',
    provider: out.provider,
    model: out.provider === 'mock' ? 'mock' : (process.env.ANTHROPIC_MODEL || process.env.OPENAI_MODEL || out.provider),
    approved_at: now,
    updated_at: now
  }
  const { data: inserted, error } = await db.from('seo_articles').insert(row).select('id').maybeSingle()
  if (error) throw new Error(error.message)
  summary.created++

  // Auto-Publish (zielabhaengig: In-App-Blog oder WordPress) ueber den
  // gemeinsamen Service – identisch zur manuellen Freigabe in der Admin-UI.
  if (sched.auto_publish && inserted?.id) {
    await seoPublish.publishArticle(db, inserted.id)
    summary.published++
  }
}

async function runOnce() {
  const db = getSupabaseAdmin()
  if (!db) { console.log('[seoAutopilotWorker] Supabase nicht konfiguriert – uebersprungen.'); return }
  const summary = { created: 0, published: 0, skipped: 0, noKeyword: 0, errors: 0 }
  const nowIso = new Date().toISOString()

  const { data: due } = await db.from('seo_publishing_schedules').select('*')
    .eq('enabled', true).or(`next_run_at.is.null,next_run_at.lte.${nowIso}`).limit(200)

  for (const sched of due || []) {
    try {
      await processSchedule(db, sched, summary)
    } catch (e) {
      summary.errors++
      console.error('[seoAutopilotWorker] Fehler fuer Kunde', sched.customer_id, e.message)
    } finally {
      await db.from('seo_publishing_schedules').update({
        last_run_at: nowIso, next_run_at: nextRun(sched.cadence, new Date()), updated_at: nowIso
      }).eq('id', sched.id)
    }
  }

  const message = `due=${(due || []).length} created=${summary.created} published=${summary.published} noKeyword=${summary.noKeyword} errors=${summary.errors}`
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
