
class NotificationService {
  constructor(supabase, activityService) {
    this.supabase = supabase
    this.activity = activityService
  }

  async enqueue({ customer_id = null, title, message = '', channel = 'in_app', payload = {} }) {
    if (!this.supabase) return null

    const { data, error } = await this.supabase.from('notification_queue').insert({
      customer_id,
      title,
      message,
      channel,
      payload,
      status: 'queued'
    }).select()

    if (error) throw error

    await this.activity.log({
      customer_id,
      action: 'notification_queued',
      message: title,
      payload
    })

    return data
  }

  async createInApp({ customer_id = null, title, message = '' }) {
    if (!this.supabase) return null

    const { data, error } = await this.supabase.from('notifications').insert({
      customer_id,
      title,
      message
    }).select()

    if (error) throw error
    return data
  }
}

module.exports = NotificationService
