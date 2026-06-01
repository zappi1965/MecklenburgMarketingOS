const RESTORABLE_TABLES = ['customers','prospect_leads','qr_campaigns','loyalty_rewards','staff_codes','customer_tool_access','invoices','output_documents','customer_files','mail_templates','booking_slots','appointments']

async function safeQuery(query) {
  try { return await query } catch (error) { return { data: null, error } }
}

function isDeleted(row = {}) {
  const s = String(row.status || '').toLowerCase()
  return row.is_deleted === true || row.deleted === true || row.archived === true || Boolean(row.deleted_at || row.archived_at || row.removed_at) || ['deleted','archived','gelöscht','geloescht','removed'].includes(s)
}

async function listTrash(supabase, { customer_id = null, table = null } = {}) {
  if (!supabase) return { ok: false, error: 'Supabase nicht konfiguriert', items: [] }
  const tables = table ? [table] : RESTORABLE_TABLES
  const items = []
  for (const t of tables) {
    let q = supabase.from(t).select('*').limit(500)
    if (customer_id) q = q.eq('customer_id', customer_id)
    const res = await safeQuery(q)
    if (res.error) continue
    for (const row of (res.data || []).filter(isDeleted)) items.push({ table: t, id: row.id, customer_id: row.customer_id || null, title: row.title || row.name || row.invoice_number || row.email || row.id, status: row.status || null, deleted_at: row.deleted_at || row.archived_at || row.removed_at || null })
  }
  return { ok: true, items, count: items.length }
}

async function restoreItem(supabase, { table, id } = {}) {
  if (!supabase || !table || !id) return { ok: false, error: 'table/id fehlt' }
  if (!RESTORABLE_TABLES.includes(table)) return { ok: false, error: 'Tabelle nicht für Restore freigegeben' }
  const patch = { is_deleted: false, deleted: false, archived: false, deleted_at: null, archived_at: null, removed_at: null, status: 'active', updated_at: new Date().toISOString() }
  let res = await safeQuery(supabase.from(table).update(patch).eq('id', id).select('*').maybeSingle())
  if (res.error) {
    const safePatch = { status: 'active', updated_at: new Date().toISOString() }
    res = await safeQuery(supabase.from(table).update(safePatch).eq('id', id).select('*').maybeSingle())
  }
  if (res.error) return { ok: false, error: res.error.message }
  return { ok: true, item: res.data || { id, table } }
}

module.exports = { listTrash, restoreItem, RESTORABLE_TABLES }
