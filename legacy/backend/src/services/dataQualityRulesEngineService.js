async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function isDeleted(row = {}) {
  const s = String(row.status || '').toLowerCase()
  return row.is_deleted === true || row.deleted === true || row.archived === true || Boolean(row.deleted_at || row.archived_at) || ['deleted','archived','gelöscht','geloescht'].includes(s)
}

function norm(v = '') { return String(v || '').trim().toLowerCase() }

function duplicateGroups(rows, keyFn) {
  const map = new Map()
  for (const row of rows) {
    const key = keyFn(row)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(row)
  }
  return Array.from(map.entries()).filter(([_, items]) => items.length > 1).map(([key, items]) => ({ key, count: items.length, ids: items.map((i) => i.id).filter(Boolean).slice(0, 20) }))
}

async function inspectDataQualityRules(supabase, { customer_id = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', issues: [] }

  const table = (name) => {
    let q = supabase.from(name).select('*').limit(1000)
    if (customer_id) q = q.eq('customer_id', customer_id)
    return safeQuery(q)
  }

  const [customers, leads, invoices, files, tools] = await Promise.all([
    customer_id ? safeQuery(supabase.from('customers').select('*').eq('id', customer_id).limit(1)) : safeQuery(supabase.from('customers').select('*').limit(1000)),
    table('prospect_leads'),
    table('invoices'),
    table('customer_files'),
    table('customer_tool_access')
  ])

  const issues = []
  for (const c of (customers.data || []).filter((x) => !isDeleted(x))) {
    if (!c.name && !c.title && !c.company) issues.push({ severity: 'critical', table: 'customers', id: c.id, issue: 'customer_missing_name' })
    if (!c.email) issues.push({ severity: 'warning', table: 'customers', id: c.id, issue: 'customer_missing_email' })
    if (!c.package_name && !c.requested_package) issues.push({ severity: 'warning', table: 'customers', id: c.id, issue: 'customer_missing_package' })
  }

  for (const row of [...(leads.data || []), ...(invoices.data || []), ...(files.data || []), ...(tools.data || [])].filter((x) => !isDeleted(x))) {
    if (!row.customer_id && row.table !== 'customers') issues.push({ severity: 'critical', table: row.table || 'unknown', id: row.id, issue: 'missing_customer_id' })
  }

  const leadRows = (leads.data || []).filter((x) => !isDeleted(x))
  duplicateGroups(leadRows, (r) => norm(r.google_place_id || r.website || r.phone || r.email || r.name || r.title)).forEach((g) => issues.push({ severity: 'warning', table: 'prospect_leads', issue: 'possible_duplicate_leads', ...g }))
  duplicateGroups((customers.data || []).filter((x) => !isDeleted(x)), (r) => norm(r.email || r.website || r.name || r.title)).forEach((g) => issues.push({ severity: 'warning', table: 'customers', issue: 'possible_duplicate_customers', ...g }))

  return { ok: !issues.some((i) => i.severity === 'critical'), issues, counts: { customers: (customers.data || []).length, leads: leadRows.length, invoices: (invoices.data || []).length, files: (files.data || []).length, tools: (tools.data || []).length } }
}

module.exports = { inspectDataQualityRules }
