async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function hasFileLink(row = {}) {
  return Boolean(row.pdf_url || row.url || row.storage_path || row.file_path || row.xml_url || row.pdf_base64 || row.file_base64)
}

async function inspectDocumentIntegrity(supabase, { customer_id = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', issues: [] }
  const issues = []
  let invoices = safeQuery(supabase.from('invoices').select('*').limit(500))
  let files = safeQuery(supabase.from('customer_files').select('*').limit(1000))
  let outputDocs = safeQuery(supabase.from('output_documents').select('*').limit(500))
  if (customer_id) {
    invoices = safeQuery(supabase.from('invoices').select('*').eq('customer_id', customer_id).limit(500))
    files = safeQuery(supabase.from('customer_files').select('*').eq('customer_id', customer_id).limit(1000))
    outputDocs = safeQuery(supabase.from('output_documents').select('*').eq('customer_id', customer_id).limit(500))
  }
  const [inv, f, out] = await Promise.all([invoices, files, outputDocs])
  const fileRows = f.data || []

  for (const invoice of (inv.data || [])) {
    const number = String(invoice.invoice_number || invoice.number || invoice.id || '')
    const related = fileRows.filter((file) => String(file.name || file.original_name || '').includes(number) || String(file.metadata?.source_id || '') === String(invoice.id))
    if (!hasFileLink(invoice) && related.length === 0) {
      issues.push({ severity: 'warning', type: 'invoice_missing_pdf', invoice_id: invoice.id, invoice_number: number, hint: 'PDF neu erzeugen oder customer_files prüfen.' })
    }
    if (String(invoice.e_invoice_status || '').toLowerCase().includes('valid') === false && (invoice.xml_url || invoice.xrechnung_xml || invoice.zugferd_xml)) {
      issues.push({ severity: 'info', type: 'einvoice_validation_unknown', invoice_id: invoice.id, hint: 'XRechnung/ZUGFeRD extern validieren.' })
    }
  }

  for (const doc of (out.data || [])) {
    if (!hasFileLink(doc)) issues.push({ severity: 'warning', type: 'output_document_missing_file', document_id: doc.id, title: doc.title || doc.name || null })
  }

  return { ok: issues.filter((x) => x.severity === 'critical').length === 0, issues, counts: { invoices: (inv.data || []).length, customer_files: fileRows.length, output_documents: (out.data || []).length } }
}

module.exports = { inspectDocumentIntegrity }
