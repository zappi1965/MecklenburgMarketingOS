
const express = require('express')
const crypto = require('crypto')
const { V35BusinessEngine, sentimentFromRating } = require('../services/v35BusinessEngine')

const safeToken = (prefix = 'tok') => `${prefix}_${crypto.randomBytes(12).toString('hex')}`
const clean = (v) => v === undefined || v === null ? null : String(v).trim() || null
const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback

function slugify(input, fallback = 'kunde') {
  const s = String(input || fallback)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || fallback
}

function v33FunctionalRoutes(supabase) {
  const router = express.Router()
  const engine = new V35BusinessEngine(supabase)

  function v39ErrorPayload(code, message, details = null, hint = null, warnings = []) {
    return { ok: false, code, error: message, details, hint, warnings }
  }

  async function v39SafeInsert(table, payload, warnings, label = table) {
    try {
      const { data, error } = await supabase.from(table).insert(payload).select('*').single()
      if (error) {
        warnings.push({ label, table, error: error.message, hint: `Prüfe Tabelle/Spalten für ${table}` })
        return null
      }
      return data
    } catch (e) {
      warnings.push({ label, table, error: e.message, hint: `Prüfe Tabelle/Spalten für ${table}` })
      return null
    }
  }

  async function v39SafeUpdate(table, patch, eqKey, eqValue, warnings, label = table) {
    try {
      const { data, error } = await supabase.from(table).update(patch).eq(eqKey, eqValue).select('*').maybeSingle()
      if (error) {
        warnings.push({ label, table, error: error.message, hint: `Prüfe Tabelle/Spalten für ${table}` })
        return null
      }
      return data
    } catch (e) {
      warnings.push({ label, table, error: e.message, hint: `Prüfe Tabelle/Spalten für ${table}` })
      return null
    }
  }

  async function v39LogEngineRun(customerId, engineKey, status, input = {}, output = {}, error = null, startedAt = null) {
    const finishedAt = new Date()
    const started = startedAt ? new Date(startedAt) : finishedAt
    const durationMs = Math.max(0, finishedAt.getTime() - started.getTime())
    try {
      await supabase.from('v35_engine_runs').insert({
        customer_id: customerId || null,
        engine_key: engineKey,
        status,
        input,
        output: {
          ...(output || {}),
          error: error ? String(error.message || error) : null,
          duration_ms: durationMs,
          finished_at: finishedAt.toISOString()
        }
      })
    } catch (_) {}
  }

  async function v39FindRecentLead(customerId, slug, email, deviceId) {
    if (!email && !deviceId) return null
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    let q = supabase.from('v33_public_leads')
      .select('*')
      .eq('customer_id', customerId)
      .eq('slug', slug)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
    if (email) q = q.eq('email', email)
    else q = q.contains('metadata', { device_id: deviceId })
    const found = await q.maybeSingle()
    if (!found.error && found.data) return found.data
    return null
  }

  async function v39CheckRewardLimits(customerId, rewardId, memberName = null) {
    const warnings = []
    const rewardQuery = await supabase.from('v33_functional_records')
      .select('*')
      .eq('customer_id', customerId)
      .eq('resource', 'loyalty_rewards')
      .or(`local_id.eq.${rewardId},payload->>id.eq.${rewardId}`)
      .limit(1)
      .maybeSingle()

    if (rewardQuery.error || !rewardQuery.data) return { ok: true, warnings, reward: null }

    const reward = rewardQuery.data
    const p = reward.payload || {}
    const now = new Date()

    if (p.expires_at && new Date(p.expires_at) < now) {
      return { ok: false, code: 'REWARD_EXPIRED', error: 'Dieser Reward ist abgelaufen.', reward }
    }

    const redemptions = await supabase.from('v33_functional_records')
      .select('*')
      .eq('customer_id', customerId)
      .eq('resource', 'redemptions')
      .limit(1000)

    if (redemptions.error) {
      warnings.push({ label: 'reward_redemptions', error: redemptions.error.message })
      return { ok: true, warnings, reward }
    }

    const all = (redemptions.data || []).filter(r => String(r.payload?.reward_id || '') === String(rewardId))
    const sinceDay = Date.now() - 24*60*60*1000
    const sinceWeek = Date.now() - 7*24*60*60*1000
    const today = all.filter(r => new Date(r.created_at).getTime() >= sinceDay)
    const week = all.filter(r => new Date(r.created_at).getTime() >= sinceWeek)
    const perCustomer = memberName ? all.filter(r => String(r.payload?.member_name || '') === String(memberName)) : []

    if (Number(p.max_redemptions || 0) > 0 && all.length >= Number(p.max_redemptions)) {
      return { ok: false, code: 'REWARD_MAX_REDEMPTIONS_REACHED', error: 'Maximale Einlösungen für diesen Reward erreicht.', reward }
    }
    if (Number(p.daily_limit || 0) > 0 && today.length >= Number(p.daily_limit)) {
      return { ok: false, code: 'REWARD_DAILY_LIMIT_REACHED', error: 'Tageslimit für diesen Reward erreicht.', reward }
    }
    if (Number(p.weekly_limit || 0) > 0 && week.length >= Number(p.weekly_limit)) {
      return { ok: false, code: 'REWARD_WEEKLY_LIMIT_REACHED', error: 'Wochenlimit für diesen Reward erreicht.', reward }
    }
    if (memberName && Number(p.max_per_customer || 0) > 0 && perCustomer.length >= Number(p.max_per_customer)) {
      return { ok: false, code: 'REWARD_MEMBER_LIMIT_REACHED', error: 'Dieser Kunde hat den Reward bereits maximal eingelöst.', reward }
    }

    return { ok: true, warnings, reward }
  }


  async function audit(action, metadata = {}) {
    try {
      await supabase.from('security_audit_logs').insert({
        actor_name: 'System',
        action,
        entity_type: 'v34_customer_provisioning',
        metadata
      })
    } catch (_) {}
  }

  async function getCustomer(customerId) {
    const { data, error } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle()
    if (error) throw error
    return data
  }

  async function uniqueSlug(baseSlug, excludeQrId = null) {
    let slug = slugify(baseSlug)
    for (let i = 0; i < 25; i++) {
      const candidate = i === 0 ? slug : `${slug}-${i + 1}`
      let q = supabase.from('qr_campaigns').select('id').eq('slug', candidate).limit(1)
      if (excludeQrId) q = q.neq('id', excludeQrId)
      const { data, error } = await q
      if (error) throw error
      if (!data || data.length === 0) return candidate
    }
    return `${slug}-${crypto.randomBytes(4).toString('hex')}`
  }

  async function createRecord(resource, payload = {}) {
    const body = payload && typeof payload === 'object' ? payload : {}
    const { data, error } = await supabase.from('v33_functional_records').insert({
      customer_id: body.customer_id || null,
      resource,
      local_id: body.id || body.local_id || null,
      title: body.title || body.name || body.label || resource,
      status: body.status || 'active',
      payload: body,
      updated_at: new Date().toISOString()
    }).select('*').single()
    if (error) throw error
    return data
  }

  async function upsertRecord(resource, payload = {}) {
    const body = payload && typeof payload === 'object' ? payload : {}
    const localId = body.id || body.local_id || null
    const customerId = body.customer_id || null

    if (!localId || !customerId) return createRecord(resource, body)

    const { data: existing, error: lookupError } = await supabase
      .from('v33_functional_records')
      .select('*')
      .eq('resource', resource)
      .eq('customer_id', customerId)
      .eq('local_id', localId)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (!existing) return createRecord(resource, body)

    const nextPayload = { ...(existing.payload || {}), ...body, id: localId }
    const { data, error } = await supabase.from('v33_functional_records').update({
      title: nextPayload.title || nextPayload.name || nextPayload.label || existing.title,
      status: nextPayload.status || existing.status || 'active',
      payload: nextPayload,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id).select('*').single()

    if (error) throw error
    return data
  }

  async function provisionCustomer(customerId, options = {}) {
    const customer = await getCustomer(customerId)
    if (!customer) throw new Error('Kunde nicht gefunden')

    const customerName = customer.name || customer.title || customer.company || 'Kunde'
    const base = slugify(options.base_slug || customerName)
    const defaultSlug = await uniqueSlug(`l-${base}`)
    const now = new Date().toISOString()
      const warnings = []
      // v39_duplicate_lead_protection

    const { data: existingPrograms, error: programLookupError } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('customer_id', customerId)
      .limit(1)

    if (programLookupError) throw programLookupError

    let loyaltyProgram = existingPrograms && existingPrograms[0] ? existingPrograms[0] : null
    let qrCampaign = null

    const campaignTitle = options.title || `${customerName} Loyalty QR`

    if (!loyaltyProgram) {
      const { data: qrData, error: qrError } = await supabase.from('qr_campaigns').insert({
        customer_id: customerId,
        title: campaignTitle,
        name: campaignTitle,
        slug: defaultSlug,
        target_url: `/l/${defaultSlug}`,
        scans: 0,
        conversions: 0,
        active: true,
        status: 'Aktiv',
        metadata: { v34_auto_provisioned: true, customer_name: customerName }
      }).select('*').single()

      if (qrError) throw qrError
      qrCampaign = qrData

      const { data: programData, error: programError } = await supabase.from('loyalty_programs').insert({
        customer_id: customerId,
        qr_campaign_id: qrCampaign.id,
        title: `${customerName} Bonusclub`,
        name: `${customerName} Bonusclub`,
        slug: defaultSlug,
        points_per_scan: num(options.points_per_scan, 10),
        active: true,
        status: 'active',
        require_staff_code: true,
        metadata: { v34_auto_provisioned: true, qr_campaign_id: qrCampaign.id }
      }).select('*').single()

      if (programError) throw programError
      loyaltyProgram = programData
    } else {
      if (loyaltyProgram.qr_campaign_id) {
        const foundQr = await supabase.from('qr_campaigns').select('*').eq('id', loyaltyProgram.qr_campaign_id).maybeSingle()
        if (!foundQr.error) qrCampaign = foundQr.data || null
      }

      if (!qrCampaign) {
        const slug = loyaltyProgram.slug || defaultSlug
        const { data: qrData, error: qrError } = await supabase.from('qr_campaigns').insert({
          customer_id: customerId,
          title: campaignTitle,
          name: campaignTitle,
          slug,
          target_url: `/l/${slug}`,
          scans: 0,
          conversions: 0,
          active: true,
          status: 'Aktiv',
          metadata: { v34_auto_provisioned: true, customer_name: customerName }
        }).select('*').single()

        if (qrError) throw qrError
        qrCampaign = qrData

        await supabase.from('loyalty_programs').update({
          qr_campaign_id: qrCampaign.id,
          slug,
          updated_at: now
        }).eq('id', loyaltyProgram.id)

        loyaltyProgram = { ...loyaltyProgram, qr_campaign_id: qrCampaign.id, slug }
      }
    }

    await upsertRecord('public_landing_pages', {
      id: `landing_${qrCampaign.slug}`,
      customer_id: customerId,
      title: `${customerName} Landingpage`,
      slug: qrCampaign.slug,
      headline: `Willkommen bei ${customerName}`,
      mode: 'loyalty',
      active: true,
      qr_campaign_id: qrCampaign.id,
      loyalty_program_id: loyaltyProgram.id
    })

    await upsertRecord('staff_codes', {
      id: `staff_${customerId}`,
      customer_id: customerId,
      label: 'Standard Thekencode',
      code: options.staff_code || '2468',
      uses: 0,
      active: true
    })

    await audit('v34_customer_provisioned', {
      customer_id: customerId,
      qr_campaign_id: qrCampaign.id,
      loyalty_program_id: loyaltyProgram.id,
      slug: qrCampaign.slug
    })

    return { customer, qr_campaign: qrCampaign, loyalty_program: loyaltyProgram, public_url_path: `/l/${qrCampaign.slug}` }
  }

  async function createQrCampaignForCustomer(customerId, payload = {}) {
    const customer = await getCustomer(customerId)
    if (!customer) throw new Error('Kunde nicht gefunden')

    const customerName = customer.name || customer.title || customer.company || 'Kunde'
    const title = payload.title || payload.name || `${customerName} QR Kampagne`
    const purpose = payload.purpose || payload.mode || 'loyalty'
    const slugBase = payload.slug || `${slugify(customerName)}-${slugify(title)}`
    const slug = await uniqueSlug(slugBase)
    const targetUrl = `/l/${slug}`
    const pointsPerScan = num(payload.points_per_scan, 10)

    const { data: qrCampaign, error: qrError } = await supabase.from('qr_campaigns').insert({
      customer_id: customerId,
      title,
      name: title,
      slug,
      target_url: targetUrl,
      scans: 0,
      conversions: 0,
      active: true,
      status: 'Aktiv',
      metadata: { v34_auto_created: true, purpose, customer_name: customerName }
    }).select('*').single()

    if (qrError) throw qrError

    let loyaltyProgram = null

    if (purpose === 'loyalty' || payload.create_loyalty !== false) {
      const { data: program, error: programError } = await supabase.from('loyalty_programs').insert({
        customer_id: customerId,
        qr_campaign_id: qrCampaign.id,
        title: payload.loyalty_name || `${customerName} Bonusclub`,
        name: payload.loyalty_name || `${customerName} Bonusclub`,
        slug,
        points_per_scan: pointsPerScan,
        active: true,
        status: 'active',
        require_staff_code: true,
        metadata: { v34_auto_created: true, qr_campaign_id: qrCampaign.id, purpose }
      }).select('*').single()

      if (programError) throw programError
      loyaltyProgram = program
    }

    await upsertRecord('public_landing_pages', {
      id: `landing_${slug}`,
      customer_id: customerId,
      title: `${title} Landingpage`,
      slug,
      headline: payload.headline || `Willkommen bei ${customerName}`,
      mode: purpose,
      active: true,
      qr_campaign_id: qrCampaign.id,
      loyalty_program_id: loyaltyProgram?.id || null
    })

    await upsertRecord('loyalty_programs', {
      id: loyaltyProgram?.id || `loy_${slug}`,
      customer_id: customerId,
      name: loyaltyProgram?.name || `${customerName} Bonusclub`,
      qr_campaign_id: qrCampaign.id,
      slug,
      points_per_scan: pointsPerScan,
      active: true
    })

    try {
      await supabase.from('customer_timeline_events').insert({
        customer_id: customerId,
        event_type: 'qr_campaign_provisioned',
        title: 'QR/Loyalty Kampagne erstellt',
        description: `${title} wurde mit /l/${slug} erstellt.`,
        source_module: 'qr_loyalty',
        severity: 'success',
        metadata: { qr_campaign_id: qrCampaign.id, loyalty_program_id: loyaltyProgram?.id || null, slug }
      })
    } catch (_) {}

    await audit('v34_qr_campaign_created', {
      customer_id: customerId,
      qr_campaign_id: qrCampaign.id,
      loyalty_program_id: loyaltyProgram?.id || null,
      slug
    })

    return { customer, qr_campaign: qrCampaign, loyalty_program: loyaltyProgram, public_url_path: targetUrl }
  }

  router.post('/customers/:customer_id/provision', async (req, res, next) => {
    try {
      const provisioned = await provisionCustomer(req.params.customer_id, req.body || {})
      res.json({ ok: true, ...provisioned })
    } catch (e) { next(e) }
  })

  router.post('/customers/:customer_id/qr-campaigns', async (req, res, next) => {
    try {
      const created = await createQrCampaignForCustomer(req.params.customer_id, req.body || {})
      res.json({ ok: true, ...created })
    } catch (e) { next(e) }
  })

  router.get('/customers/:customer_id/qr-campaigns', async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from('qr_campaigns')
        .select('*')
        .eq('customer_id', req.params.customer_id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error
      res.json({ ok: true, campaigns: data || [] })
    } catch (e) { next(e) }
  })

  router.get('/customers/:customer_id/bootstrap', async (req, res, next) => {
    try {
      const provisioned = await provisionCustomer(req.params.customer_id, { title: req.query.title || undefined })
      const [records, qrCampaigns, leads] = await Promise.all([
        supabase.from('v33_functional_records').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(500),
        supabase.from('qr_campaigns').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(200),
        supabase.from('v33_public_leads').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(200)
      ])

      if (records.error) throw records.error
      if (qrCampaigns.error) throw qrCampaigns.error
      if (leads.error) throw leads.error

      res.json({
        ok: true,
        ...provisioned,
        records: records.data || [],
        qr_campaigns: qrCampaigns.data || [],
        leads: leads.data || []
      })
    } catch (e) { next(e) }
  })

  router.get('/records/:resource', async (req, res, next) => {
    try {
      let q = supabase.from('v33_functional_records')
        .select('*')
        .eq('resource', req.params.resource)
        .order('created_at', { ascending: false })
        .limit(500)

      if (req.query.customer_id) q = q.eq('customer_id', req.query.customer_id)

      const { data, error } = await q
      if (error) throw error
      res.json({ ok: true, records: data || [] })
    } catch (e) { next(e) }
  })

  router.post('/records/:resource', async (req, res, next) => {
    try {
      const record = await upsertRecord(req.params.resource, req.body || {})
      await audit('v34_record_saved', { resource: req.params.resource, customer_id: req.body?.customer_id || null })
      res.json({ ok: true, record })
    } catch (e) { next(e) }
  })

  router.patch('/records/:resource/local/:local_id', async (req, res, next) => {
    try {
      const record = await upsertRecord(req.params.resource, { ...(req.body || {}), id: req.params.local_id })
      await audit('v34_record_updated', { resource: req.params.resource, local_id: req.params.local_id })
      res.json({ ok: true, record })
    } catch (e) { next(e) }
  })

  router.delete('/records/:resource/local/:local_id', async (req, res, next) => {
    try {
      let q = supabase.from('v33_functional_records')
        .delete()
        .eq('resource', req.params.resource)
        .eq('local_id', req.params.local_id)

      if (req.query.customer_id) q = q.eq('customer_id', req.query.customer_id)

      const { error } = await q
      if (error) throw error
      await audit('v34_record_deleted', { resource: req.params.resource, local_id: req.params.local_id })
      res.json({ ok: true })
    } catch (e) { next(e) }
  })

  router.post('/staff-codes/verify', async (req, res, next) => {
    try {
      const code = clean(req.body?.code)
      if (!code) return res.status(400).json({ ok: false, error: 'Code fehlt' })

      const { data, error } = await supabase.from('v33_functional_records')
        .select('*')
        .eq('resource', 'staff_codes')
        .eq('customer_id', req.body.customer_id)
        .limit(200)

      if (error) throw error

      const match = (data || []).find(r => {
        const p = r.payload || {}
        return p.active !== false && String(p.code || '') === String(code)
      })

      if (!match) return res.status(400).json({ ok: false, valid: false, error: 'Code ungültig' })
      const payload = { ...(match.payload || {}), uses: num(match.payload?.uses, 0) + 1 }

      await supabase.from('v33_functional_records').update({ payload, updated_at: new Date().toISOString() }).eq('id', match.id)
      res.json({ ok: true, valid: true, staff_code: { ...match, payload } })
    } catch (e) { next(e) }
  })

  router.post('/rewards/:local_id/redeem', async (req, res, next) => {
    try {
      const body = req.body || {}
      const limitCheck = await v39CheckRewardLimits(body.customer_id, req.params.local_id, body.member_name) // v39_reward_limit_enforcement
      if (!limitCheck.ok) return res.status(400).json(v39ErrorPayload(limitCheck.code, limitCheck.error, null, 'Prüfe Reward-Limits im Loyalty Programm.', limitCheck.warnings || []))
      if (body.staff_code) {
        const codes = await supabase.from('v33_functional_records')
          .select('*')
          .eq('resource', 'staff_codes')
          .eq('customer_id', body.customer_id)
          .limit(200)

        if (codes.error) throw codes.error
        const valid = (codes.data || []).some(r => (r.payload || {}).active !== false && String((r.payload || {}).code || '') === String(body.staff_code))
        if (!valid) return res.status(400).json({ ok: false, error: 'Mitarbeitercode ungültig' })
      }

      const redemption = await createRecord('redemptions', {
        customer_id: body.customer_id,
        reward_id: req.params.local_id,
        staff_code_used: Boolean(body.staff_code),
        status: 'redeemed',
        redeemed_at: new Date().toISOString(),
        member_name: body.member_name || null
      })

      await audit('v34_reward_redeemed', { customer_id: body.customer_id, reward_id: req.params.local_id })
      res.json({ ok: true, redemption })
    } catch (e) { next(e) }
  })

  router.post('/public/loyalty/:slug/join-or-scan', async (req, res, next) => {
    try {
      const slug = String(req.params.slug || '').trim()
      const body = req.body || {}
      const email = clean(body.email)?.toLowerCase() || null
      const phone = clean(body.phone)
      const displayName = clean(body.display_name || body.displayName || body.name) || 'QR Lead'
      const deviceId = clean(body.device_id)
      const now = new Date().toISOString()

      let program = null
      const found = await supabase.from('loyalty_programs').select('*').eq('slug', slug).maybeSingle()
      if (!found.error) program = found.data || null

      if (!program) {
        return res.status(404).json({ ok: false, error: `Kein Loyalty-Programm für /l/${slug} gefunden.` })
      }

      const customerId = program.customer_id
      const settings = await v37GetOrCreateLoyaltySettings(customerId)
      let points = num(program.points_per_scan, 10)
      let member = null
      // v37_loyalty_limits_applied

      let q = supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', program.id).limit(1)
      if (body.member_token) q = q.eq('member_token', body.member_token)
      else if (email) q = q.eq('email', email)
      else if (phone) q = q.eq('phone', phone)
      else if (deviceId) q = q.eq('device_id', deviceId)
      const existing = await q.maybeSingle()
      if (!existing.error) member = existing.data || null

      if (member) {
        const sinceDay = new Date(Date.now() - 24*60*60*1000).toISOString()
        const sinceWeek = new Date(Date.now() - 7*24*60*60*1000).toISOString()
        const dayTx = await supabase.from('loyalty_transactions').select('id').eq('loyalty_customer_id', member.id).eq('action', 'qr_scan').gte('created_at', sinceDay)
        const weekTx = await supabase.from('loyalty_transactions').select('id').eq('loyalty_customer_id', member.id).eq('action', 'qr_scan').gte('created_at', sinceWeek)
        if (Number(settings.daily_scan_limit || 0) > 0 && (dayTx.data || []).length >= Number(settings.daily_scan_limit)) {
          return res.status(429).json({ ok: false, error: 'Tageslimit erreicht', limit: settings.daily_scan_limit })
        }
        if (Number(settings.weekly_scan_limit || 0) > 0 && (weekTx.data || []).length >= Number(settings.weekly_scan_limit)) {
          return res.status(429).json({ ok: false, error: 'Wochenlimit erreicht', limit: settings.weekly_scan_limit })
        }
        const currentTierMultiplier = Number(member.metadata?.v37_level_multiplier || 1)
        points = Math.round(points * currentTierMultiplier)
      }

      if (!member) {
        const created = await supabase.from('loyalty_customers').insert({
          customer_id: customerId,
          loyalty_program_id: program.id,
          email,
          phone,
          display_name: displayName,
          member_token: body.member_token || safeToken('loy'),
          device_id: deviceId,
          points_balance: points,
          total_points: points,
          total_scans: 1,
          last_seen_at: now,
          last_activity_at: now,
          metadata: { source: 'public_qr', slug }
        }).select('*').single()

        if (created.error) throw created.error
        member = created.data
      } else {
        const updated = await supabase.from('loyalty_customers').update({
          points_balance: num(member.points_balance, 0) + points,
          total_points: num(member.total_points, 0) + points,
          total_scans: num(member.total_scans, 0) + 1,
          last_seen_at: now,
          last_activity_at: now
        }).eq('id', member.id).select('*').single()

        if (!updated.error) member = updated.data || member
      }

      try {
        await supabase.from('loyalty_transactions').insert({
          customer_id: customerId,
          loyalty_program_id: program.id,
          loyalty_customer_id: member.id,
          qr_campaign_id: program.qr_campaign_id || null,
          action: 'qr_scan',
          points,
          description: `QR Scan über /l/${slug}`,
          metadata: { public: true, slug, email, phone, display_name: displayName }
        })
      } catch (_) {}

      try {
        if (program.qr_campaign_id) {
          const currentQr = await supabase.from('qr_campaigns').select('scans,conversions').eq('id', program.qr_campaign_id).maybeSingle()
          if (!currentQr.error && currentQr.data) {
            await supabase.from('qr_campaigns').update({
              scans: num(currentQr.data.scans, 0) + 1,
              conversions: num(currentQr.data.conversions, 0) + 1,
              updated_at: now
            }).eq('id', program.qr_campaign_id)
          }
        }
      } catch (_) {}

      const levelResult = await v37ApplyLevel(customerId, member.id)

      const existingLead = await v39FindRecentLead(customerId, slug, email, deviceId)
      const leadPayload = {
        customer_id: customerId,
        loyalty_program_id: program.id,
        loyalty_customer_id: member.id,
        qr_campaign_id: program.qr_campaign_id || null,
        slug,
        name: displayName,
        email,
        phone,
        source: 'qr_loyalty',
        status: 'new',
        points_added: points,
        points_balance: member.points_balance || points,
        metadata: { device_id: deviceId }
      }

      let publicLead = { data: existingLead, error: null }
      if (!existingLead) {
        publicLead = await supabase.from('v33_public_leads').insert(leadPayload).select('*').single()
        if (publicLead.error) throw publicLead.error
      } else {
        warnings.push({ code: 'DUPLICATE_LEAD_SUPPRESSED', message: 'Lead existierte bereits innerhalb von 24h und wurde nicht doppelt angelegt.' })
      }

      let pipelineLead = null
      try {
        const pipeline = await supabase.from('pipeline_leads').insert({
          customer_id: customerId,
          title: `QR/Loyalty Lead – ${displayName}`,
          source: 'qr_loyalty',
          stage: 'new',
          value: 0,
          probability: 20,
          metadata: leadPayload
        }).select('*').single()
        if (!pipeline.error) pipelineLead = pipeline.data
      } catch (_) {}

      try {
        await supabase.from('customer_timeline_events').insert({
          customer_id: customerId,
          event_type: 'qr_loyalty_lead_created',
          title: 'QR/Loyalty Lead erzeugt',
          description: `${displayName} hat über /l/${slug} Punkte gesammelt.`,
          source_module: 'qr_loyalty',
          severity: 'success',
          metadata: leadPayload
        })
      } catch (_) {}

      await audit('v34_qr_loyalty_lead_created', { customer_id: customerId, slug, email, phone })
      const v35Snapshot = await engine.recalculateCustomer(customerId) // v35_after_qr_lead_recalculate

      res.json({
        ok: true,
        program,
        member,
        points_added: points,
        points_balance: member.points_balance || points,
        lead: publicLead.data,
        pipeline_lead: pipelineLead,
        warnings,
        engine_snapshot: v35Snapshot,
        loyalty_level: levelResult
      })
    } catch (e) { next(e) }
  })

  router.post('/public/loyalty/:slug/review', async (req, res, next) => {
    try {
      const rating = num(req.body?.rating, 0)
      const { data, error } = await supabase.from('review_feedback').insert({
        customer_id: req.body?.customer_id || null,
        loyalty_program_id: req.body?.loyalty_program_id || null,
        loyalty_customer_id: req.body?.loyalty_customer_id || null,
        qr_campaign_id: req.body?.qr_campaign_id || null,
        rating,
        feedback_text: req.body?.feedback_text || req.body?.comment || null,
        comment: req.body?.feedback_text || req.body?.comment || null,
        reviewer_name: req.body?.reviewer_name || req.body?.name || null,
        reviewer_email: req.body?.reviewer_email || req.body?.email || null,
        source: 'public_qr_loyalty',
        status: rating <= 3 ? 'needs_followup' : 'new',
        sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
        metadata: { slug: req.params.slug }
      }).select('*').single()

      if (error) throw error
      res.json({ ok: true, feedback: data })
    } catch (e) { next(e) }
  })

  router.get('/leads/:customer_id', async (req, res, next) => {
    try {
      const [publicLeads, pipelineLeads, qrCampaigns] = await Promise.all([
        supabase.from('v33_public_leads').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(200),
        supabase.from('pipeline_leads').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(200),
        supabase.from('qr_campaigns').select('*').eq('customer_id', req.params.customer_id).order('created_at', { ascending: false }).limit(200)
      ])

      if (publicLeads.error) throw publicLeads.error
      if (pipelineLeads.error) throw pipelineLeads.error
      if (qrCampaigns.error) throw qrCampaigns.error
      res.json({ ok: true, leads: publicLeads.data || [], pipeline_leads: pipelineLeads.data || [], qr_campaigns: qrCampaigns.data || [] })
    } catch (e) { next(e) }
  })


  router.post('/engine/:customer_id/recalculate', async (req, res, next) => {
    try {
      const snapshot = await engine.recalculateCustomer(req.params.customer_id)
      res.json({ ok: true, snapshot })
    } catch (e) { next(e) }
  })

  router.post('/engine/:customer_id/review', async (req, res, next) => {
    try {
      const rating = n(req.body?.rating, 0)
      const review = {
        customer_id: req.params.customer_id,
        rating,
        feedback_text: req.body?.feedback_text || req.body?.text || req.body?.comment || null,
        comment: req.body?.feedback_text || req.body?.text || req.body?.comment || null,
        reviewer_name: req.body?.reviewer_name || req.body?.name || 'Gast',
        reviewer_email: req.body?.reviewer_email || req.body?.email || null,
        source: 'v35_demo_engine',
        status: rating <= 3 ? 'needs_followup' : 'new',
        sentiment: sentimentFromRating(rating),
        metadata: { v35_engine: true }
      }

      const inserted = await supabase.from('review_feedback').insert(review).select('*').single()
      if (inserted.error) throw inserted.error

      const engineResult = await engine.applyReview(req.params.customer_id, inserted.data)
      res.json({ ok: true, review: inserted.data, ...engineResult })
    } catch (e) { next(e) }
  })

  router.post('/engine/:customer_id/automation/run', async (req, res, next) => {
    try {
      const result = await engine.runAutomation(req.params.customer_id, req.body || {})
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  router.post('/engine/:customer_id/marketing/run', async (req, res, next) => {
    try {
      const result = await engine.runMarketingCampaign(req.params.customer_id, req.body || {})
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  router.post('/engine/:customer_id/billing/calculate', async (req, res, next) => {
    try {
      const result = await engine.calculateBilling(req.params.customer_id)
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })

  router.post('/engine/:customer_id/rewards/:reward_id/redeem', async (req, res, next) => {
    try {
      const limitCheck = await v39CheckRewardLimits(req.params.customer_id, req.params.reward_id, req.body?.member_name)
      if (!limitCheck.ok) return res.status(400).json(v39ErrorPayload(limitCheck.code, limitCheck.error, null, 'Prüfe Reward-Limits im Loyalty Programm.', limitCheck.warnings || []))
      const result = await engine.redeemReward(req.params.customer_id, req.params.reward_id, req.body?.staff_code, req.body?.member_name)
      res.json({ ok: true, ...result })
    } catch (e) { next(e) }
  })


  router.get('/v36/system-status', async (req, res, next) => {
    try {
      const tables = ['customers','qr_campaigns','loyalty_programs','loyalty_customers','loyalty_transactions','v33_public_leads','v33_functional_records','pipeline_leads','customer_timeline_events','review_feedback','v35_engine_runs']
      const checks = { backend: true, supabase: false, tables: {}, timestamp: new Date().toISOString() }
      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select('*').limit(1)
          checks.tables[table] = !error
        } catch (_) { checks.tables[table] = false }
      }
      checks.supabase = Object.values(checks.tables).some(Boolean)
      const ready = ['customers','qr_campaigns','loyalty_programs','v33_public_leads'].every(t => checks.tables[t])
      res.json({ ok: true, status: ready ? 'ready' : 'warning', checks })
    } catch (e) { next(e) }
  })

  router.get('/v36/:customer_id/qa-report', async (req, res, next) => {
    try {
      const cid = req.params.customer_id
      const [qr, programs, leads, members, records, timeline, runs] = await Promise.all([
        supabase.from('qr_campaigns').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100),
        supabase.from('loyalty_programs').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100),
        supabase.from('v33_public_leads').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100),
        supabase.from('loyalty_customers').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100),
        supabase.from('v33_functional_records').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(300),
        supabase.from('customer_timeline_events').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100),
        supabase.from('v35_engine_runs').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(100)
      ])
      const report = {
        qr_campaigns: qr.data || [],
        loyalty_programs: programs.data || [],
        leads: leads.data || [],
        loyalty_members: members.data || [],
        functional_records: records.data || [],
        timeline_events: timeline.data || [],
        engine_runs: runs.data || [],
        counts: {
          qr_campaigns: (qr.data || []).length,
          loyalty_programs: (programs.data || []).length,
          leads: (leads.data || []).length,
          loyalty_members: (members.data || []).length,
          functional_records: (records.data || []).length,
          timeline_events: (timeline.data || []).length,
          engine_runs: (runs.data || []).length
        }
      }
      res.json({ ok: true, report })
    } catch (e) { next(e) }
  })

  router.post('/v36/:customer_id/worker/run', async (req, res, next) => {
    try {
      const cid = req.params.customer_id
      const automation = await engine.runAutomation(cid, { source: 'v36_worker' })
      const marketing = req.body?.run_marketing ? await engine.runMarketingCampaign(cid, { name: 'V36 Auto Booster', source: 'v36_worker' }) : null
      const billing = await engine.calculateBilling(cid)
      const snapshot = await engine.recalculateCustomer(cid)
      try {
        await supabase.from('v35_engine_runs').insert({ customer_id: cid, engine_key: 'v36_worker', status: 'completed', input: req.body || {}, output: { automation, marketing, billing, snapshot } })
      } catch (_) {}
      res.json({ ok: true, automation, marketing, billing, snapshot })
    } catch (e) { next(e) }
  })

  router.post('/v36/:customer_id/reset-demo-data', async (req, res, next) => {
    try {
      const cid = req.params.customer_id
      try { await supabase.from('v33_public_leads').delete().eq('customer_id', cid) } catch (_) {}
      try { await supabase.from('loyalty_transactions').delete().eq('customer_id', cid) } catch (_) {}
      try { await supabase.from('loyalty_customers').delete().eq('customer_id', cid) } catch (_) {}
      try { await supabase.from('v33_functional_records').delete().eq('customer_id', cid) } catch (_) {}
      const provisioned = await provisionCustomer(cid, { title: 'V36 Reset QR/Loyalty' })
      const snapshot = await engine.recalculateCustomer(cid)
      try { await supabase.from('v35_engine_runs').insert({ customer_id: cid, engine_key: 'v36_reset_demo_data', status: 'completed', input: {}, output: { provisioned, snapshot } }) } catch (_) {}
      res.json({ ok: true, provisioned, snapshot })
    } catch (e) { next(e) }
  })


  async function v37GetOrCreateLoyaltySettings(customerId) {
    const customer = await getCustomer(customerId)
    const customerName = customer?.name || customer?.title || customer?.company || 'Kunde'

    const existing = await supabase
      .from('v37_loyalty_settings')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle()

    if (!existing.error && existing.data) return existing.data

    const defaults = {
      customer_id: customerId,
      brand_name: customerName,
      brand_font: 'Pacifico',
      brand_primary: '#d4af37',
      brand_secondary: '#111827',
      brand_accent: '#f8fafc',
      hero_headline: `Willkommen bei ${customerName}`,
      hero_subline: 'Sammle Punkte, sichere dir Rewards und werde VIP.',
      qr_style: 'luxury',
      qr_foreground: '#111827',
      qr_background: '#ffffff',
      qr_logo_text: customerName.slice(0, 2).toUpperCase(),
      daily_scan_limit: 1,
      weekly_scan_limit: 5,
      birthday_bonus_points: 100,
      referral_bonus_referrer: 100,
      referral_bonus_friend: 50,
      level_rules: [
        { tier: 'Basic', min_points: 0, multiplier: 1 },
        { tier: 'Silver', min_points: 250, multiplier: 1.1 },
        { tier: 'Gold', min_points: 500, multiplier: 1.25 },
        { tier: 'VIP', min_points: 1000, multiplier: 1.5 }
      ],
      active: true,
      metadata: { v37_defaults: true }
    }

    const created = await supabase.from('v37_loyalty_settings').insert(defaults).select('*').single()
    if (created.error) throw created.error
    return created.data
  }

  async function v37ApplyLevel(customerId, loyaltyCustomerId) {
    const settings = await v37GetOrCreateLoyaltySettings(customerId)
    const member = await supabase
      .from('loyalty_customers')
      .select('*')
      .eq('id', loyaltyCustomerId)
      .maybeSingle()

    if (member.error || !member.data) return null

    const points = Number(member.data.points_balance || member.data.total_points || 0)
    const rules = Array.isArray(settings.level_rules) ? settings.level_rules : []
    const sorted = rules.sort((a, b) => Number(a.min_points || 0) - Number(b.min_points || 0))
    let tier = sorted[0]?.tier || 'Basic'
    let multiplier = Number(sorted[0]?.multiplier || 1)

    for (const rule of sorted) {
      if (points >= Number(rule.min_points || 0)) {
        tier = rule.tier
        multiplier = Number(rule.multiplier || 1)
      }
    }

    await supabase.from('loyalty_customers').update({
      tier,
      metadata: {
        ...(member.data.metadata || {}),
        v37_level_multiplier: multiplier,
        v37_level_updated_at: new Date().toISOString()
      }
    }).eq('id', loyaltyCustomerId)

    return { tier, multiplier, points }
  }

  router.get('/v37/loyalty/:customer_id/settings', async (req, res, next) => {
    try {
      const settings = await v37GetOrCreateLoyaltySettings(req.params.customer_id)
      res.json({ ok: true, settings })
    } catch (e) { next(e) }
  })

  router.post('/v37/loyalty/:customer_id/settings', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      await v37GetOrCreateLoyaltySettings(customerId)

      const body = req.body || {}
      const patch = {
        brand_name: body.brand_name,
        brand_font: body.brand_font,
        brand_primary: body.brand_primary,
        brand_secondary: body.brand_secondary,
        brand_accent: body.brand_accent,
        hero_headline: body.hero_headline,
        hero_subline: body.hero_subline,
        qr_style: body.qr_style,
        qr_foreground: body.qr_foreground,
        qr_background: body.qr_background,
        qr_logo_text: body.qr_logo_text,
        daily_scan_limit: body.daily_scan_limit,
        weekly_scan_limit: body.weekly_scan_limit,
        birthday_bonus_points: body.birthday_bonus_points,
        referral_bonus_referrer: body.referral_bonus_referrer,
        referral_bonus_friend: body.referral_bonus_friend,
        level_rules: body.level_rules,
        active: body.active !== false,
        updated_at: new Date().toISOString()
      }

      Object.keys(patch).forEach(k => patch[k] === undefined && delete patch[k])

      const updated = await supabase
        .from('v37_loyalty_settings')
        .update(patch)
        .eq('customer_id', customerId)
        .select('*')
        .single()

      if (updated.error) throw updated.error

      await audit('v37_loyalty_settings_updated', { customer_id: customerId })
      res.json({ ok: true, settings: updated.data })
    } catch (e) { next(e) }
  })

  router.post('/v37/loyalty/:customer_id/rewards', async (req, res, next) => {
    try {
      const body = req.body || {}
      const payload = {
        id: body.id || safeToken('reward'),
        customer_id: req.params.customer_id,
        title: body.title || 'Neuer Reward',
        type: body.type || 'Rabatt',
        points: Number(body.points || 100),
        expires_at: body.expires_at || null,
        max_redemptions: Number(body.max_redemptions || 0),
        max_per_customer: Number(body.max_per_customer || 1),
        daily_limit: Number(body.daily_limit || 0),
        weekly_limit: Number(body.weekly_limit || 0),
        active: body.active !== false,
        v37_rules: true
      }

      const record = await upsertRecord('loyalty_rewards', payload)
      await audit('v37_reward_saved', { customer_id: req.params.customer_id, reward_id: payload.id })
      res.json({ ok: true, reward: record })
    } catch (e) { next(e) }
  })

  router.post('/v37/loyalty/:customer_id/referral', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const settings = await v37GetOrCreateLoyaltySettings(customerId)
      const body = req.body || {}
      const referrerToken = body.referrer_token || body.referrer_member_token || null
      const friendEmail = clean(body.friend_email || body.email)
      const friendName = clean(body.friend_name || body.name) || 'Referral Lead'

      let referrer = null
      if (referrerToken) {
        const found = await supabase
          .from('loyalty_customers')
          .select('*')
          .eq('customer_id', customerId)
          .eq('member_token', referrerToken)
          .maybeSingle()
        if (!found.error) referrer = found.data || null
      }

      if (referrer) {
        await supabase.from('loyalty_customers').update({
          points_balance: Number(referrer.points_balance || 0) + Number(settings.referral_bonus_referrer || 0),
          total_points: Number(referrer.total_points || 0) + Number(settings.referral_bonus_referrer || 0),
          last_activity_at: new Date().toISOString()
        }).eq('id', referrer.id)
      }

      const lead = await supabase.from('v33_public_leads').insert({
        customer_id: customerId,
        name: friendName,
        email: friendEmail,
        source: 'loyalty_referral',
        status: 'new',
        points_added: Number(settings.referral_bonus_friend || 0),
        points_balance: Number(settings.referral_bonus_friend || 0),
        metadata: {
          referrer_member_token: referrerToken,
          referrer_bonus: Number(settings.referral_bonus_referrer || 0),
          friend_bonus: Number(settings.referral_bonus_friend || 0)
        }
      }).select('*').single()

      if (lead.error) throw lead.error

      await supabase.from('customer_timeline_events').insert({
        customer_id: customerId,
        event_type: 'loyalty_referral_created',
        title: 'Referral Lead erzeugt',
        description: `${friendName} wurde über das Loyalty Referral Programm empfohlen.`,
        source_module: 'loyalty',
        severity: 'success',
        metadata: { lead: lead.data, referrer_member_token: referrerToken }
      })

      const snapshot = await engine.recalculateCustomer(customerId)
      res.json({ ok: true, lead: lead.data, referrer_updated: Boolean(referrer), snapshot })
    } catch (e) { next(e) }
  })

  router.post('/v37/loyalty/:customer_id/birthday-bonus', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const settings = await v37GetOrCreateLoyaltySettings(customerId)
      const body = req.body || {}
      const memberToken = body.member_token
      const email = clean(body.email)?.toLowerCase()

      let q = supabase.from('loyalty_customers').select('*').eq('customer_id', customerId).limit(1)
      if (memberToken) q = q.eq('member_token', memberToken)
      else if (email) q = q.eq('email', email)
      else return res.status(400).json({ ok: false, error: 'member_token oder email fehlt' })

      const found = await q.maybeSingle()
      if (found.error) throw found.error
      if (!found.data) return res.status(404).json({ ok: false, error: 'Loyalty Member nicht gefunden' })

      const bonus = Number(settings.birthday_bonus_points || 0)
      const member = found.data
      const updated = await supabase.from('loyalty_customers').update({
        birthday: body.birthday || member.birthday || null,
        points_balance: Number(member.points_balance || 0) + bonus,
        total_points: Number(member.total_points || 0) + bonus,
        last_activity_at: new Date().toISOString(),
        metadata: { ...(member.metadata || {}), birthday_bonus_last_applied_at: new Date().toISOString() }
      }).eq('id', member.id).select('*').single()

      if (updated.error) throw updated.error

      await supabase.from('loyalty_transactions').insert({
        customer_id: customerId,
        loyalty_customer_id: member.id,
        loyalty_program_id: member.loyalty_program_id || null,
        action: 'birthday_bonus',
        points: bonus,
        description: 'Geburtstagsbonus',
        metadata: { v37_birthday_bonus: true }
      })

      const level = await v37ApplyLevel(customerId, member.id)
      const snapshot = await engine.recalculateCustomer(customerId)
      res.json({ ok: true, member: updated.data, level, snapshot })
    } catch (e) { next(e) }
  })


  async function v38Signals(customerId) {
    const [customer, qr, programs, leads, members, tx, reviews, tickets, records, timeline, pipeline, runs] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
      supabase.from('qr_campaigns').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('loyalty_programs').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('v33_public_leads').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('loyalty_customers').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('loyalty_transactions').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(250),
      supabase.from('review_feedback').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('tickets').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(500),
      supabase.from('customer_timeline_events').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('pipeline_leads').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(200),
      supabase.from('v35_engine_runs').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(100)
    ])
    const safe = r => r.error ? [] : (r.data || [])
    return { customer: customer.data || null, qr_campaigns:safe(qr), loyalty_programs:safe(programs), leads:safe(leads), loyalty_members:safe(members), loyalty_transactions:safe(tx), reviews:safe(reviews), tickets:safe(tickets), functional_records:safe(records), timeline_events:safe(timeline), pipeline_leads:safe(pipeline), engine_runs:safe(runs) }
  }

  function v38Counts(s) {
    return {
      qrScans: (s.qr_campaigns || []).reduce((a,x)=>a+Number(x.scans||0),0),
      leads: (s.leads || []).length,
      members: (s.loyalty_members || []).length,
      rewards: (s.loyalty_transactions || []).filter(x => String(x.action||'').includes('reward') || String(x.action||'').includes('redeem')).length,
      reviews: (s.reviews || []).length,
      negativeReviews: (s.reviews || []).filter(x => Number(x.rating||0) <= 2 || String(x.sentiment||'').toLowerCase().includes('negative')).length,
      openTickets: (s.tickets || []).filter(x => !['closed','done','resolved','erledigt'].includes(String(x.status||'').toLowerCase())).length,
      pipelineValue: (s.pipeline_leads || []).reduce((a,x)=>a+Number(x.value||0),0),
      engineRuns: (s.engine_runs || []).length
    }
  }

  router.get('/v38/:customer_id/customer-360', async (req, res, next) => {
    try {
      const signals = await v38Signals(req.params.customer_id)
      const counts = v38Counts(signals)
      const snapshot = await engine.recalculateCustomer(req.params.customer_id)
      const ai_explanations = [
        { title: snapshot.upsell >= 75 ? 'Premium Add-on empfehlen' : 'Loyalty weiter aktivieren', severity: snapshot.upsell >= 75 ? 'success' : 'info', reason: [`${counts.qrScans} QR-Scans`, `${counts.leads} Leads`, `${counts.members} Loyalty Members`, `Upsell ${snapshot.upsell}`] },
        { title: snapshot.risk >= 60 ? 'Retention prüfen' : 'Kunde stabil', severity: snapshot.risk >= 60 ? 'warn' : 'success', reason: [`${counts.negativeReviews} negative Reviews`, `${counts.openTickets} offene Tickets`, `Health ${snapshot.health}`] }
      ]
      res.json({ ok:true, signals, counts, snapshot, ai_explanations })
    } catch(e) { next(e) }
  })

  router.post('/v38/:customer_id/simulate-scan', async (req, res, next) => {
    try {
      const cid = req.params.customer_id
      let program = null
      const found = await supabase.from('loyalty_programs').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(1)
      if (!found.error && found.data?.[0]) program = found.data[0]
      if (!program) program = (await provisionCustomer(cid, { title:'V38 Testscan QR' })).loyalty_program
      const points = Number(program.points_per_scan || 10)
      const email = req.body?.email || `testscan-${Date.now()}@demo.local`
      const name = req.body?.name || 'V38 Testlead'
      const now = new Date().toISOString()
      const member = await supabase.from('loyalty_customers').insert({ customer_id:cid, loyalty_program_id:program.id, email, display_name:name, member_token:safeToken('v38'), points_balance:points, total_points:points, total_scans:1, last_seen_at:now, last_activity_at:now, metadata:{v38_simulated:true} }).select('*').single()
      if (member.error) throw member.error
      await supabase.from('loyalty_transactions').insert({ customer_id:cid, loyalty_program_id:program.id, loyalty_customer_id:member.data.id, qr_campaign_id:program.qr_campaign_id || null, action:'qr_scan', points, description:'V38 Testscan', metadata:{v38_simulated:true} })
      if (program.qr_campaign_id) {
        const currentQr = await supabase.from('qr_campaigns').select('scans,conversions').eq('id', program.qr_campaign_id).maybeSingle()
        if (!currentQr.error && currentQr.data) await supabase.from('qr_campaigns').update({ scans:Number(currentQr.data.scans||0)+1, conversions:Number(currentQr.data.conversions||0)+1, updated_at:now }).eq('id', program.qr_campaign_id)
      }
      const lead = await supabase.from('v33_public_leads').insert({ customer_id:cid, loyalty_program_id:program.id, loyalty_customer_id:member.data.id, qr_campaign_id:program.qr_campaign_id || null, slug:program.slug, name, email, source:'v38_testscan', status:'new', points_added:points, points_balance:points, metadata:{v38_simulated:true} }).select('*').single()
      try { await supabase.from('pipeline_leads').insert({ customer_id:cid, title:`V38 Testscan Lead – ${name}`, source:'v38_testscan', stage:'new', value:0, probability:20, metadata:{lead:lead.data} }) } catch(_) {}
      try { await supabase.from('customer_timeline_events').insert({ customer_id:cid, event_type:'v38_testscan', title:'Testscan simuliert', description:`${name} wurde als Demo-Lead erzeugt.`, source_module:'v38', severity:'success', metadata:{lead:lead.data} }) } catch(_) {}
      const snapshot = await engine.recalculateCustomer(cid)
      res.json({ ok:true, simulated:true, member:member.data, lead:lead.data, snapshot })
    } catch(e) { next(e) }
  })

  router.get('/v38/:customer_id/reward-history', async (req, res, next) => {
    try {
      const cid = req.params.customer_id
      const [tx, records] = await Promise.all([
        supabase.from('loyalty_transactions').select('*').eq('customer_id', cid).order('created_at', { ascending:false }).limit(250),
        supabase.from('v33_functional_records').select('*').eq('customer_id', cid).in('resource', ['redemptions','loyalty_rewards']).order('created_at', { ascending:false }).limit(250)
      ])
      if (tx.error) throw tx.error
      if (records.error) throw records.error
      const rewards = (records.data || []).filter(r => r.resource === 'loyalty_rewards').map(r => {
        const p = r.payload || {}
        return { id:r.local_id || r.id, title:p.title || r.title, expires_at:p.expires_at || null, max_redemptions:Number(p.max_redemptions||0), daily_limit:Number(p.daily_limit||0), weekly_limit:Number(p.weekly_limit||0), total_used:(records.data || []).filter(x => x.resource === 'redemptions' && String(x.payload?.reward_id||'') === String(p.id || r.local_id)).length, status:p.expires_at && new Date(p.expires_at) < new Date() ? 'expired' : 'active' }
      })
      const history = [...(tx.data || []), ...(records.data || []).filter(r=>r.resource==='redemptions')]
      res.json({ ok:true, rewards, history })
    } catch(e) { next(e) }
  })

  router.post('/v38/:customer_id/review-loyalty-action', async (req, res, next) => {
    try {
      const cid=req.params.customer_id
      const rating=Number(req.body?.rating||5)
      const text=req.body?.text||req.body?.comment||'Demo Review'
      const name=req.body?.name||'Review Gast'
      const email=req.body?.email||null
      const result=await engine.applyReview(cid,{rating,reviewer_name:name,reviewer_email:email,feedback_text:text,comment:text})
      let bonus=null
      if(rating>=4 && email){
        const member=await supabase.from('loyalty_customers').select('*').eq('customer_id',cid).eq('email',email).maybeSingle()
        if(!member.error && member.data){
          bonus=await supabase.from('loyalty_transactions').insert({customer_id:cid,loyalty_customer_id:member.data.id,loyalty_program_id:member.data.loyalty_program_id||null,action:'review_bonus',points:50,description:'Review Bonus',metadata:{v38:true}}).select('*').single()
          await supabase.from('loyalty_customers').update({points_balance:Number(member.data.points_balance||0)+50,total_points:Number(member.data.total_points||0)+50,total_reviews:Number(member.data.total_reviews||0)+1,last_activity_at:new Date().toISOString()}).eq('id',member.data.id)
        }
      }
      if(rating===3) await upsertRecord('marketing_campaigns',{id:`neutral_review_followup_${Date.now()}`,customer_id:cid,name:'Neutrale Review Follow-up Kampagne',audience:'Neutrale Reviews',reward:'Wiedergutmachungs-Reward',status:'Bereit',active:true})
      const snapshot=await engine.recalculateCustomer(cid)
      res.json({ok:true,result,bonus:bonus?.data||null,snapshot})
    } catch(e) { next(e) }
  })

  router.get('/v38/:customer_id/billing-revenue', async (req,res,next)=>{
    try{
      const billing=await engine.calculateBilling(req.params.customer_id)
      const snapshot=await engine.recalculateCustomer(req.params.customer_id)
      const records=await supabase.from('v33_functional_records').select('*').eq('customer_id',req.params.customer_id).in('resource',['dynamic_billing_usage','revenue_forecasts','revenue_shares','package_recommendations']).order('updated_at',{ascending:false}).limit(100)
      if(records.error) throw records.error
      res.json({ok:true,billing,snapshot,records:records.data||[]})
    }catch(e){next(e)}
  })

  router.post('/v38/:customer_id/reset/:scope', async (req,res,next)=>{
    try{
      const cid=req.params.customer_id
      const scope=req.params.scope
      const groups={loyalty:['public_landing_pages','loyalty_programs','loyalty_rewards','loyalty_reward_rules','staff_codes','loyalty_segments','loyalty_members','redemptions'],reviews:['reviews','review_intelligence','review_response_templates'],automation:['smart_automations','marketing_campaigns','marketing_runs','assistant_messages'],billing:['dynamic_billing_usage','revenue_forecasts','revenue_shares','package_recommendations','package_matrix']}
      if(scope==='leads'||scope==='all'){try{await supabase.from('v33_public_leads').delete().eq('customer_id',cid)}catch(_){} try{await supabase.from('pipeline_leads').delete().eq('customer_id',cid)}catch(_){}}
      if(scope==='loyalty'||scope==='all'){try{await supabase.from('loyalty_transactions').delete().eq('customer_id',cid)}catch(_){} try{await supabase.from('loyalty_customers').delete().eq('customer_id',cid)}catch(_){}}
      if(scope==='reviews'||scope==='all') try{await supabase.from('review_feedback').delete().eq('customer_id',cid)}catch(_){}
      if(scope==='all') await supabase.from('v33_functional_records').delete().eq('customer_id',cid)
      else if(groups[scope]) await supabase.from('v33_functional_records').delete().eq('customer_id',cid).in('resource',groups[scope])
      const snapshot=await engine.recalculateCustomer(cid)
      res.json({ok:true,scope,snapshot})
    }catch(e){next(e)}
  })

  router.get('/v38/:customer_id/qa-checklist', async (req,res,next)=>{
    try{
      const s=await v38Signals(req.params.customer_id)
      const c=v38Counts(s)
      const qr=s.qr_campaigns[0], program=s.loyalty_programs[0]
      const checklist=[
        {key:'backend',label:'Backend erreichbar',ok:true},
        {key:'customer',label:'Kunde vorhanden',ok:Boolean(s.customer)},
        {key:'qr',label:'QR-Kampagne vorhanden',ok:Boolean(qr)},
        {key:'loyalty',label:'Loyalty-Programm vorhanden',ok:Boolean(program)},
        {key:'landing',label:'Landingpage Link vorhanden',ok:Boolean(qr?.slug||program?.slug),url:qr?.slug?`/l/${qr.slug}`:program?.slug?`/l/${program.slug}`:null},
        {key:'lead',label:'Mindestens ein Lead vorhanden',ok:c.leads>0},
        {key:'member',label:'Mindestens ein Loyalty Member vorhanden',ok:c.members>0},
        {key:'engine',label:'Engine mindestens einmal gelaufen',ok:c.engineRuns>0},
        {key:'timeline',label:'Timeline Events vorhanden',ok:(s.timeline_events||[]).length>0}
      ]
      res.json({ok:true,ready:checklist.every(x=>x.ok),checklist})
    }catch(e){next(e)}
  })


  router.get('/v39/schema-health', async (req, res, next) => {
    try {
      const required = {
        customers: ['id'],
        qr_campaigns: ['id','customer_id','slug','target_url','scans','conversions','active','metadata'],
        loyalty_programs: ['id','customer_id','slug','qr_campaign_id','points_per_scan','active','metadata'],
        loyalty_customers: ['id','customer_id','loyalty_program_id','email','member_token','points_balance','total_points','total_scans','metadata'],
        loyalty_transactions: ['id','customer_id','loyalty_program_id','loyalty_customer_id','action','points','metadata'],
        v33_public_leads: ['id','customer_id','slug','email','source','status','metadata'],
        v33_functional_records: ['id','customer_id','resource','local_id','payload'],
        pipeline_leads: ['id','customer_id','title','source','stage','value','probability','metadata'],
        customer_timeline_events: ['id','customer_id','event_type','title','source_module','severity','metadata'],
        review_feedback: ['id','customer_id','rating','sentiment','metadata'],
        v35_engine_runs: ['id','customer_id','engine_key','status','input','output'],
        v37_loyalty_settings: ['id','customer_id','brand_name','level_rules']
      }

      const results = {}
      for (const [table, columns] of Object.entries(required)) {
        const tableResult = { exists: false, columns: {}, ok: false, hint: null }
        try {
          const { data, error } = await supabase.from(table).select(columns.join(',')).limit(1)
          if (!error) {
            tableResult.exists = true
            columns.forEach(c => tableResult.columns[c] = true)
            tableResult.ok = true
          } else {
            tableResult.hint = error.message
            // Fallback: check table existence with wildcard select
            const fallback = await supabase.from(table).select('*').limit(1)
            tableResult.exists = !fallback.error
            if (fallback.error) tableResult.hint = fallback.error.message
          }
        } catch (e) {
          tableResult.hint = e.message
        }
        results[table] = tableResult
      }

      const missing = Object.entries(results).filter(([_, v]) => !v.ok).map(([k, v]) => ({ table: k, hint: v.hint }))
      res.json({
        ok: true,
        ready: missing.length === 0,
        migration_hint: missing.length ? 'Führe 0050_full_schema_stabilizer.sql aus.' : 'Schema bereit.',
        results,
        missing
      })
    } catch (e) { next(e) }
  })

  router.post('/v39/:customer_id/provision-safe', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const existingPrograms = await supabase.from('loyalty_programs').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1)
      const existingQr = await supabase.from('qr_campaigns').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1)

      if (!existingPrograms.error && existingPrograms.data?.[0] && !existingQr.error && existingQr.data?.[0]) {
        return res.json({
          ok: true,
          reused: true,
          customer: await getCustomer(customerId),
          loyalty_program: existingPrograms.data[0],
          qr_campaign: existingQr.data[0],
          public_url_path: `/l/${existingQr.data[0].slug || existingPrograms.data[0].slug}`
        })
      }

      const provisioned = await provisionCustomer(customerId, req.body || {})
      res.json({ ok: true, reused: false, ...provisioned })
    } catch (e) { next(e) }
  })


  router.get('/v40/:customer_id/contract-tests', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const tests = []

      async function test(name, fn, hint) {
        const started = Date.now()
        try {
          const result = await fn()
          tests.push({ name, ok: true, duration_ms: Date.now() - started, result: result || null, hint: null })
        } catch (e) {
          tests.push({ name, ok: false, duration_ms: Date.now() - started, error: e.message, hint })
        }
      }

      await test('schema: customers', async () => {
        const r = await supabase.from('customers').select('id,name').eq('id', customerId).limit(1)
        if (r.error) throw r.error
        return { rows: (r.data || []).length }
      }, 'Führe 0050_full_schema_stabilizer.sql aus.')

      await test('schema: qr_campaigns', async () => {
        const r = await supabase.from('qr_campaigns').select('id,customer_id,slug,target_url,scans,conversions').eq('customer_id', customerId).limit(5)
        if (r.error) throw r.error
        return { rows: (r.data || []).length }
      }, 'Prüfe qr_campaigns Spalten oder führe 0050 aus.')

      await test('schema: loyalty_programs', async () => {
        const r = await supabase.from('loyalty_programs').select('id,customer_id,slug,points_per_scan,qr_campaign_id').eq('customer_id', customerId).limit(5)
        if (r.error) throw r.error
        return { rows: (r.data || []).length }
      }, 'Prüfe loyalty_programs Spalten oder führe 0050 aus.')

      await test('endpoint-ready: customer360 signals', async () => {
        const signals = await v38Signals(customerId)
        const counts = v38Counts(signals)
        return counts
      }, 'Prüfe V38 Routes und Engine Service.')

      await test('engine: recalculate', async () => {
        const snapshot = await engine.recalculateCustomer(customerId)
        return { health: snapshot.health, risk: snapshot.risk, upsell: snapshot.upsell, forecast: snapshot.forecast }
      }, 'Prüfe v35BusinessEngine.js und Tabellen v33_functional_records/v35_engine_runs.')

      await test('qa: checklist', async () => {
        const signals = await v38Signals(customerId)
        const counts = v38Counts(signals)
        const qr = signals.qr_campaigns[0]
        const program = signals.loyalty_programs[0]
        return {
          customer: Boolean(signals.customer),
          qr: Boolean(qr),
          loyalty: Boolean(program),
          landing: Boolean(qr?.slug || program?.slug),
          leads: counts.leads,
          members: counts.members
        }
      }, 'Provisioniere den Kunden oder simuliere einen Testscan.')

      await test('public: link health', async () => {
        const q = await supabase.from('qr_campaigns').select('id,slug,target_url,active').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (q.error) throw q.error
        if (!q.data?.slug) throw new Error('Kein öffentlicher QR/Landingpage Slug vorhanden.')
        return { slug: q.data.slug, target_url: q.data.target_url || `/l/${q.data.slug}`, active: q.data.active !== false }
      }, 'Klicke Safe Provisioning oder QR/Loyalty vorbereiten.')

      const passed = tests.filter(t => t.ok).length
      const failed = tests.length - passed

      try {
        await supabase.from('v35_engine_runs').insert({
          customer_id: customerId,
          engine_key: 'v40_contract_tests',
          status: failed ? 'warning' : 'completed',
          input: {},
          output: { passed, failed, tests }
        })
      } catch (_) {}

      res.json({ ok: true, passed, failed, ready: failed === 0, tests })
    } catch (e) { next(e) }
  })

  router.get('/v40/:customer_id/audit-log', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const [audit, runs, events] = await Promise.all([
        supabase.from('security_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('v35_engine_runs').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(50),
        supabase.from('customer_timeline_events').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(50)
      ])

      res.json({
        ok: true,
        audit: audit.error ? [] : (audit.data || []),
        engine_runs: runs.error ? [] : (runs.data || []),
        timeline_events: events.error ? [] : (events.data || [])
      })
    } catch (e) { next(e) }
  })

  router.get('/v40/:customer_id/public-link-health', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const q = await supabase.from('qr_campaigns')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (q.error) throw q.error
      if (!q.data?.slug) {
        return res.status(404).json(v39ErrorPayload('PUBLIC_LINK_MISSING', 'Kein Public-Link vorhanden.', null, 'Klicke Safe Provisioning oder Kunden für QR/Loyalty vorbereiten.'))
      }

      const program = await supabase.from('loyalty_programs')
        .select('*')
        .eq('customer_id', customerId)
        .eq('slug', q.data.slug)
        .maybeSingle()

      const warnings = []
      if (program.error || !program.data) warnings.push({ code: 'LOYALTY_PROGRAM_NOT_MATCHING_SLUG', message: 'QR Slug hat kein passendes Loyalty Programm.' })
      if (q.data.active === false) warnings.push({ code: 'QR_INACTIVE', message: 'QR Kampagne ist inaktiv.' })

      res.json({
        ok: true,
        ready: warnings.length === 0,
        slug: q.data.slug,
        public_url_path: `/l/${q.data.slug}`,
        target_url: q.data.target_url || `/l/${q.data.slug}`,
        qr_campaign: q.data,
        loyalty_program: program.data || null,
        warnings
      })
    } catch (e) { next(e) }
  })


  function v41MonthLabel(offset = 0) {
    const d = new Date()
    d.setMonth(d.getMonth() + offset)
    return d.toLocaleString('de-DE', { month: 'short', year: '2-digit' })
  }

  router.get('/v41/:customer_id/deep-modules', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const signals = await v38Signals(customerId)
      const counts = v38Counts(signals)
      const snapshot = await engine.recalculateCustomer(customerId)
      const customer = signals.customer || {}
      const mrr = Number(customer.monthly_price || customer.amount || 299)
      const pipelineValue = counts.pipelineValue || 0
      const qrScans = counts.qrScans || 0
      const leads = counts.leads || 0
      const members = counts.members || 0
      const reviews = counts.reviews || 0
      const negativeReviews = counts.negativeReviews || 0
      const usage = Number(snapshot.usage_total || 0)

      const forecastSeries = [0,1,2,3,4,5].map((i) => {
        const growthFactor = 1 + (Math.min(0.22, (qrScans + leads * 4 + members) / 1000) * i)
        const expected = Math.round((mrr * growthFactor + pipelineValue * (0.08 + i * 0.035) + usage * (1 + i * 0.08)) * 100) / 100
        const conservative = Math.round(expected * 0.78 * 100) / 100
        const optimistic = Math.round(expected * 1.22 * 100) / 100
        return {
          month: v41MonthLabel(i),
          expected,
          conservative,
          optimistic,
          confidence: Math.max(45, Math.min(95, Number(snapshot.success || 70) - i * 3))
        }
      })

      const revenueShareItems = [
        { label: 'Basispaket / MRR', base: mrr, percent: 15, amount: Math.round(mrr * 0.15 * 100) / 100 },
        { label: 'Usage Add-ons', base: usage, percent: 20, amount: Math.round(usage * 0.20 * 100) / 100 },
        { label: 'Pipeline Potenzial', base: pipelineValue, percent: 8, amount: Math.round(pipelineValue * 0.08 * 100) / 100 }
      ]

      const packages = [
        {
          key: 'starter',
          name: 'Starter',
          price: 199,
          tools: ['QR Kampagnen', 'Landingpage', 'Basic Loyalty'],
          fit_score: Math.max(25, Math.min(75, 100 - Number(snapshot.upsell || 0))),
          recommended: false
        },
        {
          key: 'growth',
          name: 'Growth',
          price: 499,
          tools: ['QR + Loyalty', 'Reviews', 'Automation', 'CRM 360'],
          fit_score: Math.max(55, Math.min(92, Number(snapshot.success || 70))),
          recommended: Number(snapshot.upsell || 0) < 80
        },
        {
          key: 'premium',
          name: 'Premium',
          price: 899,
          tools: ['AI Assistant', 'Revenue Hub', 'Advanced Automation', 'Priority Support'],
          fit_score: Math.max(60, Math.min(98, Number(snapshot.upsell || 0) + 8)),
          recommended: Number(snapshot.upsell || 0) >= 80
        }
      ]

      const intelligenceDrivers = [
        { label: 'QR Aktivität', value: qrScans, impact: qrScans > 50 ? 'hoch' : qrScans > 10 ? 'mittel' : 'niedrig', explanation: 'Viele QR-Scans erhöhen Lead- und Upsell-Potenzial.' },
        { label: 'Lead-Aufkommen', value: leads, impact: leads > 10 ? 'hoch' : leads > 2 ? 'mittel' : 'niedrig', explanation: 'Neue Leads zeigen aktive Kampagnenwirkung.' },
        { label: 'Loyalty Members', value: members, impact: members > 25 ? 'hoch' : members > 5 ? 'mittel' : 'niedrig', explanation: 'Mehr Members machen Marketing-Automation wertvoller.' },
        { label: 'Review Risiko', value: negativeReviews, impact: negativeReviews > 2 ? 'hoch' : negativeReviews > 0 ? 'mittel' : 'niedrig', explanation: 'Negative Reviews senken Health und erhöhen Retention-Bedarf.' },
        { label: 'Pipeline Value', value: pipelineValue, impact: pipelineValue > 1000 ? 'hoch' : pipelineValue > 0 ? 'mittel' : 'niedrig', explanation: 'Pipeline deutet auf Umsatzpotenzial hin.' }
      ]

      const marketingCalendar = [
        { date_offset: 0, type: 'loyalty', title: 'Reward-bereite Kunden aktivieren', audience: 'Reward-bereit', status: 'bereit', expected_reach: Math.max(3, members) },
        { date_offset: 3, type: 'review', title: 'Positive Reviews pushen', audience: 'Aktive Gäste', status: 'geplant', expected_reach: Math.max(2, reviews + members // 2) },
        { date_offset: 7, type: 'referral', title: 'Empfehlungsbonus bewerben', audience: 'VIP / Gold Kunden', status: 'geplant', expected_reach: Math.max(1, Math.round(members * 0.25)) },
        { date_offset: 14, type: 'reactivation', title: 'Inaktive Endkunden zurückholen', audience: 'Inaktive Kunden', status: 'idee', expected_reach: Math.max(1, Math.round(members * 0.15)) }
      ].map((item) => {
        const d = new Date()
        d.setDate(d.getDate() + item.date_offset)
        return { ...item, date: d.toISOString().slice(0, 10) }
      })

      const aiInsights = [
        {
          role: 'assistant',
          title: Number(snapshot.upsell || 0) >= 80 ? 'Premium Upgrade ist plausibel' : 'Growth-Paket weiter ausbauen',
          message: `Aktuelle Signale: ${qrScans} QR-Scans, ${leads} Leads, ${members} Loyalty Members. Upsell Score: ${snapshot.upsell}.`,
          reasons: [`QR Scans: ${qrScans}`, `Leads: ${leads}`, `Members: ${members}`, `Upsell: ${snapshot.upsell}`],
          action: Number(snapshot.upsell || 0) >= 80 ? 'Premium Add-on anbieten' : 'Loyalty Kampagne stärken'
        },
        {
          role: 'assistant',
          title: Number(snapshot.risk || 0) >= 60 ? 'Retention-Maßnahme empfohlen' : 'Kunde wirkt stabil',
          message: `Health ${snapshot.health}, Risk ${snapshot.risk}, negative Reviews ${negativeReviews}.`,
          reasons: [`Health: ${snapshot.health}`, `Risk: ${snapshot.risk}`, `Negative Reviews: ${negativeReviews}`],
          action: Number(snapshot.risk || 0) >= 60 ? 'Retention-Call einplanen' : 'Nächste Marketing-Aktion starten'
        }
      ]

      const detail = {
        customer,
        snapshot,
        counts,
        forecast: {
          series: forecastSeries,
          assumptions: [
            'Basis: aktueller MRR',
            'Pipeline wird anteilig gewichtet',
            'QR/Loyalty Aktivität erhöht Wachstumsfaktor',
            'Success Score beeinflusst Confidence'
          ]
        },
        revenue_share: {
          items: revenueShareItems,
          total: Math.round(revenueShareItems.reduce((sum, x) => sum + Number(x.amount || 0), 0) * 100) / 100
        },
        package_matrix: {
          packages,
          current_package: customer.package_key || customer.package || 'growth',
          recommended: packages.find(p => p.recommended) || packages[1]
        },
        customer_intelligence: {
          drivers: intelligenceDrivers,
          next_best_actions: [
            Number(snapshot.upsell || 0) >= 80 ? 'Premium Add-on pitchen' : 'Loyalty-Kampagne verlängern',
            negativeReviews > 0 ? 'Review Follow-up starten' : 'Review Booster aktivieren',
            leads > 0 ? 'Neue Leads zeitnah nachfassen' : 'Testscan/QR-Kampagne bewerben'
          ]
        },
        marketing: {
          calendar: marketingCalendar,
          funnel: [
            { stage: 'Idee', count: 4 },
            { stage: 'Geplant', count: 3 },
            { stage: 'Gestartet', count: signals.functional_records.filter(r => r.resource === 'marketing_campaigns' && r.payload?.status === 'Gestartet').length },
            { stage: 'Leads', count: leads },
            { stage: 'Conversion', count: Math.round(leads * 0.25) }
          ]
        },
        ai: {
          insights: aiInsights
        }
      }

      res.json({ ok: true, detail })
    } catch (e) { next(e) }
  })

  router.post('/v41/:customer_id/ai-message', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const message = String(req.body?.message || '').trim()
      const signals = await v38Signals(customerId)
      const counts = v38Counts(signals)
      const snapshot = await engine.recalculateCustomer(customerId)

      const answer = message
        ? `Basierend auf deiner Frage "${message}": Bei ${counts.qrScans} QR-Scans, ${counts.leads} Leads und Upsell Score ${snapshot.upsell} würde ich als nächsten Schritt ${Number(snapshot.upsell || 0) >= 80 ? 'ein Premium-Angebot vorbereiten' : 'die Loyalty-Aktivierung verstärken'}.`
        : `Aktueller Vorschlag: Loyalty-Kampagne prüfen, ${counts.leads} Leads nachfassen und Health ${snapshot.health} beobachten.`

      const record = await upsertRecord('assistant_messages', {
        id: `v41_ai_${Date.now()}`,
        customer_id: customerId,
        title: 'AI Assistant Antwort',
        severity: Number(snapshot.risk || 0) >= 60 ? 'warn' : 'success',
        message: answer,
        prompt: message,
        reasons: [`QR Scans: ${counts.qrScans}`, `Leads: ${counts.leads}`, `Upsell: ${snapshot.upsell}`, `Risk: ${snapshot.risk}`],
        active: true
      })

      res.json({ ok: true, answer, record, snapshot })
    } catch (e) { next(e) }
  })

  router.post('/v41/:customer_id/marketing-event', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const body = req.body || {}
      const record = await upsertRecord('marketing_campaigns', {
        id: body.id || `v41_campaign_${Date.now()}`,
        customer_id: customerId,
        name: body.title || body.name || 'Neue Marketing Aktion',
        title: body.title || body.name || 'Neue Marketing Aktion',
        audience: body.audience || 'Loyalty Members',
        reward: body.reward || null,
        scheduled_at: body.date || new Date().toISOString().slice(0, 10),
        status: body.status || 'geplant',
        channel: body.channel || 'Loyalty',
        active: true
      })

      await supabase.from('customer_timeline_events').insert({
        customer_id: customerId,
        event_type: 'v41_marketing_event_created',
        title: body.title || body.name || 'Marketing Aktion geplant',
        description: `${body.audience || 'Loyalty Members'} · ${body.date || 'ohne Datum'}`,
        source_module: 'marketing_automation',
        severity: 'info',
        metadata: { body }
      }).catch?.(() => null)

      res.json({ ok: true, event: record })
    } catch (e) { next(e) }
  })

  router.post('/v41/:customer_id/package-action', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const body = req.body || {}
      const key = body.package_key || body.key || 'growth'
      const value = Number(body.price || body.value || 499)

      const lead = await supabase.from('pipeline_leads').insert({
        customer_id: customerId,
        title: `Paket-Chance: ${body.name || key}`,
        source: 'v41_package_matrix',
        stage: 'new',
        value,
        probability: Number(body.probability || 35),
        metadata: { package_key: key, v41_package_action: true, body }
      }).select('*').single()

      const rec = await upsertRecord('package_recommendations', {
        id: `v41_package_${Date.now()}`,
        customer_id: customerId,
        title: `${body.name || key} empfehlen`,
        package_key: key,
        uplift: value,
        confidence: Number(body.fit_score || 75),
        status: 'als_chance_markiert',
        active: true
      })

      const snapshot = await engine.recalculateCustomer(customerId)
      res.json({ ok: true, pipeline_lead: lead.data || null, recommendation: rec, snapshot })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = v33FunctionalRoutes
