async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function isDeleted(row = {}) {
  const s = String(row.status || '').toLowerCase()
  return row.is_deleted === true || row.deleted_at || ['deleted','archived','storniert_geloescht'].includes(s)
}

async function inspectBillingConsistency(supabase, { customer_id = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', issues: [] }
  let invQ = supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(1000)
  let filesQ = supabase.from('customer_files').select('*').limit(1000)
  let dunningQ = supabase.from('dunning_cases').select('*').limit(1000)
  if (customer_id) {
    invQ = invQ.eq('customer_id', customer_id)
    filesQ = filesQ.eq('customer_id', customer_id)
    dunningQ = dunningQ.eq('customer_id', customer_id)
  }
  const [invoices, files, dunning] = await Promise.all([safeQuery(invQ), safeQuery(filesQ), safeQuery(dunningQ)])
  const issues = []
  const fileRows = files.data || []
  const dunningRows = dunning.data || []
  const invoiceNumbers = new Map()

  for (const i of (invoices.data || []).filter((x) => !isDeleted(x))) {
    const number = String(i.invoice_number || i.number || '').trim()
    if (!i.customer_id) issues.push({ severity: 'critical', issue: 'invoice_missing_customer_id', invoice_id: i.id })
    if (!number) issues.push({ severity: 'critical', issue: 'invoice_missing_number', invoice_id: i.id })
    if (number) {
      const arr = invoiceNumbers.get(number) || []
      arr.push(i.id)
      invoiceNumbers.set(number, arr)
    }
    const amount = Number(i.amount ?? i.total ?? i.gross_total ?? 0)
    if (!Number.isFinite(amount) || amount <= 0) issues.push({ severity: 'warning', issue: 'invoice_missing_or_zero_amount', invoice_id: i.id, invoice_number: number })
    const status = String(i.status || '').toLowerCase()
    const pdfLinked = Boolean(i.pdf_url || i.pdf_base64 || fileRows.some((f) => String(f.name || f.original_name || '').includes(number) || String(f.metadata?.source_id || '') === String(i.id)))
    if (['sent','gesendet','paid','bezahlt','overdue','überfällig','ueberfaellig'].includes(status) && !pdfLinked) issues.push({ severity: 'warning', issue: 'invoice_status_requires_pdf', invoice_id: i.id, invoice_number: number, status: i.status })
    const hasDunning = dunningRows.some((d) => String(d.invoice_id || d.invoice_number || '') === String(i.id) || String(d.invoice_number || '') === number)
    if (['overdue','überfällig','ueberfaellig','mahnung'].includes(status) && !hasDunning) issues.push({ severity: 'info', issue: 'overdue_invoice_without_dunning_case', invoice_id: i.id, invoice_number: number })
    if (status.includes('paid') || status.includes('bezahlt')) {
      const paidAt = i.paid_at || i.payment_date || i.metadata?.paid_at
      if (!paidAt) issues.push({ severity: 'info', issue: 'paid_invoice_missing_paid_at', invoice_id: i.id, invoice_number: number })
    }
  }

  for (const [number, ids] of invoiceNumbers.entries()) {
    if (ids.length > 1) issues.push({ severity: 'critical', issue: 'duplicate_invoice_number', invoice_number: number, ids })
  }

  return { ok: !issues.some((x) => x.severity === 'critical'), issues, counts: { invoices: (invoices.data || []).length, files: fileRows.length, dunning_cases: dunningRows.length } }
}

module.exports = { inspectBillingConsistency }
