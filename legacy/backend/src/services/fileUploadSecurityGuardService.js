const DEFAULT_ALLOWED = [
  'application/pdf','image/png','image/jpeg','image/webp','text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

const BLOCKED_EXTENSIONS = ['.exe','.js','.mjs','.sh','.bat','.cmd','.ps1','.php','.jar','.scr','.msi','.com']

function ext(name = '') {
  const m = String(name).toLowerCase().match(/\.[a-z0-9]+$/)
  return m ? m[0] : ''
}

function inspectFileUpload({ filename = '', mime_type = '', size_bytes = 0, customer_id = null, allowed_mime_types = DEFAULT_ALLOWED, max_size_mb = 20 } = {}) {
  const issues = []
  const e = ext(filename)
  if (!customer_id) issues.push({ severity: 'critical', issue: 'missing_customer_id' })
  if (!filename) issues.push({ severity: 'critical', issue: 'missing_filename' })
  if (BLOCKED_EXTENSIONS.includes(e)) issues.push({ severity: 'critical', issue: 'blocked_extension', extension: e })
  if (mime_type && !allowed_mime_types.includes(mime_type)) issues.push({ severity: 'warning', issue: 'mime_not_explicitly_allowed', mime_type })
  if (Number(size_bytes || 0) > Number(max_size_mb || 20) * 1024 * 1024) issues.push({ severity: 'critical', issue: 'file_too_large', size_bytes, max_size_mb })
  return { ok: !issues.some((x) => x.severity === 'critical'), issues, policy: { allowed_mime_types, max_size_mb, blocked_extensions: BLOCKED_EXTENSIONS } }
}

function inspectUploadConfig() {
  return { ok: true, default_allowed_mime_types: DEFAULT_ALLOWED, blocked_extensions: BLOCKED_EXTENSIONS, max_size_mb: Number(process.env.FILE_UPLOAD_MAX_MB || 20) }
}

module.exports = { inspectFileUpload, inspectUploadConfig, DEFAULT_ALLOWED, BLOCKED_EXTENSIONS }
