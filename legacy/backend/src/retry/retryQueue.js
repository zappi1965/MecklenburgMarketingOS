
class RetryQueue {
  constructor() {
    this.jobs = []
  }

  push(job) {
    this.jobs.push({
      ...job,
      retries: 0,
      created_at: new Date().toISOString()
    })
  }

  async process(handler) {
    for (const job of this.jobs) {
      try {
        await handler(job)
        job.done = true
      } catch (e) {
        job.retries += 1
        job.error = e.message
      }
    }
  }
}

module.exports = RetryQueue
