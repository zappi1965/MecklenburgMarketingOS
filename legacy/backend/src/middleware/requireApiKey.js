// Middleware fuer Public-API-Endpunkte.
// Erwartet einen API-Key im Header "X-API-Key" oder "Authorization: ApiKey ...".
// Bei Erfolg werden req.apiKey, req.customer_id, req.apiScopes gesetzt.

const { resolveKey, hasScope } = require('../services/apiKeyService')

function extractKey(req) {
  const headerKey = req.get('x-api-key')
  if (headerKey) return headerKey.trim()
  const auth = req.get('authorization') || ''
  const m = auth.match(/^ApiKey\s+(.+)$/i)
  return m ? m[1].trim() : null
}

function requireApiKey(requiredScope) {
  return async function (req, res, next) {
    try {
      const fullKey = extractKey(req)
      if (!fullKey) {
        return res.status(401).json({ ok: false, code: 'API_KEY_MISSING', error: 'X-API-Key Header fehlt' })
      }
      const resolved = await resolveKey(fullKey)
      if (!resolved) {
        return res.status(401).json({ ok: false, code: 'API_KEY_INVALID', error: 'API-Key ist ungueltig oder widerrufen' })
      }
      if (requiredScope && !hasScope(resolved.scopes, requiredScope)) {
        return res.status(403).json({ ok: false, code: 'API_SCOPE_MISSING', error: `Scope ${requiredScope} erforderlich` })
      }
      req.apiKey = resolved
      req.customer_id = resolved.customer_id
      req.apiScopes = resolved.scopes
      next()
    } catch (e) { next(e) }
  }
}

module.exports = requireApiKey
