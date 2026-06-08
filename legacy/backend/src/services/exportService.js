
class ExportService {
  constructor(supabase) {
    this.supabase = supabase
  }

  toCsv(rows = []) {
    if (!rows.length) return ''
    const keys = Object.keys(rows[0])
    const header = keys.join(',')
    const body = rows.map((row) =>
      keys.map((key) => {
        const value = row[key] ?? ''
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    ).join('\n')
    return `${header}\n${body}`
  }

  async exportTable(table, customer_id = null) {
    let q = this.supabase.from(table).select('*')
    if (customer_id) q = q.eq('customer_id', customer_id)
    const { data, error } = await q
    if (error) throw error
    return this.toCsv(data || [])
  }
}

module.exports = ExportService
