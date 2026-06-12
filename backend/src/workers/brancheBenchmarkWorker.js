// Branchen-Benchmark-Worker.
// Berechnet monatlich die k-anonymen Aggregate und erzeugt je Premium-Kunde
// einen Report (PDF via Gotenberg-Pipeline). Läuft mit Service-Role.
//
// Modi:
//   node src/workers/brancheBenchmarkWorker.js        # one-shot (Vormonat)
//   node src/workers/brancheBenchmarkWorker.js --cron # daemon
//
// Cron-Default: 6. des Monats 03:00 UTC (BRANCHE_BENCHMARK_CRON überschreibbar).
// Benötigt SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (sonst No-Op).

const cron = require('node-cron')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const { BrancheBenchmarkService } = require('../services/brancheBenchmarkService')
const { renderAndStoreDocument } = require('../services/documentEngineV2Service')

const JOB_NAME = 'branche_benchmark_worker'
const ADMIN_REQ = { userRole: 'admin', userStatus: 'active', user: { id: 'system_worker', email: 'system@mmos' } }

function lastMonthPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))
  const iso = (d) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

async function logJob(supabase, status, message = null) {
  if (!supabase) return
  try {
    await supabase.from('job_runs').insert({ job_name: JOB_NAME, status, message, finished_at: new Date().toISOString() })
  } catch (_) {}
}

async function emailReport(supabase, customerId, report, period) {
  try {
    const { data: cust } = await supabase.from('customers').select('email, name').eq('id', customerId).maybeSingle()
    const to = cust?.email
    if (!to) return false
    const MailService = require('../services/mailService')
    const mail = new MailService()
    const result = await mail.send({
      to,
      subject: `Dein Branchen-Benchmark ${period.start}`,
      html: `<p>Hallo ${cust?.name || ''},</p><p>dein anonymer Branchen-Benchmark für ${period.start} bis ${period.end} ist verfügbar.</p><p><a href="${report.pdf_url}">Report öffnen</a></p>`,
      text: `Dein Branchen-Benchmark ${period.start}: ${report.pdf_url}`
    })
    return Boolean(result?.ok ?? true)
  } catch (_) {
    return false
  }
}

async function premiumCustomerIds(supabase) {
  // Premium-Kunden ermitteln (defensive: tolerant gegenüber Schemavarianten).
  try {
    const { data } = await supabase.from('customers').select('id, package, tier').limit(5000)
    return (data || [])
      .filter((c) => /premium/i.test(String(c.package || c.tier || '')))
      .map((c) => c.id)
  } catch (_) {
    return []
  }
}

async function runOnce(period) {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.log('[brancheBenchmarkWorker] Supabase nicht konfiguriert.')
    return { skipped: true }
  }
  const p = period || lastMonthPeriod()
  await logJob(supabase, 'running', `period=${p.start}..${p.end}`)
  try {
    const service = new BrancheBenchmarkService(supabase, { documentEngine: renderAndStoreDocument })
    const agg = await service.computeAggregates(p)
    const ids = await premiumCustomerIds(supabase)
    let generated = 0
    let emailed = 0
    const mailEnabled = String(process.env.BRANCHE_BENCHMARK_EMAIL || '').toLowerCase() === 'true'
    for (const customer_id of ids) {
      try {
        const report = await service.generateReport(ADMIN_REQ, { customer_id, period: p })
        generated += 1
        if (mailEnabled && report?.pdf_url) {
          const sent = await emailReport(supabase, customer_id, report, p)
          if (sent) emailed += 1
        }
      } catch (e) {
        console.error('[brancheBenchmarkWorker] report failed', customer_id, e?.message || e)
      }
    }
    const msg = `branches=${agg.branches} aggregates=${agg.rows} reports=${generated} emailed=${emailed}`
    console.log(`[brancheBenchmarkWorker] ${msg}`)
    await logJob(supabase, 'completed', msg)
    return { ...agg, reports: generated }
  } catch (e) {
    console.error('[brancheBenchmarkWorker]', e?.message || e)
    await logJob(supabase, 'failed', e?.message || String(e))
    throw e
  }
}

function start() {
  const expr = process.env.BRANCHE_BENCHMARK_CRON || '0 3 6 * *'
  console.log(`[brancheBenchmarkWorker] cron aktiv: ${expr}`)
  cron.schedule(expr, () => { runOnce().catch(() => {}) })
}

if (require.main === module) {
  if (process.argv.includes('--cron')) start()
  else runOnce().then(() => process.exit(0)).catch(() => process.exit(1))
}

module.exports = { runOnce, start, startCron: start, lastMonthPeriod }
