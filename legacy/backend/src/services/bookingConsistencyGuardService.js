async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function toTime(v) {
  const t = new Date(v || 0).getTime()
  return Number.isFinite(t) ? t : 0
}

function overlaps(a, b) {
  const a1 = toTime(a.start_time || a.starts_at || a.start)
  const a2 = toTime(a.end_time || a.ends_at || a.end)
  const b1 = toTime(b.start_time || b.starts_at || b.start)
  const b2 = toTime(b.end_time || b.ends_at || b.end)
  if (!a1 || !a2 || !b1 || !b2) return false
  return a1 < b2 && b1 < a2
}

async function inspectBookingConsistency(supabase, { customer_id = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', issues: [] }
  const table = (name) => {
    let q = supabase.from(name).select('*').limit(1000)
    if (customer_id) q = q.eq('customer_id', customer_id)
    return safeQuery(q)
  }
  const [slots, appts, waitlist] = await Promise.all([table('booking_slots'), table('appointments'), table('booking_waitlist')])
  const issues = []
  const activeAppointments = (appts.data || []).filter((a) => !['cancelled','storniert','deleted'].includes(String(a.status || '').toLowerCase()))
  for (let i = 0; i < activeAppointments.length; i++) {
    for (let j = i + 1; j < activeAppointments.length; j++) {
      const a = activeAppointments[i], b = activeAppointments[j]
      const sameResource = String(a.resource_id || a.staff_id || a.employee_id || 'default') === String(b.resource_id || b.staff_id || b.employee_id || 'default')
      if (sameResource && overlaps(a, b)) issues.push({ severity: 'critical', issue: 'appointment_overlap', ids: [a.id, b.id], hint: 'Doppelbuchung/Überschneidung prüfen.' })
    }
  }
  for (const slot of (slots.data || [])) {
    if (slot.active === false && activeAppointments.some((a) => String(a.slot_id || '') === String(slot.id))) {
      issues.push({ severity: 'warning', issue: 'appointment_on_inactive_slot', slot_id: slot.id })
    }
  }
  for (const w of (waitlist.data || [])) {
    if (!w.customer_id) issues.push({ severity: 'warning', issue: 'waitlist_missing_customer_id', id: w.id })
  }
  return { ok: !issues.some((i) => i.severity === 'critical'), issues, counts: { slots: (slots.data || []).length, appointments: activeAppointments.length, waitlist: (waitlist.data || []).length } }
}

module.exports = { inspectBookingConsistency }
