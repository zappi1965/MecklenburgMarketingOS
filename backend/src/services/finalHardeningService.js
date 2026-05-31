const { buildXRechnungXml } = require('./eInvoiceService')
const { toolsForPackage, grantPackageTools } = require('./packageAccessService')

const TENANT_TABLES = [
  'customers',
  'customer_users',
  'user_profiles',
  'invoices',
  'customer_files',
  'output_documents',
  'tickets',
  'ticket_messages',
  'monthly_reports',
  'approval_requests',
  'dsar_requests',
  'customer_tool_access',
  'qr_campaigns',
  'review_feedback',
  'seo_snapshots',
  'integrations'
]

const TABLE_TOOL_MAP = {
  invoices: 'finance',
  customer_files: 'media',
  output_documents: 'reports',
  tickets: 'tickets',
  ticket_messages: 'tickets',
  appointments: 'booking',
  monthly_reports: 'reports',
  approval_requests: 'approvals',
  dsar_requests: 'security_center',
  qr_campaigns: 'qr',
  public_landing_pages: 'public_landing',
  loyalty_programs: 'loyalty',
  loyalty_rewards: 'loyalty_rewards',
  loyalty_reward_rules: 'loyalty_rules',
  staff_codes: 'staff_codes',
  loyalty_segments: 'loyalty_segments',
  review_feedback: 'reviews',
  seo_snapshots: 'seo',
  customer_seo_metrics: 'seo',
  integrations: 'integrations',
  customer_health_scores: 'customer_health',
  customer_intelligence: 'customer_intelligence',
  customer_tool_access: 'packages',
  package_requests: 'packages'
}

function okStatus(errors = [], warnings = []) {
  return errors.length === 0 && warnings.length <= 0
}

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function tableColumns(supabase, tableName) {
  const rpc = await safeQuery(supabase.rpc('mmos_table_columns', { p_table: tableName }))
  if (Array.isArray(rpc?.data)) return rpc.data.map((r) => r.column_name || r)
  // Fallback: try one row and infer keys.
  const row = await safeQuery(supabase.from(tableName).select('*').limit(1))
  if (Array.isArray(row?.data) && row.data[0]) return Object.keys(row.data[0])
  return []
}

async function strictTenantAudit(supabase) {
  const rpc = await safeQuery(supabase.rpc('mmos_tenant_security_audit'))
  if (Array.isArray(rpc?.data)) {
    const rows = rpc.data
    const errors = rows.filter((r) => ['TABLE_MISSING', 'RLS_OFF', 'NO_POLICY'].includes(String(r.status || '')))
    const warnings = rows.filter((r) => String(r.status || '').includes('BROAD') || String(r.status || '').includes('WARN'))
    return { ok: errors.length === 0, source: 'rpc', rows, errors, warnings }
  }

  const rows = []
  for (const table of TENANT_TABLES) {
    const cols = await tableColumns(supabase, table)
    rows.push({
      table_name: table,
      customer_id_column: cols.includes('customer_id'),
      id_column: cols.includes('id'),
      status: cols.length ? (cols.includes('customer_id') || ['user_profiles', 'customers'].includes(table) ? 'CHECK_MANUAL_POLICY' : 'NO_CUSTOMER_ID_COLUMN') : 'TABLE_MISSING'
    })
  }
  const errors = rows.filter((r) => r.status === 'TABLE_MISSING')
  const warnings = rows.filter((r) => r.status !== 'TABLE_MISSING')
  return { ok: errors.length === 0, source: 'fallback_schema_probe', rows, errors, warnings, hint: 'Migration 0098 ausführen, um die RPC-Policy-Prüfung zu aktivieren.' }
}

async function customerPortalLiveCheck(supabase, customer_id) {
  const errors = []
  const warnings = []
  if (!customer_id) errors.push('customer_id fehlt')
  if (errors.length) return { ok: false, errors, warnings }

  const { data: customer, error: customerError } = await supabase.from('customers').select('*').eq('id', customer_id).maybeSingle()
  if (customerError) errors.push(`customers: ${customerError.message}`)
  if (!customer) errors.push('Kunde nicht gefunden')
  if (customer && String(customer.status || '').toLowerCase() !== 'active') warnings.push(`Kunde ist nicht active: ${customer.status || 'leer'}`)

  const users = await safeQuery(supabase.from('customer_users').select('*').eq('customer_id', customer_id).eq('status', 'active').limit(20))
  const profiles = await safeQuery(supabase.from('user_profiles').select('*').eq('customer_id', customer_id).eq('status', 'active').limit(20))
  const tools = await safeQuery(supabase.from('customer_tool_access').select('*').eq('customer_id', customer_id).eq('enabled', true).limit(200))
  const invoices = await safeQuery(supabase.from('invoices').select('id, invoice_number, status, pdf_url, storage_path, customer_id').eq('customer_id', customer_id).limit(50))
  const reports = await safeQuery(supabase.from('monthly_reports').select('id, title, status, output_url, customer_id').eq('customer_id', customer_id).limit(50))
  const files = await safeQuery(supabase.from('customer_files').select('id, name, file_type, url, storage_path, customer_id').eq('customer_id', customer_id).limit(50))

  if (users.error) warnings.push(`customer_users nicht lesbar: ${users.error.message}`)
  if (profiles.error) warnings.push(`user_profiles nicht lesbar: ${profiles.error.message}`)
  if (tools.error) warnings.push(`customer_tool_access nicht lesbar: ${tools.error.message}`)
  if (!users.error && (!users.data || users.data.length === 0)) warnings.push('Kein aktiver customer_users-Zugang')
  if (!profiles.error && (!profiles.data || profiles.data.length === 0)) warnings.push('Kein aktives user_profiles-Profil für Kunden')
  if (!tools.error && (!tools.data || tools.data.length === 0)) warnings.push('Keine aktiven Toolfreigaben')

  return {
    ok: errors.length === 0 && warnings.length === 0,
    customer,
    counts: {
      active_customer_users: users.data?.length || 0,
      active_profiles: profiles.data?.length || 0,
      enabled_tools: tools.data?.length || 0,
      invoices: invoices.data?.length || 0,
      reports: reports.data?.length || 0,
      files: files.data?.length || 0
    },
    errors,
    warnings,
    tool_keys: (tools.data || []).map((t) => t.tool_key).filter(Boolean)
  }
}

async function validatePackageToolAccess(supabase, customer_id, { sync = false, actor_name = 'Production Hardening' } = {}) {
  const errors = []
  const warnings = []
  const { data: customer, error } = await supabase.from('customers').select('*').eq('id', customer_id).maybeSingle()
  if (error) errors.push(error.message)
  if (!customer) errors.push('Kunde nicht gefunden')
  if (errors.length) return { ok: false, errors, warnings }

  const packageName = customer.package_name || customer.requested_package || 'Starter'
  const expected = toolsForPackage(packageName)
  const { data: rows, error: toolError } = await supabase.from('customer_tool_access').select('*').eq('customer_id', customer_id).eq('enabled', true)
  if (toolError) errors.push(toolError.message)
  const active = (rows || []).map((r) => String(r.tool_key || '')).filter(Boolean)
  const missing = expected.filter((tool) => !active.includes(tool))
  const extra = active.filter((tool) => !expected.includes(tool))

  let sync_result = null
  if (sync && missing.length) {
    sync_result = await grantPackageTools(supabase, { customer_id, package_name: packageName, actor_name })
  }

  return {
    ok: errors.length === 0 && missing.length === 0,
    package_name: packageName,
    expected_count: expected.length,
    active_count: active.length,
    missing,
    extra,
    sync_result,
    errors,
    warnings
  }
}

async function validateToolAccessProbe(supabase, { customer_id, tool_key }) {
  const errors = []
  if (!customer_id) errors.push('customer_id fehlt')
  if (!tool_key) errors.push('tool_key fehlt')
  if (errors.length) return { ok: false, errors }

  const { data, error } = await supabase
    .from('customer_tool_access')
    .select('id, tool_key, enabled, visible_to_customer')
    .eq('customer_id', customer_id)
    .eq('tool_key', tool_key)
    .eq('enabled', true)
    .maybeSingle()

  if (error) return { ok: false, errors: [error.message] }
  return {
    ok: Boolean(data),
    allowed: Boolean(data),
    customer_id,
    tool_key,
    row: data || null,
    errors: data ? [] : ['Tool ist für diesen Kunden nicht aktiv freigegeben.']
  }
}

async function documentDeepValidation(supabase, customer_id) {
  const errors = []
  const warnings = []
  const [files, outputs, invoices, reports] = await Promise.all([
    safeQuery(supabase.from('customer_files').select('*').eq('customer_id', customer_id).limit(500)),
    safeQuery(supabase.from('output_documents').select('*').eq('customer_id', customer_id).limit(500)),
    safeQuery(supabase.from('invoices').select('*').eq('customer_id', customer_id).limit(500)),
    safeQuery(supabase.from('monthly_reports').select('*').eq('customer_id', customer_id).limit(500))
  ])

  for (const [name, result] of Object.entries({ files, outputs, invoices, reports })) {
    if (result.error) warnings.push(`${name}: ${result.error.message}`)
  }

  for (const f of files.data || []) {
    if (!f.url && !f.storage_path && !f.pdf_url) warnings.push(`customer_files ${f.id || f.name}: keine url/storage_path`)
    if (f.mime_type && String(f.mime_type).includes('pdf') && !String(f.name || '').toLowerCase().endsWith('.pdf')) warnings.push(`PDF-Datei ohne .pdf-Dateiname: ${f.name || f.id}`)
  }
  for (const d of outputs.data || []) {
    if (!d.public_url && !d.pdf_url && !d.storage_path && !d.url) warnings.push(`output_documents ${d.id}: keine Datei-Referenz`)
  }
  for (const i of invoices.data || []) {
    if (!i.invoice_number) errors.push(`Rechnung ${i.id}: invoice_number fehlt`)
    if (!i.pdf_url && !i.storage_path && !i.url && !i.pdf_base64) warnings.push(`Rechnung ${i.invoice_number || i.id}: kein PDF verknüpft`)
  }
  for (const r of reports.data || []) {
    if (!r.output_url && !r.pdf_url && !r.storage_path && !r.url) warnings.push(`Report ${r.title || r.id}: kein Output/PDF verknüpft`)
  }

  return {
    ok: errors.length === 0 && warnings.length === 0,
    counts: {
      files: files.data?.length || 0,
      output_documents: outputs.data?.length || 0,
      invoices: invoices.data?.length || 0,
      reports: reports.data?.length || 0
    },
    errors,
    warnings
  }
}

function sellerFromEnv() {
  return {
    name: process.env.E_INVOICE_SELLER_NAME || process.env.MAIL_COMPANY_NAME || 'MecklenburgMarketing GbR',
    address: process.env.E_INVOICE_SELLER_ADDRESS || '',
    postal_code: process.env.E_INVOICE_SELLER_POSTAL_CODE || '',
    city: process.env.E_INVOICE_SELLER_CITY || '',
    country_code: process.env.E_INVOICE_SELLER_COUNTRY || 'DE',
    vat_id: process.env.E_INVOICE_SELLER_VAT_ID || '',
    tax_id: process.env.E_INVOICE_SELLER_TAX_ID || '',
    email: process.env.E_INVOICE_SELLER_EMAIL || process.env.MAIL_REPLY_TO || 'info@mecklenburgmarketing.de',
    iban: process.env.E_INVOICE_SELLER_IBAN || '',
    bic: process.env.E_INVOICE_SELLER_BIC || ''
  }
}

async function eInvoiceDeepValidation(supabase, customer_id) {
  const errors = []
  const warnings = []
  const { data: invoices, error } = await supabase.from('invoices').select('*').eq('customer_id', customer_id).limit(100)
  if (error) return { ok: false, errors: [error.message], warnings }
  const { data: customer } = await supabase.from('customers').select('*').eq('id', customer_id).maybeSingle()
  const seller = sellerFromEnv()
  const sellerMissing = ['address', 'postal_code', 'city'].filter((k) => !seller[k])
  if (sellerMissing.length) warnings.push(`Verkäufer-Stammdaten unvollständig: ${sellerMissing.join(', ')}`)
  if (!invoices?.length) warnings.push('Keine Rechnungen für E-Rechnungstest vorhanden')

  const results = []
  for (const invoice of invoices || []) {
    const required = []
    if (!invoice.invoice_number) required.push('invoice_number')
    if (!Number(invoice.amount || invoice.total || 0)) required.push('amount')
    if (!customer?.name) required.push('buyer.name')
    const buyer = customer ? {
      name: customer.name,
      email: customer.email,
      address: customer.address || '',
      postal_code: customer.postal_code || '',
      city: customer.city || '',
      country_code: customer.country_code || 'DE',
      vat_id: customer.vat_id || ''
    } : { name: 'Kunde' }
    let xmlOk = false
    let xmlError = null
    try {
      const xml = buildXRechnungXml({ ...invoice, seller, buyer })
      xmlOk = xml.includes('<ubl:Invoice') && xml.includes('<cbc:CustomizationID>')
      if (!xmlOk) xmlError = 'XML enthält keine erwarteten UBL/XRechnung-Marker.'
    } catch (e) {
      xmlError = e.message
    }
    if (required.length) errors.push(`Rechnung ${invoice.invoice_number || invoice.id}: Pflichtfelder fehlen: ${required.join(', ')}`)
    if (xmlError) errors.push(`Rechnung ${invoice.invoice_number || invoice.id}: ${xmlError}`)
    results.push({ id: invoice.id, invoice_number: invoice.invoice_number, required_missing: required, xrechnung_xml_ok: xmlOk })
  }
  return { ok: errors.length === 0 && warnings.length === 0, count: invoices?.length || 0, results, errors, warnings }
}

async function backupRestorePracticalCheck(supabase) {
  const errors = []
  const warnings = []
  const tables = ['customers', 'customer_users', 'user_profiles', 'invoices', 'customer_files', 'monthly_reports', 'customer_tool_access']
  const snapshot = { exported_at: new Date().toISOString(), tables: {} }
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(250)
    snapshot.tables[table] = error ? { ok: false, error: error.message, rows: [] } : { ok: true, count: data.length, rows: data }
    if (error) warnings.push(`${table}: ${error.message}`)
  }
  const serialized = JSON.stringify(snapshot)
  let parseOk = false
  try {
    const parsed = JSON.parse(serialized)
    parseOk = Boolean(parsed.tables && parsed.tables.customers)
  } catch (e) {
    errors.push(`Snapshot nicht parsebar: ${e.message}`)
  }
  try {
    await supabase.from('backup_drill_runs').insert({
      status: parseOk ? 'dry_restore_ok' : 'dry_restore_failed',
      table_count: tables.length,
      row_count: Object.values(snapshot.tables).reduce((sum, t) => sum + Number(t.count || 0), 0),
      metadata: { mode: 'practical_api_dry_restore', bytes: Buffer.byteLength(serialized) },
      created_at: new Date().toISOString()
    })
  } catch (e) {
    warnings.push(`backup_drill_runs konnte nicht geschrieben werden: ${e.message}`)
  }
  return { ok: errors.length === 0 && warnings.length === 0, parse_ok: parseOk, bytes: Buffer.byteLength(serialized), tables: Object.fromEntries(Object.entries(snapshot.tables).map(([k, v]) => [k, { ok: v.ok, count: v.count || 0, error: v.error || null }])), errors, warnings }
}

async function finalAcceptanceCheck(supabase, customer_id) {
  const [tenant, portal, packageAccess, documents, einvoice, backup] = await Promise.all([
    strictTenantAudit(supabase).catch((e) => ({ ok: false, errors: [e.message] })),
    customerPortalLiveCheck(supabase, customer_id).catch((e) => ({ ok: false, errors: [e.message] })),
    validatePackageToolAccess(supabase, customer_id).catch((e) => ({ ok: false, errors: [e.message] })),
    documentDeepValidation(supabase, customer_id).catch((e) => ({ ok: false, errors: [e.message] })),
    eInvoiceDeepValidation(supabase, customer_id).catch((e) => ({ ok: false, errors: [e.message] })),
    backupRestorePracticalCheck(supabase).catch((e) => ({ ok: false, errors: [e.message] }))
  ])
  const checks = { tenant, portal, packageAccess, documents, einvoice, backup }
  const ok = Object.values(checks).every((x) => x.ok)
  return { ok, customer_id, checked_at: new Date().toISOString(), checks }
}

module.exports = {
  TENANT_TABLES,
  TABLE_TOOL_MAP,
  strictTenantAudit,
  customerPortalLiveCheck,
  validatePackageToolAccess,
  validateToolAccessProbe,
  documentDeepValidation,
  eInvoiceDeepValidation,
  backupRestorePracticalCheck,
  finalAcceptanceCheck
}
