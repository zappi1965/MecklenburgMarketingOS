const GoogleApiService = require('./googleApiService')

const PROVIDER_ALIASES = {
  'google-business': 'google_business',
  'google business': 'google_business',
  'google business profile': 'google_business',
  'business profile': 'google_business',
  'gbp': 'google_business',
  'google_business': 'google_business',
  'search-console': 'search_console',
  'search console': 'search_console',
  'google search console': 'search_console',
  'gsc': 'search_console',
  'search_console': 'search_console',
  'analytics': 'analytics',
  'google analytics': 'analytics',
  'google analytics 4': 'analytics',
  'ga4': 'analytics',
  'meta': 'meta',
  'meta business suite': 'meta'
}

function normalizeProvider(provider = '') {
  const key = decodeURIComponent(String(provider || '')).trim().toLowerCase().replace(/_/g, '-')
  return PROVIDER_ALIASES[key] || PROVIDER_ALIASES[key.replace(/-/g, '_')] || key.replace(/-/g, '_')
}

function envMissingError(provider, missingEnv, message) {
  const err = new Error(message || `${provider} ist nicht vollständig konfiguriert.`)
  err.status = 503
  err.code = 'PROVIDER_ENV_MISSING'
  err.provider = provider
  err.missing_env = missingEnv
  err.hint = `Hinterlege ${missingEnv.join(', ')} in Railway und starte den Backend-Service neu.`
  return err
}

class ApiSyncService {
  constructor(supabase) {
    this.supabase = supabase
    this.google = new GoogleApiService(supabase)
  }

  static normalizeProvider(provider) {
    return normalizeProvider(provider)
  }

  normalizeProvider(provider) {
    return normalizeProvider(provider)
  }

  googleOauthMissing() {
    return ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'].filter((key) => !process.env[key])
  }

  requireGoogleOauth(provider) {
    const missing = this.googleOauthMissing()
    if (!this.google.enabled || missing.length) {
      throw envMissingError(provider, missing, `${provider} benötigt Google OAuth. Es werden keine Platzhalter-Syncs als erfolgreich gespeichert.`)
    }
  }

  async log(customerId, action, message, metadata = {}) {
    if (!this.supabase || !customerId) return null
    try {
      await this.supabase.from('activity_logs').insert({
        customer_id: customerId,
        actor_name: 'System',
        action,
        message,
        metadata
      })
    } catch (_) {}
    return null
  }

  async syncGoogleBusiness(customerId) {
    this.requireGoogleOauth('google_business')
    return this.google.syncGoogleBusiness(customerId)
  }

  async syncSearchConsole(customerId, siteUrl) {
    this.requireGoogleOauth('search_console')
    if (!siteUrl) {
      const err = new Error('Search Console benötigt site_url für den Sync.')
      err.status = 400
      err.code = 'SEARCH_CONSOLE_SITE_URL_MISSING'
      err.provider = 'search_console'
      err.hint = 'Speichere beim Kunden die verifizierte Search-Console-Property, z. B. https://domain.de/ oder sc-domain:domain.de.'
      throw err
    }
    return this.google.syncSearchConsole(customerId, siteUrl)
  }

  async syncAnalytics(customerId, propertyId) {
    this.requireGoogleOauth('analytics')
    if (!propertyId) {
      const err = new Error('Analytics benötigt property_id für den GA4-Sync.')
      err.status = 400
      err.code = 'ANALYTICS_PROPERTY_ID_MISSING'
      err.provider = 'analytics'
      err.hint = 'Speichere beim Kunden die GA4 Property ID, z. B. 123456789.'
      throw err
    }
    return this.google.syncAnalytics(customerId, propertyId)
  }

  async sync(provider, customerId, payload = {}) {
    const normalized = normalizeProvider(provider)
    if (normalized === 'google_business') return this.syncGoogleBusiness(customerId)
    if (normalized === 'search_console') return this.syncSearchConsole(customerId, payload.site_url)
    if (normalized === 'analytics') return this.syncAnalytics(customerId, payload.property_id)
    if (normalized === 'meta') {
      const err = new Error('Meta Business Suite ist im UI vorbereitet, aber noch nicht produktiv angebunden.')
      err.status = 501
      err.code = 'PROVIDER_NOT_IMPLEMENTED'
      err.provider = 'meta'
      err.hint = 'Meta erst aktivieren, wenn App-ID, Secret, OAuth-Flow und Graph-API-Mapping hinterlegt sind.'
      throw err
    }
    const err = new Error(`Unbekannter API Provider: ${provider}`)
    err.status = 400
    err.code = 'UNKNOWN_PROVIDER'
    err.provider = provider
    err.hint = 'Erlaubt sind google-business/google_business, search-console/search_console, analytics oder meta.'
    throw err
  }
}

module.exports = ApiSyncService
module.exports.normalizeProvider = normalizeProvider
