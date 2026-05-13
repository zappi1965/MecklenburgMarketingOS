
const GoogleApiService = require('./googleApiService')

class ApiSyncService {
  constructor(supabase) {
    this.supabase = supabase
    this.google = new GoogleApiService(supabase)
  }

  async syncGoogleBusiness(customerId) {
    if (this.google.enabled) {
      return this.google.syncGoogleBusiness(customerId)
    }
    await this.supabase.from('activity_logs').insert({
      customer_id: customerId,
      actor_name: 'System',
      action: 'google_business_sync_placeholder',
      message: 'Google Business Sync vorbereitet; GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI erforderlich.'
    }).catch(()=>null)
    return { ok: true, provider: 'google_business', mode: 'placeholder_missing_env' }
  }

  async syncSearchConsole(customerId, siteUrl) {
    if (this.google.enabled && siteUrl) {
      return this.google.syncSearchConsole(customerId, siteUrl)
    }
    await this.supabase.from('activity_logs').insert({
      customer_id: customerId,
      actor_name: 'System',
      action: 'search_console_sync_placeholder',
      message: 'Search Console Sync vorbereitet; OAuth + siteUrl erforderlich.'
    }).catch(()=>null)
    return { ok: true, provider: 'search_console', mode: 'placeholder_missing_env_or_site' }
  }

  async syncAnalytics(customerId, propertyId) {
    if (this.google.enabled) {
      return this.google.syncAnalytics(customerId, propertyId)
    }
    await this.supabase.from('activity_logs').insert({
      customer_id: customerId,
      actor_name: 'System',
      action: 'analytics_sync_placeholder',
      message: 'Analytics Sync vorbereitet; OAuth + propertyId erforderlich.'
    }).catch(()=>null)
    return { ok: true, provider: 'analytics', mode: 'placeholder_missing_env' }
  }
}

module.exports = ApiSyncService
