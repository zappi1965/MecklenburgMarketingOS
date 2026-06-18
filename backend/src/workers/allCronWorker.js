// Kombinierter Cron-Worker: startet ALLE periodischen Hintergrund-Jobs in
// EINEM Prozess. So braucht es auf Railway nur einen einzigen zusaetzlichen
// Worker-Service statt vier.
//
// Start (Railway Custom Start Command):  npm run worker:all
//
// Jeder Job hat seinen eigenen Cron-Ausdruck (per ENV ueberschreibbar):
//   automationWorker      AUTOMATION_WORKER_CRON   (Default */15 * * * *)
//   gdprWorker            GDPR_WORKER_CRON         (Default 30 4 * * *)
//   dailyBriefingWorker   DAILY_BRIEFING_CRON      (Default 0 7 * * *)
//   maintenanceCheckWorker MAINTENANCE_CHECK_CRON  (Default 30 5 * * *)
//   dsarExportWorker      DSAR_EXPORT_WORKER_CRON  (Default 0 5 * * *)
//   retentionWorker       RETENTION_WORKER_CRON    (Default 0 3 * * 0)
//   breachAlertWorker     BREACH_ALERT_WORKER_CRON (Default 0 6 * * *)
//
// Benoetigt: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (sonst No-Op).
// dailyBriefingWorker zusaetzlich: RESEND_API_KEY + MAIL_FROM + PUBLIC_APP_URL.

const automation = require('./automationWorker')
const gdpr = require('./gdprWorker')
const briefing = require('./dailyBriefingWorker')
const maintenance = require('./maintenanceCheckWorker')
const dsarExport = require('./dsarExportWorker')
const retention = require('./retentionWorker')
const breachAlert = require('./breachAlertWorker')

function start() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[worker:all] SUPABASE_URL/SERVICE_ROLE_KEY fehlen — Jobs laufen leer.')
  }
  const jobs = [
    ['automation', automation],
    ['gdpr', gdpr],
    ['dailyBriefing', briefing],
    ['maintenance', maintenance],
    ['dsarExport', dsarExport],
    ['retention', retention],
    ['breachAlert', breachAlert]
  ]
  for (const [name, mod] of jobs) {
    try {
      mod.startCron()
      console.log(`[worker:all] gestartet: ${name}`)
    } catch (e) {
      console.error(`[worker:all] ${name} konnte nicht starten:`, e?.message || e)
    }
  }
  console.log('[worker:all] alle Cron-Jobs registriert. Prozess bleibt aktiv.')
}

start()
