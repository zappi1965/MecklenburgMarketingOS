
class WorkflowService {
  constructor(supabase, notificationService, activityService) {
    this.supabase = supabase
    this.notifications = notificationService
    this.activity = activityService
  }

  async run({ customer_id = null, workflow_name, payload = {} }) {
    if (!this.supabase) {
      const err = new Error('SUPABASE_URL oder SERVICE_ROLE_KEY fehlt')
      err.status = 500
      throw err
    }

    const { data, error } = await this.supabase.from('workflow_runs').insert({
      customer_id,
      workflow_name,
      status: 'completed',
      payload
    }).select()

    if (error) throw error

    await this.notifications.createInApp({
      customer_id,
      title: 'Workflow ausgeführt',
      message: workflow_name
    })

    await this.activity.log({
      customer_id,
      action: 'workflow_run',
      message: workflow_name,
      payload
    })

    return data
  }

  async enqueueJob({ customer_id = null, job_type, payload = {} }) {
    const { data, error } = await this.supabase.from('worker_jobs').insert({
      customer_id,
      job_type,
      payload,
      status: 'queued'
    }).select()

    if (error) throw error
    return data
  }
}

module.exports = WorkflowService
