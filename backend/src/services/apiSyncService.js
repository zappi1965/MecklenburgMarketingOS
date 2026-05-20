const GoogleApiService = require('./googleApiService')

class ApiSyncService {
  constructor(supabase) {
    this.supabase = supabase
    this.google = new GoogleApiService(supabase)
  }

  async log(customerId, action, message, metadata = {}) {
    if (!this.supabase) return null
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
    if (this.google.enabled) {
      return this.google.syncGoogleBusiness(customerId)
    }
    await this.log(customerId, 'google_business_sync_placeholder', 'Google Business Sync vorbereitet; GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI erforderlich.')
    return { ok: true, provider: 'google_business', mode: 'placeholder_missing_env' }
  }

  async syncSearchConsole(customerId, siteUrl) {
    if (this.google.enabled && siteUrl) {
      return this.google.syncSearchConsole(customerId, siteUrl)
    }
    await this.log(customerId, 'search_console_sync_placeholder', 'Search Console Sync vorbereitet; OAuth + siteUrl erforderlich.', { siteUrl: Boolean(siteUrl), oauth: this.google.enabled })
    return { ok: true, provider: 'search_console', mode: this.google.enabled ? 'placeholder_missing_site' : 'placeholder_missing_env_or_site' }
  }

  async syncAnalytics(customerId, propertyId) {
    if (this.google.enabled) {
      return this.google.syncAnalytics(customerId, propertyId)
    }
    await this.log(customerId, 'analytics_sync_placeholder', 'Analytics Sync vorbereitet; OAuth + propertyId erforderlich.', { propertyId: Boolean(propertyId), oauth: this.google.enabled })
    return { ok: true, provider: 'analytics', mode: 'placeholder_missing_env' }
  }
}

module.exports = ApiSyncService
