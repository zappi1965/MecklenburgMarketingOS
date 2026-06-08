const { randomUUID } = require('crypto')

function nowIso() { return new Date().toISOString() }
function minutesFromNow(minutes) { return new Date(Date.now() + Number(minutes || 0) * 60 * 1000).toISOString() }

const handlers = new Map()

function registerJobHandler(type, handler) {
  if (!type || typeof handler !== 'function') throw new Error('Job handler braucht type und function')
  handlers.set(String(type), handler)
}

async function enqueueJob(supabase, { type, payload = {}, customer_id = null, actor_user_id = null, idempotency_key = null, run_after = null } = {}) {
  if (!supabase) throw new Error('Supabase nicht konfiguriert')
  if (!type) throw new Error('Job type fehlt')

  if (idempotency_key) {
    const { data: existing } = await supabase
      .from('job_queue')
      .select('*')
      .eq('idempotency_key', String(idempotency_key))
      .maybeSingle()
    if (existing) return existing
  }

  const record = {
    id: randomUUID(),
    type,
    status: 'queued',
    payload,
    customer_id,
    actor_user_id,
    idempotency_key,
    attempts: 0,
    max_attempts: Number(process.env.JOB_MAX_ATTEMPTS || 3),
    run_after: run_after || nowIso(),
    created_at: nowIso(),
    updated_at: nowIso()
  }
  const { data, error } = await supabase.from('job_queue').insert(record).select('*').maybeSingle()
  if (error) throw error
  return data
}

async function getJob(supabase, id) {
  const { data, error } = await supabase.from('job_queue').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

async function claimNextJob(supabase, workerId = `worker-${process.pid}`) {
  const { data: jobs, error } = await supabase
    .from('job_queue')
    .select('*')
    .eq('status', 'queued')
    .lte('run_after', nowIso())
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) throw error
  const job = jobs?.[0]
  if (!job) return null

  const { data, error: updateError } = await supabase
    .from('job_queue')
    .update({ status: 'running', locked_by: workerId, locked_at: nowIso(), attempts: Number(job.attempts || 0) + 1, updated_at: nowIso() })
    .eq('id', job.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle()
  if (updateError) throw updateError
  return data
}

async function completeJob(supabase, job, result = {}) {
  const { data, error } = await supabase
    .from('job_queue')
    .update({ status: 'completed', result, completed_at: nowIso(), updated_at: nowIso(), locked_by: null })
    .eq('id', job.id)
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

async function failJob(supabase, job, error) {
  const attempts = Number(job.attempts || 0)
  const max = Number(job.max_attempts || 3)
  const retry = attempts < max
  const patch = retry
    ? { status: 'queued', run_after: minutesFromNow(Math.min(30, attempts * 3 || 3)), locked_by: null, error: String(error?.message || error).slice(0, 1000), updated_at: nowIso() }
    : { status: 'failed', failed_at: nowIso(), locked_by: null, error: String(error?.message || error).slice(0, 1000), updated_at: nowIso() }
  const { data, error: updateError } = await supabase.from('job_queue').update(patch).eq('id', job.id).select('*').maybeSingle()
  if (updateError) throw updateError
  return data
}

async function runOneJob(supabase, workerId) {
  const job = await claimNextJob(supabase, workerId)
  if (!job) return null
  const handler = handlers.get(job.type)
  if (!handler) return failJob(supabase, job, new Error(`Kein Handler für Job-Typ ${job.type}`))
  try {
    const result = await handler(job)
    return completeJob(supabase, job, result)
  } catch (error) {
    return failJob(supabase, job, error)
  }
}

module.exports = { registerJobHandler, enqueueJob, getJob, claimNextJob, completeJob, failJob, runOneJob }
