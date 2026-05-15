
class GoogleApiService {
  constructor(supabase) {
    this.supabase = supabase
    this.clientId = process.env.GOOGLE_CLIENT_ID
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI
  }

  get enabled() {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri)
  }

  authUrl(customerId, scopes = []) {
    if (!this.enabled) throw new Error('Google OAuth ENV fehlt')
    const defaultScopes = [
      'https://www.googleapis.com/auth/business.manage',
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly'
    ]
    const scope = encodeURIComponent((scopes.length ? scopes : defaultScopes).join(' '))
    const state = encodeURIComponent(JSON.stringify({ customer_id: customerId }))
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`
  }

  async exchangeCode(code) {
    if (!this.enabled) throw new Error('Google OAuth ENV fehlt')
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      })
    })
    if (!res.ok) throw new Error(`Google Token Exchange fehlgeschlagen: ${res.status}`)
    return res.json()
  }

  async refreshToken(refresh_token) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token'
      })
    })
    if (!res.ok) throw new Error(`Google Token Refresh fehlgeschlagen: ${res.status}`)
    return res.json()
  }

  async saveTokens(customerId, provider, tokenData) {
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null

    const { data, error } = await this.supabase
      .from('oauth_tokens')
      .upsert({
        customer_id: customerId,
        provider,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
        token_type: tokenData.token_type,
        expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'customer_id,provider' })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getValidToken(customerId, provider) {
    const { data, error } = await this.supabase
      .from('oauth_tokens')
      .select('*')
      .eq('customer_id', customerId)
      .eq('provider', provider)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error(`Kein OAuth Token für ${provider}`)

    const isExpired = data.expires_at && new Date(data.expires_at).getTime() < Date.now() + 60_000
    if (isExpired && data.refresh_token) {
      const refreshed = await this.refreshToken(data.refresh_token)
      return this.saveTokens(customerId, provider, { ...refreshed, refresh_token: data.refresh_token })
    }

    return data
  }

  async fetchJson(url, token) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Google API Fehler ${res.status}: ${await res.text()}`)
    return res.json()
  }

  async syncSearchConsole(customerId, siteUrl) {
    const token = await this.getValidToken(customerId, 'google')
    if (!siteUrl) throw new Error('Search Console siteUrl fehlt')

    const end = new Date()
    const start = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        dimensions: ['query'],
        rowLimit: 25
      })
    })
    if (!res.ok) throw new Error(`Search Console Sync Fehler: ${res.status}`)
    const json = await res.json()

    for (const row of json.rows || []) {
      await this.supabase.from('customer_seo_metrics').insert({
        customer_id: customerId,
        keyword: row.keys?.[0] || 'Keyword',
        clicks: Math.round(row.clicks || 0),
        impressions: Math.round(row.impressions || 0),
        ranking: Math.round(row.position || 0),
        visibility: Math.round((row.ctr || 0) * 100)
      }).catch(() => null)
    }

    return { ok: true, provider: 'search_console', rows: json.rows?.length || 0 }
  }

  async syncGoogleBusiness(customerId) {
    const token = await this.getValidToken(customerId, 'google')
    // Google Business Profile API has account/location discovery; this sync records readiness.
    await this.supabase.from('activity_logs').insert({
      customer_id: customerId,
      actor_name: 'System',
      action: 'google_business_sync_ready',
      message: 'Google Business OAuth aktiv. Location-Discovery kann nun angebunden werden.'
    }).catch(() => null)
    return { ok: true, provider: 'google_business', mode: 'oauth_ready', token: Boolean(token.access_token) }
  }

  async syncAnalytics(customerId, propertyId) {
    const token = await this.getValidToken(customerId, 'google')
    if (!propertyId) {
      await this.supabase.from('activity_logs').insert({
        customer_id: customerId,
        actor_name: 'System',
        action: 'analytics_sync_needs_property',
        message: 'GA4 OAuth aktiv, aber propertyId fehlt.'
      }).catch(()=>null)
      return { ok: true, provider: 'analytics', mode: 'needs_property' }
    }

    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }]
      })
    })
    if (!res.ok) throw new Error(`GA4 Sync Fehler: ${res.status}`)
    const json = await res.json()
    await this.supabase.from('activity_logs').insert({
      customer_id: customerId,
      actor_name: 'System',
      action: 'analytics_sync_completed',
      message: `GA4 Sync abgeschlossen: ${JSON.stringify(json.totals || [])}`
    }).catch(()=>null)
    return { ok: true, provider: 'analytics', mode: 'synced' }
  }
}

module.exports = GoogleApiService
