
class ActivityService {
  constructor(supabase) {
    this.supabase = supabase
  }

  async log({ customer_id = null, action, message, payload = {} }) {
    if (!this.supabase) return null
    await this.supabase.from('activity_logs').insert({
      customer_id,
      action,
      message,
      payload
    }).catch(() => null)
  }
}

module.exports = ActivityService
