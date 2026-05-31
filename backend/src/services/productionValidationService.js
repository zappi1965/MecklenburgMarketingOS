const { buildXRechnungXml } = require('./eInvoiceService')

const CORE_TABLES = [
  'customers',
  'customer_users',
  'user_profiles',
  'prospect_leads',
  'google_business_audits',
  'mini_audits',
  'generated_offers',
  'qr_campaigns',
  'customer_tool_access',
  'monthly_reports',
  'invoices',
  'customer_files',
  'output_documents',
  'sales_workflows',
  'sales_workflow_events',
  'sales_workflow_documents',
  'admin_action_logs',
  'production_health_checks',
  'production_smoke_tests'
]

const SENSITIVE_TABLES = [
  'customers',
  'customer_users',
  'user_profiles',
  'invoices',
  'customer_files',
  'output_documents',
  'sales_workflows',
  'sales_workflow_events',
  'sales_workflow_documents',
  'admin_action_logs',
  'api_keys',
  'customer_tool_access'
]

function requireAdminRequest(req) {
  const role = String(req.userRole || req.userProfile?.role || '').toLowerCase()
  if (role !== 'admin' && role !== 'super_admin') {
    const err = new Error('Nur interne Admin-Zugänge dürfen Produktionsprüfungen ausführen.')
    err.status = 403
    err.code = 'ADMIN_REQUIRED'
    throw err
  }
}

function status(ok, message, meta = {}) {
  return { ok: Boolean(ok), status: ok ? 'OK' : 'WARNUNG', message, ...meta }
}

async function countTable(supabase, table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) return { table, ok: false, error: error.message, count: null }
  return { table, ok: true, count: count || 0 }
}

async function validateCoreTables(supabase) {
  const rows = []
  for (const table of CORE_TABLES) rows.push(await countTable(supabase, table))
  return rows
}

async function validateDocumentRows(supabase, customer_id) {
  if (!customer_id) {
    const err = new Error('customer_id fehlt')
    err.status = 400
    err.code = 'CUSTOMER_ID_REQUIRED'
    throw err
  }

  const [files, outputDocs, workflowDocs] = await Promise.all([
    supabase.from('customer_files').select('*').eq('customer_id', customer_id).limit(500),
    supabase.from('output_documents').select('*').eq('customer_id', customer_id).limit(500),
    supabase.from('sales_workflow_documents').select('*').eq('customer_id', customer_id).limit(500)
  ])

  const errors = [files.error, outputDocs.error, workflowDocs.error].filter(Boolean)
  if (errors.length) throw errors[0]

  const fileRows = files.data || []
  const outputRows = outputDocs.data || []
  const workflowRows = workflowDocs.data || []

  const missingStorage = outputRows.filter((d) => !d.storage_path && !d.public_url && !d.signed_url)
  const orphanWorkflowDocs = workflowRows.filter((d) => d.source_id && !d.source_table)
  const invoiceFiles = fileRows.filter((f) => String(f.file_type || '').includes('invoice') || String(f.name || '').toLowerCase().includes('rechnung'))
  const reportFiles = fileRows.filter((f) => String(f.file_type || '').includes('report'))

  return {
    ok: missingStorage.length === 0 && orphanWorkflowDocs.length === 0,
    customer_id,
    counts: {
      customer_files: fileRows.length,
      output_documents: outputRows.length,
      workflow_documents: workflowRows.length,
      invoice_files: invoiceFiles.length,
      report_files: reportFiles.length
    },
    checks: [
      status(fileRows.length > 0 || outputRows.length > 0 || workflowRows.length > 0, 'Mindestens ein Dokument ist kundenbezogen gespeichert.'),
      status(missingStorage.length === 0, 'Output-Dokumente haben Storage-/URL-Bezug.', { affected: missingStorage.length }),
      status(orphanWorkflowDocs.length === 0, 'Workflow-Dokumente haben Quelle und Zuordnung.', { affected: orphanWorkflowDocs.length }),
      status(invoiceFiles.length > 0, 'Mindestens eine Rechnungsdatei ist vorhanden.', { affected: invoiceFiles.length }),
      status(reportFiles.length > 0, 'Mindestens eine Reportdatei ist vorhanden.', { affected: reportFiles.length })
    ]
  }
}

function validateInvoiceShape(invoice, customer) {
  const findings = []
  if (!invoice.invoice_number) findings.push('invoice_number fehlt')
  if (!invoice.customer_id) findings.push('customer_id fehlt')
  if (!Number(invoice.amount || invoice.total || 0)) findings.push('amount/total fehlt oder ist 0')
  if (!invoice.service_type && !invoice.title) findings.push('service_type/title fehlt')
  if (!customer?.name) findings.push('Kundenname fehlt')
  return findings
}

async function validateInvoices(supabase, customer_id) {
  let query = supabase.from('invoices').select('*').limit(500)
  if (customer_id) query = query.eq('customer_id', customer_id)
  const { data: invoices, error } = await query
  if (error) throw error

  const rows = []
  for (const invoice of invoices || []) {
    const { data: customer } = await supabase.from('customers').select('*').eq('id', invoice.customer_id).maybeSingle()
    const findings = validateInvoiceShape(invoice, customer)
    let xrechnung_ok = false
    let xrechnung_error = ''
    try {
      const xml = buildXRechnungXml({
        ...invoice,
        seller: {
          name: process.env.E_INVOICE_SELLER_NAME || 'Mecklenburg Marketing',
          address: process.env.E_INVOICE_SELLER_ADDRESS || '',
          postal_code: process.env.E_INVOICE_SELLER_POSTAL_CODE || '',
          city: process.env.E_INVOICE_SELLER_CITY || '',
          country_code: process.env.E_INVOICE_SELLER_COUNTRY || 'DE',
          vat_id: process.env.E_INVOICE_SELLER_VAT_ID || '',
          tax_id: process.env.E_INVOICE_SELLER_TAX_ID || '',
          email: process.env.E_INVOICE_SELLER_EMAIL || '',
          iban: process.env.E_INVOICE_SELLER_IBAN || '',
          bic: process.env.E_INVOICE_SELLER_BIC || ''
        },
        buyer: customer ? {
          name: customer.name,
          email: customer.email,
          address: customer.address,
          postal_code: customer.postal_code,
          city: customer.city,
          country_code: customer.country_code || 'DE',
          vat_id: customer.vat_id || ''
        } : { name: 'Kunde' }
      })
      xrechnung_ok = xml.includes('<ubl:Invoice') && xml.includes('<cbc:CustomizationID') && xml.includes('<cbc:PayableAmount')
    } catch (e) {
      xrechnung_error = e.message
    }
    rows.push({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id,
      amount: invoice.amount,
      ok: findings.length === 0 && xrechnung_ok,
      findings,
      xrechnung_ok,
      xrechnung_error
    })
  }

  return {
    ok: rows.every((r) => r.ok),
    count: rows.length,
    rows,
    seller_env: {
      name: Boolean(process.env.E_INVOICE_SELLER_NAME),
      address: Boolean(process.env.E_INVOICE_SELLER_ADDRESS),
      tax_id_or_vat_id: Boolean(process.env.E_INVOICE_SELLER_TAX_ID || process.env.E_INVOICE_SELLER_VAT_ID),
      iban: Boolean(process.env.E_INVOICE_SELLER_IBAN)
    }
  }
}

async function runRlsAudit(supabase) {
  try {
    const { data, error } = await supabase.rpc('mmos_rls_audit')
    if (!error && Array.isArray(data)) {
      return {
        ok: data.every((row) => row.rls_enabled === true),
        source: 'rpc:mmos_rls_audit',
        rows: data
      }
    }
  } catch (_) {}

  // Fallback if RPC is not installed yet.
  const rows = []
  for (const table of SENSITIVE_TABLES) {
    const probe = await supabase.from(table).select('*', { count: 'exact', head: true })
    rows.push({
      table_name: table,
      reachable_with_service_role: !probe.error,
      rls_enabled: null,
      note: probe.error ? probe.error.message : 'RLS-Status via Migration 0094/RPC prüfen'
    })
  }
  return {
    ok: false,
    source: 'fallback-table-probe',
    rows,
    hint: 'Führe supabase/migrations/0094_production_validation_rls_backup_monitoring.sql aus, damit mmos_rls_audit verfügbar ist.'
  }
}

async function exportBackupSnapshot(supabase, tables = CORE_TABLES, limit = 1000) {
  const snapshot = {
    exported_at: new Date().toISOString(),
    mode: 'json_snapshot',
    tables: {}
  }

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(limit)
    snapshot.tables[table] = error
      ? { ok: false, error: error.message, rows: [] }
      : { ok: true, count: (data || []).length, rows: data || [] }
  }

  return snapshot
}

async function productionSummary(supabase) {
  const tables = await validateCoreTables(supabase)
  const env = {
    supabase: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)),
    google: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    gotenberg: Boolean(process.env.GOTENBERG_URL),
    resend: Boolean(process.env.RESEND_API_KEY),
    sentry: Boolean(process.env.SENTRY_DSN),
    backup_bucket: Boolean(process.env.BACKUP_BUCKET || process.env.MMOS_BACKUP_BUCKET),
    document_bucket: Boolean(process.env.MMOS_DOCUMENT_BUCKET || process.env.SUPABASE_DOCUMENT_BUCKET)
  }
  return {
    ok: tables.every((t) => t.ok),
    tables,
    env,
    timestamp: new Date().toISOString()
  }
}

module.exports = {
  requireAdminRequest,
  validateCoreTables,
  validateDocumentRows,
  validateInvoices,
  runRlsAudit,
  exportBackupSnapshot,
  productionSummary,
  CORE_TABLES,
  SENSITIVE_TABLES
}
