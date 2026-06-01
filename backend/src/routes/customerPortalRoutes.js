
const express = require('express')
const crypto = require('crypto')
const {
  sendRegistrationReceived,
  sendRegistrationApproved,
  sendCustomerInvite,
  sendInviteAcceptedAdminNotice,
  sendAdminRegistrationNotice,
  sendPackageRequestNotice
} = require('../services/customerLifecycleMailService')
const { grantPackageTools } = require('../services/packageAccessService')

async function safeQuery(query) {
  try { return await query } catch { return null }
}

function makeToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function nowIso() { return new Date().toISOString() }
function daysFromNow(days) { return new Date(Date.now() + Number(days || 14) * 24 * 60 * 60 * 1000).toISOString() }
function appBase(req, body = {}) {
  return String(
    body.origin ||
    body.app_origin ||
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_APP_URL ||
    req.get('origin') ||
    ''
  ).replace(/\/$/, '')
}
function buildInviteUrl(req, token, body = {}) {
  const base = appBase(req, body)
  return `${base || ''}/auth?invite=${encodeURIComponent(token)}`
}
async function ensureUserProfile(supabase, { auth_user_id, customer_id, email, display_name, role = 'customer', status = 'active' }) {
  if (!auth_user_id) return null
  const payload = {
    id: auth_user_id,
    customer_id: customer_id || null,
    email: email || null,
    display_name: display_name || email || 'Kunde',
    role,
    status,
    updated_at: nowIso()
  }
  const res = await safeQuery(
    supabase.from('user_profiles').upsert(payload, { onConflict: 'id' }).select('*').maybeSingle()
  )
  return res?.data || null
}

function requireAdminCustomerPortal(req, res, next) {
  const role = String(req.userRole || req.userProfile?.role || '').toLowerCase()
  if (role === 'admin' || role === 'super_admin') return next()
  return res.status(403).json({ ok: false, code: 'ADMIN_REQUIRED', error: 'Nur interne Admin-Zugänge dürfen Kundenregistrierungen verwalten.' })
}

async function writeActivity(supabase, payload) {
  try {
    await supabase.from('activity_logs').insert({
      type: payload.type || 'customer_access_event',
      title: payload.title || 'Kundenzugang geändert',
      message: payload.message || '',
      ref_table: payload.ref_table || 'customer_invites',
      ref_id: payload.ref_id || null,
      customer_id: payload.customer_id || null,
      severity: payload.severity || 'info',
      metadata: payload.metadata || {},
      created_at: nowIso()
    })
  } catch (_) {}
}

function customerPortalRoutes(supabase) {
  const router = express.Router()


  router.get('/overview', async (req, res, next) => {
    try {
      const role = String(req.userRole || req.userProfile?.role || '').toLowerCase()
      const profileCustomerId = req.userProfile?.customer_id || null
      const customerId = (role === 'admin' || role === 'super_admin') ? (req.query.customer_id || profileCustomerId) : profileCustomerId
      if (!customerId) return res.status(400).json({ ok:false, error:'customer_id fehlt' })

      const [customer, docs, consents, withdrawals, reminders, campaigns, reports] = await Promise.all([
        safeQuery(supabase.from('customers').select('*').eq('id', customerId).maybeSingle()),
        safeQuery(supabase.from('output_documents').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(20)),
        safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource','marketing_consents').order('created_at', { ascending:false }).limit(100)),
        safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource','marketing_consent_withdrawals').order('created_at', { ascending:false }).limit(100)),
        safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource','marketing_reminder_drafts').order('created_at', { ascending:false }).limit(50)),
        safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).in('resource',['loyalty_campaigns','segment_campaigns']).order('created_at', { ascending:false }).limit(50)),
        safeQuery(supabase.from('monthly_reports').select('*').eq('customer_id', customerId).order('created_at', { ascending:false }).limit(12))
      ])

      const activeConsents = (consents?.data || []).filter((c) => c.status === 'granted').length
      const sentReminders = (reminders?.data || []).filter((r) => r.status === 'sent').length
      const draftReminders = (reminders?.data || []).filter((r) => r.status === 'draft').length

      res.json({
        ok:true,
        customer_id: customerId,
        customer: customer?.data || null,
        metrics: {
          documents: (docs?.data || []).length,
          reports: (reports?.data || []).length,
          active_consents: activeConsents,
          withdrawals: (withdrawals?.data || []).length,
          reminder_drafts: draftReminders,
          reminders_sent: sentReminders,
          campaigns: (campaigns?.data || []).length
        },
        latest_documents: docs?.data || [],
        latest_reports: reports?.data || [],
        latest_campaigns: campaigns?.data || [],
        latest_reminders: reminders?.data || []
      })
    } catch (e) { next(e) }
  })


  router.post('/register', async (req, res, next) => {
    try {
      const body = req.body || {}
      const company_name = body.company_name || body.companyName
      const email = body.email
      if (!company_name || !email) return res.status(400).json({ ok:false, error:'Firmenname und E-Mail fehlen' })

      const requestedPackage = body.requested_package || body.package || 'Starter'

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: company_name,
          contact_person: body.contact_person || body.contactPerson || null,
          email,
          phone: body.phone || null,
          requested_package: requestedPackage,
          package_name: requestedPackage,
          status: 'pending',
          onboarding_source: 'self_registration',
          is_demo: false,
          metadata: { registration_status: 'pending', requested_package: requestedPackage }
        })
        .select('*')
        .single()
      if (customerError) throw customerError

      const { data: registration, error: regError } = await supabase
        .from('customer_registrations')
        .insert({
          auth_user_id: body.auth_user_id || null,
          customer_id: customer.id,
          company_name,
          contact_person: body.contact_person || body.contactPerson || null,
          email,
          phone: body.phone || null,
          requested_package: requestedPackage,
          status: 'pending',
          note: body.note || null
        })
        .select('*')
        .single()
      if (regError) throw regError

      if (body.auth_user_id) {
        await ensureUserProfile(supabase, {
          auth_user_id: body.auth_user_id,
          customer_id: customer.id,
          email,
          display_name: body.contact_person || body.contactPerson || company_name,
          role: 'customer',
          status: 'pending'
        })
        await safeQuery(supabase.from('customer_users').insert({
          auth_user_id: body.auth_user_id,
          customer_id: customer.id,
          email,
          display_name: body.contact_person || body.contactPerson || company_name,
          role: 'owner',
          status: 'pending'
        }))
      }

      await safeQuery(supabase.from('package_requests').insert({
        customer_id: customer.id,
        package_name: requestedPackage,
        status: 'Angefragt',
        requested_by: body.contact_person || body.contactPerson || company_name
      }))

      await safeQuery(supabase.from('notifications').insert({
        customer_id: customer.id,
        title: 'Neue Kundenregistrierung',
        message: `${company_name} hat sich registriert und ${requestedPackage} angefragt.`,
        type: 'customer_registration',
        actor_name: company_name
      }))

      const mail_results = []
      try { mail_results.push(await sendRegistrationReceived(supabase, registration)) } catch (mailError) { mail_results.push({ error: mailError.message, template: 'customer_registration_received' }) }
      try { mail_results.push(await sendAdminRegistrationNotice(supabase, registration)) } catch (mailError) { mail_results.push({ error: mailError.message, template: 'customer_registration_admin' }) }

      res.json({ ok:true, customer, registration, status:'pending', mail_results })
    } catch (e) { next(e) }
  })

  router.get('/registrations', requireAdminCustomerPortal, async (req, res, next) => {
    try {
      const regs = await safeQuery(supabase
        .from('customer_registrations')
        .select('*')
        .order('created_at', { ascending:false })
        .limit(100))
      const invites = await safeQuery(supabase
        .from('customer_invites')
        .select('*')
        .order('created_at', { ascending:false })
        .limit(100))
      res.json({ ok:true, registrations:regs?.data || [], invites:invites?.data || [] })
    } catch (e) { next(e) }
  })

  router.post('/approve/:id', requireAdminCustomerPortal, async (req, res, next) => {
    try {
      const { data: registration, error } = await supabase
        .from('customer_registrations')
        .select('*')
        .eq('id', req.params.id)
        .single()
      if (error) throw error

      await supabase.from('customer_registrations').update({
        status:'approved',
        reviewed_at:nowIso(),
        reviewed_by:req.body?.reviewed_by || 'Admin'
      }).eq('id', registration.id)

      if (registration.customer_id) {
        await supabase.from('customers').update({
          status:'active',
          package_name: registration.requested_package || 'Starter',
          requested_package: registration.requested_package || 'Starter',
          updated_at: nowIso()
        }).eq('id', registration.customer_id)
      }

      if (registration.auth_user_id) {
        await ensureUserProfile(supabase, {
          auth_user_id: registration.auth_user_id,
          customer_id: registration.customer_id,
          email: registration.email,
          display_name: registration.contact_person || registration.company_name,
          role: 'customer',
          status: 'active'
        })
        await safeQuery(supabase.from('customer_users').upsert({
          auth_user_id: registration.auth_user_id,
          customer_id: registration.customer_id,
          email: registration.email,
          display_name: registration.contact_person || registration.company_name,
          role: 'owner',
          status: 'active',
          updated_at: nowIso()
        }, { onConflict:'auth_user_id,customer_id' }))
      }

      await safeQuery(supabase.from('notifications').insert({
        customer_id: registration.customer_id,
        title: 'Kundenkonto freigeschaltet',
        message: `${registration.company_name} wurde freigeschaltet.`,
        type: 'customer_approved',
        actor_name: req.body?.reviewed_by || 'Admin'
      }))

      const access_result = await grantPackageTools(supabase, {
        customer_id: registration.customer_id,
        package_name: registration.requested_package || 'Starter',
        actor_name: req.body?.reviewed_by || 'Admin'
      })

      const mail_results = []
      try { mail_results.push(await sendRegistrationApproved(supabase, registration)) } catch (mailError) { mail_results.push({ error: mailError.message, template: 'customer_registration_approved' }) }

      await writeActivity(supabase, { type:'customer_registration_approved', title:'Kundenregistrierung freigeschaltet', message:`${registration.company_name} wurde freigeschaltet.`, ref_table:'customer_registrations', ref_id: registration.id, customer_id: registration.customer_id, severity:'success', metadata:{ reviewed_by: req.body?.reviewed_by || 'Admin', access_result, mail_results } })
      res.json({ ok:true, registration_id: registration.id, customer_id: registration.customer_id, access_result, mail_results })
    } catch (e) { next(e) }
  })

  router.post('/invite', requireAdminCustomerPortal, async (req, res, next) => {
    try {
      const body = req.body || {}
      if (!body.customer_id) return res.status(400).json({ ok:false, error:'customer_id fehlt' })
      if (!body.email) return res.status(400).json({ ok:false, error:'E-Mail fehlt' })
      const token = makeToken()
      const expiresAt = daysFromNow(body.expires_in_days || 14)

      const { data: customer } = await supabase.from('customers').select('*').eq('id', body.customer_id).maybeSingle()
      if (!customer) return res.status(404).json({ ok:false, error:'Kunde nicht gefunden' })

      const invitePayload = {
        customer_id: body.customer_id,
        email: body.email,
        contact_person: body.contact_person || customer.contact_person || null,
        package_name: body.package_name || customer.package_name || customer.requested_package || 'Starter',
        status: 'open',
        token,
        invite_url: buildInviteUrl(req, token, body),
        created_by: body.created_by || 'Admin',
        expires_at: expiresAt,
        metadata: { company_name: customer.name, origin: appBase(req, body) }
      }
      const { data: invite, error } = await supabase.from('customer_invites').insert(invitePayload).select('*').single()
      if (error) throw error

      await safeQuery(supabase.from('customers').update({
        email: body.email,
        contact_person: body.contact_person || customer.contact_person || null,
        status: customer.status === 'active' ? 'active' : 'invited',
        package_name: invitePayload.package_name,
        updated_at: nowIso()
      }).eq('id', body.customer_id))

      await safeQuery(supabase.from('notifications').insert({
        customer_id: body.customer_id,
        title: 'Login-Einladung erstellt',
        message: `Einladungslink für ${body.email} wurde erzeugt.`,
        type: 'customer_invite',
        actor_name: body.created_by || 'Admin'
      }))

      const mail_results = []
      try { mail_results.push(await sendCustomerInvite(supabase, invite, customer)) } catch (mailError) { mail_results.push({ error: mailError.message, template: 'customer_invite' }) }

      await writeActivity(supabase, { type:'customer_invite_created', title:'Kundeneinladung erstellt', message:`Einladung für ${body.email} erstellt.`, ref_id: invite.id, customer_id: body.customer_id, severity:'success', metadata:{ expires_at: expiresAt, mail_results } })
      res.json({ ok:true, invite, invite_url: invite.invite_url, mail_results })
    } catch (e) { next(e) }
  })

  router.post('/invite/:id/revoke', requireAdminCustomerPortal, async (req, res, next) => {
    try {
      const id = req.params.id
      const { data: invite, error: lookupError } = await supabase.from('customer_invites').select('*').eq('id', id).maybeSingle()
      if (lookupError) throw lookupError
      if (!invite) return res.status(404).json({ ok:false, error:'Einladung nicht gefunden' })
      if (invite.status !== 'open') return res.status(400).json({ ok:false, error:'Nur offene Einladungen können widerrufen werden.' })
      const patch = { status:'revoked', revoked_at: nowIso(), revoked_by: req.body?.revoked_by || 'Admin', updated_at: nowIso() }
      const { data, error } = await supabase.from('customer_invites').update(patch).eq('id', id).select('*').single()
      if (error) throw error
      await writeActivity(supabase, { type:'customer_invite_revoked', title:'Kundeneinladung widerrufen', message:`Einladung für ${invite.email} wurde widerrufen.`, ref_id:id, customer_id: invite.customer_id, severity:'warning', metadata:{ revoked_by: patch.revoked_by } })
      res.json({ ok:true, invite:data })
    } catch (e) { next(e) }
  })

  router.post('/invite/:id/resend', requireAdminCustomerPortal, async (req, res, next) => {
    try {
      const id = req.params.id
      const { data: oldInvite, error: lookupError } = await supabase.from('customer_invites').select('*').eq('id', id).maybeSingle()
      if (lookupError) throw lookupError
      if (!oldInvite) return res.status(404).json({ ok:false, error:'Einladung nicht gefunden' })
      if (!['open','expired','revoked'].includes(String(oldInvite.status))) return res.status(400).json({ ok:false, error:'Diese Einladung kann nicht erneuert werden.' })
      const token = makeToken()
      const expiresAt = daysFromNow(req.body?.expires_in_days || 14)
      const patch = { status:'open', token, invite_url: buildInviteUrl(req, token, req.body || {}), expires_at: expiresAt, resent_at: nowIso(), updated_at: nowIso(), metadata: { ...(oldInvite.metadata || {}), resent_from: id } }
      const { data, error } = await supabase.from('customer_invites').update(patch).eq('id', id).select('*').single()
      if (error) throw error
      const { data: customer } = await safeQuery(supabase.from('customers').select('*').eq('id', oldInvite.customer_id).maybeSingle()) || { data: null }
      const mail_results = []
      try { mail_results.push(await sendCustomerInvite(supabase, data, customer || {})) } catch (mailError) { mail_results.push({ error: mailError.message, template: 'customer_invite_resend' }) }

      await writeActivity(supabase, { type:'customer_invite_resent', title:'Kundeneinladung erneuert', message:`Einladung für ${oldInvite.email} wurde erneuert.`, ref_id:id, customer_id: oldInvite.customer_id, severity:'info', metadata:{ expires_at: expiresAt, mail_results } })
      res.json({ ok:true, invite:data, invite_url:data.invite_url, mail_results })
    } catch (e) { next(e) }
  })

  router.get('/invite/:token', async (req, res, next) => {
    try {
      const { data: invite, error } = await supabase
        .from('customer_invites')
        .select('*')
        .eq('token', req.params.token)
        .maybeSingle()
      if (error) throw error
      if (!invite) return res.status(404).json({ ok:false, error:'Einladung nicht gefunden' })
      if (invite.status !== 'open') return res.status(410).json({ ok:false, error:'Einladung ist nicht mehr aktiv' })
      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) return res.status(410).json({ ok:false, error:'Einladung ist abgelaufen' })
      const { data: customer } = await safeQuery(supabase.from('customers').select('id,name,branch,package_name,contact_person,email').eq('id', invite.customer_id).maybeSingle()) || { data:null }
      res.json({ ok:true, invite: { ...invite, token: undefined }, customer })
    } catch (e) { next(e) }
  })

  router.post('/accept-invite', async (req, res, next) => {
    try {
      const body = req.body || {}
      if (!body.token || !body.auth_user_id) return res.status(400).json({ ok:false, error:'token oder auth_user_id fehlt' })
      const { data: invite, error } = await supabase.from('customer_invites').select('*').eq('token', body.token).maybeSingle()
      if (error) throw error
      if (!invite) return res.status(404).json({ ok:false, error:'Einladung nicht gefunden' })
      if (invite.status !== 'open') return res.status(410).json({ ok:false, error:'Einladung ist nicht mehr aktiv' })
      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) return res.status(410).json({ ok:false, error:'Einladung ist abgelaufen' })

      const displayName = body.contact_person || invite.contact_person || invite.email
      await supabase.from('customer_invites').update({
        status:'accepted',
        accepted_at:nowIso(),
        used_at:nowIso(),
        auth_user_id: body.auth_user_id,
        updated_at: nowIso()
      }).eq('id', invite.id)

      await supabase.from('customers').update({
        status:'active',
        email: invite.email,
        contact_person: displayName,
        package_name: invite.package_name || 'Starter',
        updated_at: nowIso()
      }).eq('id', invite.customer_id)

      const profile = await ensureUserProfile(supabase, {
        auth_user_id: body.auth_user_id,
        customer_id: invite.customer_id,
        email: invite.email,
        display_name: displayName,
        role:'customer',
        status:'active'
      })

      await safeQuery(supabase.from('customer_users').upsert({
        auth_user_id: body.auth_user_id,
        customer_id: invite.customer_id,
        email: invite.email,
        display_name: displayName,
        role: 'owner',
        status: 'active',
        accepted_invite_id: invite.id,
        updated_at: nowIso()
      }, { onConflict:'auth_user_id,customer_id' }))

      await safeQuery(supabase.from('notifications').insert({
        customer_id: invite.customer_id,
        title: 'Kunde hat Einladung angenommen',
        message: `${invite.email} hat den Kundenportal-Zugang aktiviert.`,
        type: 'customer_invite_accepted',
        actor_name: displayName
      }))

      const access_result = await grantPackageTools(supabase, {
        customer_id: invite.customer_id,
        package_name: invite.package_name || 'Starter',
        actor_name: displayName
      })

      const { data: customerAfterAccept } = await safeQuery(supabase.from('customers').select('*').eq('id', invite.customer_id).maybeSingle()) || { data: null }
      const mail_results = []
      try { mail_results.push(await sendInviteAcceptedAdminNotice(supabase, invite, customerAfterAccept || {})) } catch (mailError) { mail_results.push({ error: mailError.message, template: 'customer_invite_accepted_admin' }) }

      await writeActivity(supabase, { type:'customer_invite_accepted', title:'Kundeneinladung angenommen', message:`${invite.email} hat den Portalzugang aktiviert.`, ref_id: invite.id, customer_id: invite.customer_id, severity:'success', metadata:{ access_result, mail_results } })
      res.json({ ok:true, customer_id: invite.customer_id, profile, access_result, mail_results })
    } catch (e) { next(e) }
  })

  router.post('/sync-package-access', requireAdminCustomerPortal, async (req, res, next) => {
    try {
      const body = req.body || {}
      if (!body.customer_id) return res.status(400).json({ ok:false, error:'customer_id fehlt' })
      const { data: customer } = await supabase.from('customers').select('*').eq('id', body.customer_id).maybeSingle()
      if (!customer) return res.status(404).json({ ok:false, error:'Kunde nicht gefunden' })
      const result = await grantPackageTools(supabase, {
        customer_id: body.customer_id,
        package_name: body.package_name || customer.package_name || customer.requested_package || 'Starter',
        actor_name: body.actor_name || 'Admin'
      })
      await writeActivity(supabase, { type:'customer_package_tools_synced', title:'Paket-Toolfreigaben synchronisiert', message:`Tools für ${customer.name} wurden anhand des Pakets synchronisiert.`, customer_id: body.customer_id, severity:'success', metadata:{ result } })
      res.json({ ok:true, result })
    } catch (e) { next(e) }
  })

  router.post('/package-request', async (req, res, next) => {
    try {
      const body = req.body || {}
      if (!body.customer_id || !body.package_name) return res.status(400).json({ ok:false, error:'customer_id oder package_name fehlt' })
      const { data, error } = await supabase.from('package_requests').insert({
        customer_id: body.customer_id,
        package_name: body.package_name,
        status: 'Angefragt',
        requested_by: body.requested_by || 'Kunde'
      }).select('*').single()
      if (error) throw error
      await safeQuery(supabase.from('notifications').insert({
        customer_id: body.customer_id,
        title: 'Paket angefragt',
        message: `${body.requested_by || 'Kunde'} hat ${body.package_name} angefragt.`,
        type: 'package_request',
        actor_name: body.requested_by || 'Kunde'
      }))

      const { data: customer } = await safeQuery(supabase.from('customers').select('*').eq('id', body.customer_id).maybeSingle()) || { data: null }
      const mail_results = []
      if (customer?.email) {
        try { mail_results.push(await sendPackageRequestNotice(supabase, data, customer)) } catch (mailError) { mail_results.push({ error: mailError.message, template: 'package_request_received' }) }
      }
      res.json({ ok:true, request:data, mail_results })
    } catch (e) { next(e) }
  })


  router.get('/marketing-consents', async (req, res, next) => {
    try {
      const role = String(req.userRole || req.userProfile?.role || '').toLowerCase()
      const profileCustomerId = req.userProfile?.customer_id || null
      const customerId = (role === 'admin' || role === 'super_admin') ? (req.query.customer_id || profileCustomerId) : profileCustomerId
      if (!customerId) return res.status(400).json({ ok:false, error:'customer_id fehlt' })

      const [consents, withdrawals, drafts, members] = await Promise.all([
        safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource','marketing_consents').order('created_at', { ascending:false }).limit(500)),
        safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource','marketing_consent_withdrawals').order('created_at', { ascending:false }).limit(500)),
        safeQuery(supabase.from('v33_functional_records').select('*').eq('customer_id', customerId).eq('resource','marketing_reminder_drafts').order('created_at', { ascending:false }).limit(500)),
        safeQuery(supabase.from('loyalty_customers').select('id,email,display_name,metadata,created_at,last_activity_at').eq('customer_id', customerId).limit(1000))
      ])

      const memberRows = members?.data || []
      const activeMembers = memberRows.filter((m) => m.metadata?.consent_marketing === true && m.metadata?.marketing_consent_status === 'granted')
      const pendingMembers = memberRows.filter((m) => m.metadata?.marketing_consent_status === 'pending_double_opt_in')
      const withdrawnMembers = memberRows.filter((m) => m.metadata?.marketing_consent_status === 'withdrawn')

      res.json({
        ok:true,
        customer_id: customerId,
        counts: {
          active_consents: activeMembers.length,
          pending_double_opt_in: pendingMembers.length,
          withdrawn: withdrawnMembers.length,
          consent_records: (consents?.data || []).length,
          withdrawal_records: (withdrawals?.data || []).length,
          reminder_drafts: (drafts?.data || []).length
        },
        active_members: activeMembers.map((m) => ({ id:m.id, email:m.email, display_name:m.display_name, consent_at:m.metadata?.marketing_consent_at, version:m.metadata?.marketing_consent_version, last_activity_at:m.last_activity_at })),
        pending_members: pendingMembers.map((m) => ({ id:m.id, email:m.email, display_name:m.display_name, requested_at:m.metadata?.marketing_consent_pending_at, version:m.metadata?.marketing_consent_version })),
        withdrawn_members: withdrawnMembers.map((m) => ({ id:m.id, email:m.email, display_name:m.display_name, withdrawn_at:m.metadata?.marketing_consent_withdrawn_at })),
        consent_records: consents?.data || [],
        withdrawal_records: withdrawals?.data || [],
        reminder_drafts: drafts?.data || []
      })
    } catch (e) { next(e) }
  })


  return router
}

module.exports = customerPortalRoutes
