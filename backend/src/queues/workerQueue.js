
class WorkerQueue {
  constructor(supabase, workflowService) {
    this.supabase = supabase
    this.workflow = workflowService
  }

  async enqueue({ customer_id = null, job_type, payload = {} }) {
    const { data, error } = await this.supabase.from('worker_jobs').insert({
      customer_id,
      job_type,
      payload,
      status: 'queued'
    }).select()

    if (error) throw error
    return data
  }

  async processNext(limit = 10) {
    const { data: jobs, error } = await this.supabase
      .from('worker_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error

    for (const job of jobs || []) {
      try {
        if (job.job_type === 'workflow') await this.workflow.run(job.payload)
        await this.supabase.from('worker_jobs').update({ status: 'completed', processed_at: new Date().toISOString() }).eq('id', job.id)
      } catch (error) {
        await this.supabase.from('worker_jobs').update({ status: 'failed', error_message: error.message }).eq('id', job.id)
      }
    }

    return jobs || []
  }
}

module.exports = WorkerQueue
