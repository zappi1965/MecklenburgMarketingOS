const express = require('express')
const authMiddleware = require('../middleware/auth')

const SUBJECT_TYPE = 'authenticated_user'
const DELETE_GRACE_DAYS = 30

function getEmail(req) {
  return String(req.user?.email || req.userProfile?.email || '').toLowerCase().trim()
}

async function logSecurityEvent(supabase, params) {
  if (!supabase) return
  try {
    await supabase.from('security_events').insert({
      customer_id: params.customer_id || null,
      actor_type: 'user',
      actor_id: params.actor_id || null,
      event_type: params.event_type,
      severity: params.severity || 'info',
      title: params.title,
      description: params.description || null,
      metadata: params.metadata || {}
    })
  } catch (_) {
    // Audit log failures must not block the user-facing flow.
  }
}

function gdprRoutes(supabase) {
  const router = express.Router()
  router.use(authMiddleware())

  // List the user's own DSAR requests so they can see status, completion and
  // any export download URL once it has been provided.
  router.get('/requests', async (req, res, next) => {
    try {
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert.' })
      const email = getEmail(req)
      const { data, error } = await supabase
        .from('dsar_requests')
        .select('id, type, status, subject_email, export_url, completed_at, notes, metadata, created_at, updated_at')
        .eq('subject_email', email)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      res.json({ ok: true, requests: data || [] })
    } catch (e) { next(e) }
  })

  // Art. 15 DSGVO: request a data export. Creates a DSAR record; the
  // fulfilment worker (or admin) generates the export and fills export_url.
  router.post('/export', async (req, res, next) => {
    try {
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert.' })
      const email = getEmail(req)
      if (!email) return res.status(400).json({ ok: false, error: 'E-Mail-Adresse des Nutzers fehlt.' })

      const customerId = req.userProfile?.customer_id || null
      const notes = String(req.body?.notes || '').slice(0, 1000) || null

      const { data, error } = await supabase
        .from('dsar_requests')
        .insert({
          customer_id: customerId,
          subject_type: SUBJECT_TYPE,
          subject_email: email,
          type: 'export',
          status: 'Offen',
          requested_by: req.user.id,
          notes,
          metadata: {
            source: 'self_service',
            user_agent: String(req.headers['user-agent'] || '').slice(0, 300)
          }
        })
        .select('id, type, status, created_at, metadata')
        .maybeSingle()
      if (error) throw error

      await logSecurityEvent(supabase, {
        customer_id: customerId,
        actor_id: req.user.id,
        event_type: 'dsar.export_requested',
        title: 'DSGVO-Auskunftsanfrage gestellt',
        description: `Nutzer ${email} hat einen Datenexport beantragt.`,
        metadata: { dsar_request_id: data?.id }
      })

      res.json({ ok: true, request: data, sla_days: 30 })
    } catch (e) { next(e) }
  })

  // Art. 17 DSGVO: request deletion. 30-day grace period before any data is
  // actually removed; legal retention (e.g. § 147 AO, § 257 HGB for invoices)
  // is honoured by the worker via anonymisation rather than hard delete.
  router.post('/delete-request', async (req, res, next) => {
    try {
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert.' })
      const email = getEmail(req)
      if (!email) return res.status(400).json({ ok: false, error: 'E-Mail-Adresse des Nutzers fehlt.' })

      // Block duplicates: if there is already a pending delete request, return it.
      const existing = await supabase
        .from('dsar_requests')
        .select('id, type, status, metadata, created_at')
        .eq('subject_email', email)
        .eq('type', 'delete')
        .in('status', ['Offen', 'In Bearbeitung'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (existing?.data) {
        return res.json({ ok: true, request: existing.data, alreadyPending: true })
      }

      const scheduledFor = new Date(Date.now() + DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const customerId = req.userProfile?.customer_id || null
      const reason = String(req.body?.reason || '').slice(0, 1000) || null

      const { data, error } = await supabase
        .from('dsar_requests')
        .insert({
          customer_id: customerId,
          subject_type: SUBJECT_TYPE,
          subject_email: email,
          type: 'delete',
          status: 'Offen',
          requested_by: req.user.id,
          notes: reason,
          metadata: {
            source: 'self_service',
            scheduled_for: scheduledFor,
            grace_days: DELETE_GRACE_DAYS,
            user_agent: String(req.headers['user-agent'] || '').slice(0, 300)
          }
        })
        .select('id, type, status, created_at, metadata')
        .maybeSingle()
      if (error) throw error

      await logSecurityEvent(supabase, {
        customer_id: customerId,
        actor_id: req.user.id,
        event_type: 'dsar.delete_requested',
        severity: 'warning',
        title: 'DSGVO-Löschantrag gestellt',
        description: `Nutzer ${email} hat die Löschung seiner Daten beantragt. Wirksam ab ${scheduledFor}.`,
        metadata: { dsar_request_id: data?.id, scheduled_for: scheduledFor }
      })

      res.json({ ok: true, request: data, scheduled_for: scheduledFor })
    } catch (e) { next(e) }
  })

  // Allow cancellation of one's own pending delete request during the grace
  // period. After the worker has executed the deletion the status moves to
  // 'Erledigt' and this endpoint returns 409.
  router.post('/delete-cancel/:id', async (req, res, next) => {
    try {
      if (!supabase) return res.status(503).json({ ok: false, error: 'Supabase nicht konfiguriert.' })
      const email = getEmail(req)
      const id = String(req.params.id || '')
      if (!id) return res.status(400).json({ ok: false, error: 'request_id fehlt.' })

      const { data: row, error: readError } = await supabase
        .from('dsar_requests')
        .select('id, type, status, subject_email, metadata')
        .eq('id', id)
        .maybeSingle()
      if (readError) throw readError
      if (!row) return res.status(404).json({ ok: false, error: 'Anfrage nicht gefunden.' })
      if (row.subject_email !== email) {
        return res.status(403).json({ ok: false, error: 'Diese Anfrage gehört nicht zu deinem Konto.' })
      }
      if (row.type !== 'delete') {
        return res.status(400).json({ ok: false, error: 'Nur Löschanträge können storniert werden.' })
      }
      if (!['Offen', 'In Bearbeitung'].includes(row.status)) {
        return res.status(409).json({ ok: false, error: 'Anfrage ist bereits abgeschlossen und kann nicht mehr storniert werden.' })
      }

      const { data, error } = await supabase
        .from('dsar_requests')
        .update({
          status: 'Storniert',
          updated_at: new Date().toISOString(),
          metadata: { ...(row.metadata || {}), cancelled_at: new Date().toISOString(), cancelled_by: req.user.id }
        })
        .eq('id', id)
        .select('id, type, status, metadata, updated_at')
        .maybeSingle()
      if (error) throw error

      await logSecurityEvent(supabase, {
        actor_id: req.user.id,
        event_type: 'dsar.delete_cancelled',
        title: 'DSGVO-Löschantrag storniert',
        description: `Nutzer ${email} hat den Löschantrag widerrufen.`,
        metadata: { dsar_request_id: id }
      })

      res.json({ ok: true, request: data })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = gdprRoutes
