const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'set-cookie',
  'staff_code',
  'invite_token',
  'reset_token'
])

function redact(value, depth = 0) {
  if (depth > 6 || value == null) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(String(k).toLowerCase())) {
        out[k] = '[REDACTED]'
      } else {
        out[k] = redact(v, depth + 1)
      }
    }
    return out
  }
  return value
}

module.exports = { redact, SENSITIVE_KEYS }
