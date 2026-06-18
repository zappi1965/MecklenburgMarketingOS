
const { enqueueJob } = require('../services/jobQueueService')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')

class RetryQueue {
  constructor(supabase) {
    // Accept an optional supabase client; fall back to the admin singleton.
    this._supabase = supabase || null
  }

  _getSupabase() {
    return this._supabase || getSupabaseAdmin()
  }

  async push(job) {
    const supabase = this._getSupabase()
    if (!supabase) {
      // No DB available — keep a minimal in-memory fallback so callers don't crash.
      console.warn('[RetryQueue] Supabase nicht konfiguriert — Job wird nicht persistiert:', job)
      return null
    }
    return enqueueJob(supabase, {
      type: 'retry',
      payload: { ...job, retries: 0, created_at: new Date().toISOString() }
    })
  }

  async process(handler) {
    // Deprecated in-memory process path — real retry processing happens via
    // the job queue worker (runOneJob). Kept for backward-compat test usage.
    console.warn('[RetryQueue] process() is a no-op — use the job queue worker instead.')
  }
}

module.exports = RetryQueue
