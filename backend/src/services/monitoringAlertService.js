const MailService = require('./mailService')

async function writeAlertEvent(supabase, payload) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.from('monitoring_alert_events').insert({
      level: payload.level || 'info',
      title: payload.title || 'MMOS Monitoring',
      message: payload.message || '',
      channel: payload.channel || 'system',
      status: payload.status || 'created',
      metadata: payload.metadata || {},
      created_at: new Date().toISOString()
    }).select('*').maybeSingle()
    if (error) throw error
    return data
  } catch (e) {
    return { error: e.message }
  }
}

async function sendMonitoringAlert(supabase, payload = {}) {
  const event = await writeAlertEvent(supabase, payload)
  const to = payload.to || process.env.MONITORING_ALERT_EMAIL || process.env.ADMIN_ALERT_EMAIL
  if (!to || !process.env.RESEND_API_KEY) {
    return { ok: true, sent: false, reason: 'MAIL_NOT_CONFIGURED', event }
  }

  const mail = new MailService()
  const result = await mail.send({
    to,
    subject: payload.subject || `[MMOS] ${payload.title || 'Monitoring Alert'}`,
    html: `<h2>${payload.title || 'MMOS Monitoring'}</h2><p>${payload.message || ''}</p><pre>${JSON.stringify(payload.metadata || {}, null, 2)}</pre>`
  })

  await writeAlertEvent(supabase, {
    ...payload,
    channel: 'email',
    status: 'sent',
    metadata: { ...(payload.metadata || {}), mail_result: result }
  })

  return { ok: true, sent: true, result, event }
}

module.exports = { sendMonitoringAlert, writeAlertEvent }
