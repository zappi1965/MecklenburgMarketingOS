
const { validatePayload, allowedTables } = require('../schemas/coreSchemas')

class CrudService {
  constructor(supabase, activityService) {
    this.supabase = supabase
    this.activity = activityService
  }

  ensure() {
    if (!this.supabase) {
      const err = new Error('SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt')
      err.status = 500
      throw err
    }
  }

  async list(table, { customer_id } = {}) {
    this.ensure()
    if (!allowedTables.includes(table)) {
      const err = new Error('table not allowed')
      err.status = 400
      throw err
    }

    let q = this.supabase.from(table).select('*')
    if (customer_id) q = q.eq('customer_id', customer_id)
    q = q.order('created_at', { ascending: false })

    const { data, error } = await q
    if (error) throw error
    return data || []
  }

  async create(table, payload) {
    this.ensure()
    validatePayload(table, payload)

    const { data, error } = await this.supabase.from(table).insert(payload).select()
    if (error) throw error

    await this.activity.log({
      customer_id: payload.customer_id || null,
      action: 'create',
      message: `${table} erstellt`,
      payload
    })

    return data
  }

  async update(table, id, payload) {
    this.ensure()
    if (!allowedTables.includes(table)) {
      const err = new Error('table not allowed')
      err.status = 400
      throw err
    }

    const { data, error } = await this.supabase.from(table).update(payload).eq('id', id).select()
    if (error) throw error

    await this.activity.log({
      customer_id: payload.customer_id || null,
      action: 'update',
      message: `${table} aktualisiert`,
      payload: { id, ...payload }
    })

    return data
  }

  async remove(table, id) {
    this.ensure()
    if (!allowedTables.includes(table)) {
      const err = new Error('table not allowed')
      err.status = 400
      throw err
    }

    const { error } = await this.supabase.from(table).delete().eq('id', id)
    if (error) throw error

    await this.activity.log({
      customer_id: null,
      action: 'delete',
      message: `${table} gelöscht`,
      payload: { id }
    })

    return true
  }
}

module.exports = CrudService
