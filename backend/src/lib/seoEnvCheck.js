// Pruefung der SEO-Autopilot-Umgebungsvariablen. Liefert strukturierte
// Hinweise (Fehler/Warnungen), die beim Start geloggt werden koennen.
// Bewusst nicht-fatal: fehlende optionale Keys => Mock-Modus.

function validateSeoEnv(env = process.env) {
  const errors = []
  const warnings = []
  const isProd = String(env.NODE_ENV) === 'production'

  // Verschluesselung: in Produktion erforderlich, sobald CMS-Zugaenge gespeichert werden.
  if (!env.SEO_SECRET_KEY && !env.APP_ENCRYPTION_KEY) {
    (isProd ? errors : warnings).push(
      'SEO_SECRET_KEY fehlt – CMS-Zugangsdaten koennen nicht verschluesselt gespeichert werden (in Produktion blockiert).'
    )
  }

  // Optionale Anbieter (ohne => Mock).
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
    warnings.push('Kein ANTHROPIC_API_KEY/OPENAI_API_KEY – Artikel werden im Mock-Modus erzeugt (Platzhalter).')
  }
  if (!env.OPENAI_API_KEY) {
    warnings.push('Kein OPENAI_API_KEY – KI-Titelbilder laufen im Mock-Modus (SVG-Platzhalter).')
  }
  if (!(env.DATAFORSEO_LOGIN && env.DATAFORSEO_PASSWORD)) {
    warnings.push('Keine DATAFORSEO-Zugangsdaten – Keyword-Kennzahlen sind geschaetzt (Mock).')
  }
  if (String(env.SEO_METRICS_PROVIDER || 'mock').toLowerCase() !== 'gsc') {
    warnings.push('SEO_METRICS_PROVIDER != gsc – Performance-Kennzahlen sind Mock-Werte.')
  }

  return { ok: errors.length === 0, errors, warnings }
}

// Loggt das Ergebnis kompakt. Gibt true zurueck, wenn keine Fehler vorliegen.
function logSeoEnv(env = process.env, logger = console) {
  const { ok, errors, warnings } = validateSeoEnv(env)
  for (const e of errors) logger.error('[seoEnv][FEHLER]', e)
  for (const w of warnings) logger.warn('[seoEnv][Hinweis]', w)
  if (ok && !warnings.length) logger.log('[seoEnv] Alle SEO-Anbieter konfiguriert.')
  return ok
}

module.exports = { validateSeoEnv, logSeoEnv }
