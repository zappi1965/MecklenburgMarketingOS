const { inspectCustomerPortalPermissions } = require('./customerPortalPermissionGuardService')
const { inspectDataQualityRules } = require('./dataQualityRulesEngineService')
const { inspectDocumentIntegrity } = require('./documentIntegrityService')
const { inspectMailDeliveryGuard } = require('./mailDeliveryGuardService')
const { inspectBookingConsistency } = require('./bookingConsistencyGuardService')
const { qrEndToEndDiagnostic } = require('./qrMaintenanceService')
const { evaluateToolAccessPolicy } = require('./toolAccessPolicyService')

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function pass(key, label, ok, hint = '') { return { key, label, ok: Boolean(ok), severity: ok ? 'ok' : 'warning', hint } }

async function inspectCustomerGoLiveChecklist(supabase, { customer_id } = {}) {
  if (!supabase || !customer_id) return { ok: false, error: 'customer_id fehlt', checklist: [] }
  const [customerRes, usersRes, toolsRes, qrRes, rewardsRes, permission, dataQuality, docs, booking, qrDiag] = await Promise.all([
    safeQuery(supabase.from('customers').select('*').eq('id', customer_id).maybeSingle()),
    safeQuery(supabase.from('customer_users').select('*').eq('customer_id', customer_id).limit(50)),
    safeQuery(supabase.from('customer_tool_access').select('*').eq('customer_id', customer_id).limit(300)),
    safeQuery(supabase.from('qr_campaigns').select('*').eq('customer_id', customer_id).limit(100)),
    safeQuery(supabase.from('loyalty_rewards').select('*').eq('customer_id', customer_id).limit(100)),
    inspectCustomerPortalPermissions(supabase, { customer_id }).catch((e) => ({ ok: false, error: e.message })),
    inspectDataQualityRules(supabase, { customer_id }).catch((e) => ({ ok: false, error: e.message, issues: [] })),
    inspectDocumentIntegrity(supabase, { customer_id }).catch((e) => ({ ok: false, error: e.message, issues: [] })),
    inspectBookingConsistency(supabase, { customer_id }).catch((e) => ({ ok: false, error: e.message, issues: [] })),
    qrEndToEndDiagnostic(supabase, { customer_id }).catch((e) => ({ ok: false, error: e.message, checks: [] }))
  ])
  const customer = customerRes.data
  const tools = toolsRes.data || []
  const qrRows = qrRes.data || []
  const checklist = [
    pass('customer_exists', 'Kunde existiert', customer, customer?.name || customer?.title || customer_id),
    pass('customer_active', 'Kunde aktiv', customer && !['deleted','archived','blocked','inactive'].includes(String(customer.status || '').toLowerCase()), customer?.status || 'Status fehlt'),
    pass('package_active', 'Paket / Freigabe vorhanden', permission.ok, permission.package_name || permission.error || ''),
    pass('user_exists', 'Portal-User vorhanden', (usersRes.data || []).length > 0, `${(usersRes.data || []).length} User`),
    pass('tools_configured', 'Tools freigeschaltet', tools.some((t) => t.enabled !== false), `${tools.length} Toolfreigaben`),
    pass('qr_targets_ready', 'QR-Ziele bereit', qrDiag.ok, qrDiag.recommendation || ''),
    pass('qr_target_q', 'QR-Ziele nutzen /q/[slug]', qrRows.every((q) => !q.slug || String(q.target_url || q.public_url || '').startsWith('/q/')), `${qrRows.length} QR-Kampagnen`),
    pass('rewards_plausible', 'Rewards plausibel', (rewardsRes.data || []).every((r) => Number(r.points_required || r.points || 0) >= 0), `${(rewardsRes.data || []).length} Rewards`),
    pass('data_quality', 'Datenqualität ohne kritische Fehler', dataQuality.ok, `${(dataQuality.issues || []).length} Hinweise`),
    pass('documents', 'Dokumente/Rechnungen plausibel', docs.ok, `${(docs.issues || []).length} Hinweise`),
    pass('booking', 'Buchungen konsistent', booking.ok, `${(booking.issues || []).length} Hinweise`),
    pass('mail', 'Mailversand konfiguriert', inspectMailDeliveryGuard().ok, inspectMailDeliveryGuard().provider || 'kein Provider')
  ]
  return { ok: checklist.every((c) => c.ok), customer_id, checklist, details: { permission, data_quality: dataQuality, documents: docs, booking, qr: qrDiag } }
}

module.exports = { inspectCustomerGoLiveChecklist }
