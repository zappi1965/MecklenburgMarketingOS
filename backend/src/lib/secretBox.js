// Symmetrische Verschluesselung fuer sensible Felder (z. B. WordPress
// Application Passwords), AES-256-GCM. Schluessel aus SEO_SECRET_KEY
// (Fallback APP_ENCRYPTION_KEY), via SHA-256 auf 32 Byte normalisiert.
//
// Verhalten ohne Schluessel (Dev/CI): Werte werden NICHT verschluesselt,
// sondern unveraendert zurueckgegeben. decrypt() erkennt am Praefix
// "enc:v1:", ob ein Wert verschluesselt ist – Klartext-Altwerte bleiben
// lesbar. Auf API-Ebene wird das Klartext-Geheimnis trotzdem nie
// zurueckgegeben (Masking im Schedule-GET).

const crypto = require('crypto')

const PREFIX = 'enc:v1:'

function key() {
  const raw = process.env.SEO_SECRET_KEY || process.env.APP_ENCRYPTION_KEY || ''
  if (!raw) return null
  return crypto.createHash('sha256').update(String(raw)).digest()
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

function encrypt(plain) {
  if (plain == null || plain === '') return plain
  const k = key()
  if (!k) return String(plain) // kein Schluessel -> Klartext (Dev)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', k, iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

function decrypt(value) {
  if (!isEncrypted(value)) return value // Klartext oder leer
  const k = key()
  if (!k) return '' // verschluesselt, aber kein Schluessel -> nicht lesbar
  try {
    const parts = value.slice(PREFIX.length).split(':')
    const iv = Buffer.from(parts[0], 'base64')
    const tag = Buffer.from(parts[1], 'base64')
    const data = Buffer.from(parts[2], 'base64')
    const d = crypto.createDecipheriv('aes-256-gcm', k, iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(data), d.final()]).toString('utf8')
  } catch (_) {
    return ''
  }
}

module.exports = { encrypt, decrypt, isEncrypted, _hasKey: () => !!key() }
