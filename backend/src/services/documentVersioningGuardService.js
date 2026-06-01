async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

async function inspectDocumentVersioningGuard(supabase, { customer_id = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', issues: [] }
  const table = (name) => {
    let q = supabase.from(name).select('*').limit(1000)
    if (customer_id) q = q.eq('customer_id', customer_id)
    return safeQuery(q)
  }
  const [offers, contracts, files] = await Promise.all([
    table('generated_offers'),
    table('generated_contracts'),
    table('customer_files')
  ])
  const issues = []
  const fileRows = files.data || []
  for (const row of [...(offers.data || []).map((x) => ({ ...x, kind: 'offer' })), ...(contracts.data || []).map((x) => ({ ...x, kind: 'contract' }))]) {
    if (!row.customer_id) issues.push({ severity: 'critical', issue: `${row.kind}_missing_customer_id`, id: row.id })
    if (!row.status) issues.push({ severity: 'warning', issue: `${row.kind}_missing_status`, id: row.id })
    const hasFile = Boolean(row.pdf_url || row.url || fileRows.some((f) => String(f.metadata?.source_id || f.source_id || '') === String(row.id)))
    if (!hasFile) issues.push({ severity: 'warning', issue: `${row.kind}_missing_pdf_or_file_link`, id: row.id })
    if (!row.version && !row.version_number) issues.push({ severity: 'info', issue: `${row.kind}_missing_version`, id: row.id })
  }
  return { ok: !issues.some((i) => i.severity === 'critical'), issues, counts: { offers: (offers.data || []).length, contracts: (contracts.data || []).length, files: fileRows.length } }
}

module.exports = { inspectDocumentVersioningGuard }
