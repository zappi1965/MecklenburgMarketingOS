
const express = require('express')

async function safeQuery(query) {
  try { return await query } catch { return null }
}

function customerPortalRoutes(supabase) {
  const router = express.Router()

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
          status: 'pending',
          onboarding_source: 'self_registration',
          is_demo: false
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

      res.json({ ok:true, customer, registration })
    } catch (e) { next(e) }
  })

  router.get('/registrations', async (_, res, next) => {
    try {
      const { data, error } = await supabase
        .from('customer_registrations')
        .select('*')
        .order('created_at', { ascending:false })
        .limit(100)
      if (error) throw error
      res.json({ ok:true, registrations:data || [] })
    } catch (e) { next(e) }
  })

  router.post('/approve/:id', async (req, res, next) => {
    try {
      const { data: registration, error } = await supabase
        .from('customer_registrations')
        .select('*')
        .eq('id', req.params.id)
        .single()
      if (error) throw error

      await supabase.from('customer_registrations').update({
        status:'approved',
        reviewed_at:new Date().toISOString(),
        reviewed_by:req.body?.reviewed_by || 'Admin'
      }).eq('id', registration.id)

      if (registration.customer_id) {
        await supabase.from('customers').update({
          status:'active',
          requested_package: registration.requested_package
        }).eq('id', registration.customer_id)
      }

      res.json({ ok:true })
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
      res.json({ ok:true, request:data })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = customerPortalRoutes
