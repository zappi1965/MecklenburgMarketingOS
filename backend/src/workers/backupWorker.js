const { spawn } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { getSupabaseAdmin } = require('../lib/supabaseAdmin')
const { recordAdminLog } = require('../services/adminLogService')

function env(name, fallback = '') { return process.env[name] || fallback }
function safeName() { return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) }

async function run() {
  const dbUrl = env('SUPABASE_DB_URL') || env('DATABASE_URL')
  if (!dbUrl) throw new Error('SUPABASE_DB_URL oder DATABASE_URL fehlt.')
  const outDir = env('BACKUP_OUTPUT_DIR', '/tmp/mmos-backups')
  fs.mkdirSync(outDir, { recursive: true })
  const file = path.join(outDir, `mmos-${safeName()}.dump`)
  const args = ['--format=custom', '--no-owner', '--no-acl', `--file=${file}`, dbUrl]
  await new Promise((resolve, reject) => {
    const child = spawn('pg_dump', args, { stdio: ['ignore', 'inherit', 'inherit'] })
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`pg_dump exit ${code}`)))
    child.on('error', reject)
  })
  const buf = fs.readFileSync(file)
  const checksum = crypto.createHash('sha256').update(buf).digest('hex')
  const supabase = getSupabaseAdmin()
  const bucket = env('BACKUP_BUCKET', 'mmos-backups')
  let storage_path = null
  if (supabase && process.env.BACKUP_UPLOAD_TO_SUPABASE !== 'false') {
    storage_path = `database/${path.basename(file)}`
    const { error } = await supabase.storage.from(bucket).upload(storage_path, buf, { contentType: 'application/octet-stream', upsert: true })
    if (error) throw error
    await supabase.from('backup_runs').insert({ status: 'success', backup_type: 'database', storage_bucket: bucket, storage_path, size_bytes: buf.length, checksum_sha256: checksum, metadata: { source: 'backupWorker' } })
  }
  await recordAdminLog(supabase, { event_type: 'backup_success', severity: 'info', message: 'Datenbank-Backup erfolgreich erstellt.', metadata: { file, bucket, storage_path, size_bytes: buf.length, checksum_sha256: checksum } })
  console.log(JSON.stringify({ ok: true, file, bucket, storage_path, size_bytes: buf.length, checksum_sha256: checksum }, null, 2))
}

run().catch(async (error) => {
  const supabase = getSupabaseAdmin()
  await recordAdminLog(supabase, { event_type: 'backup_failed', severity: 'error', message: error.message, metadata: { source: 'backupWorker' } })
  console.error(error)
  process.exit(1)
})
