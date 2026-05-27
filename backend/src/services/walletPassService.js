// Wallet-Pass-Service: erzeugt Google-Wallet- und Apple-Wallet-Objekte
// fuer Loyalty-Karten.
//
// Google Wallet:
//   Wir bauen das Loyalty-Object als JSON nach dem Wallet Objects API
//   Schema. Der Save-Link wird als signiertes JWT generiert. Das Signing
//   benoetigt ein Google-Service-Account-Private-Key (env
//   GOOGLE_WALLET_SERVICE_ACCOUNT_JSON). Ohne diesen Key liefert die
//   Funktion einen unsignierten Probe-Link zurueck (fuer Tests/Setup).
//
// Apple Wallet:
//   Apple .pkpass-Files muessen mit einem Apple-Developer-Zertifikat
//   signiert werden. Die Signing-Komplexitaet ist im Backend nicht
//   sinnvoll abbildbar ohne dass das Zertifikat hinterlegt wird. Wir
//   erzeugen daher nur die pass.json-Struktur und ueberlassen das
//   Signing einem separaten Build-Step (z.B. github.com/walletpass/pass-js).
//
// Diese Implementierung liefert das Datenmodell + JSON; die produktive
// Signierung ist ein Folge-Sprint (echte Zertifikate, Apple Developer
// Account, Google Cloud Setup).

const crypto = require('crypto')

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

// Baut das Google-Wallet-Loyalty-Object und einen Save-Link.
function buildGoogleWalletPass({ member, customer, program }) {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID || 'dev-issuer'
  const classSuffix = process.env.GOOGLE_WALLET_CLASS_SUFFIX || 'mmos-loyalty'
  const classId = `${issuerId}.${classSuffix}`
  const objectId = `${classId}-${(member?.id || member?.email || crypto.randomUUID()).toString().replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 50)}`

  const loyaltyObject = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    accountId: String(member?.id || member?.email || 'guest'),
    accountName: member?.display_name || member?.email || 'Mitglied',
    loyaltyPoints: {
      label: 'Punkte',
      balance: { string: String(member?.points_balance ?? 0) }
    },
    barcode: member?.id
      ? { type: 'QR_CODE', value: String(member.id), alternateText: String(member.id).slice(0, 12) }
      : undefined,
    hexBackgroundColor: customer?.brand_secondary || '#111827',
    heroImage: customer?.brand_hero_url
      ? { sourceUri: { uri: customer.brand_hero_url } }
      : undefined,
    textModulesData: [
      { header: 'Programm', body: program?.name || 'Bonusclub' },
      { header: 'Anbieter', body: customer?.name || 'Mecklenburg Marketing' }
    ]
  }

  // Save-Link als JWT.
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || 'dev@example.com',
    aud: 'google',
    iat: nowSeconds(),
    typ: 'savetowallet',
    payload: { loyaltyObjects: [loyaltyObject] },
    origins: process.env.GOOGLE_WALLET_ORIGINS
      ? String(process.env.GOOGLE_WALLET_ORIGINS).split(',').map((s) => s.trim()).filter(Boolean)
      : []
  }

  const headerEnc = base64url(JSON.stringify(header))
  const payloadEnc = base64url(JSON.stringify(payload))
  const signingInput = `${headerEnc}.${payloadEnc}`

  let signature = ''
  let signed = false
  const pem = process.env.GOOGLE_WALLET_PRIVATE_KEY
  if (pem) {
    try {
      const sig = crypto.createSign('RSA-SHA256').update(signingInput).sign(pem.replace(/\\n/g, '\n'))
      signature = sig.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
      signed = true
    } catch (_) {
      // Signing-Fehler -> liefere unsignierten Probe-Link
    }
  }

  const jwt = signed ? `${signingInput}.${signature}` : signingInput
  return {
    saveUrl: `https://pay.google.com/gp/v/save/${jwt}`,
    signed,
    loyaltyObject
  }
}

// Baut das Apple-Wallet pass.json-Objekt.
function buildApplePassJson({ member, customer, program }) {
  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_ID || 'pass.de.mmos.loyalty',
    teamIdentifier: process.env.APPLE_WALLET_TEAM_ID || 'TEAMID0000',
    organizationName: customer?.name || 'Mecklenburg Marketing',
    serialNumber: String(member?.id || crypto.randomUUID()),
    description: `${program?.name || 'Bonusclub'} Karte`,
    foregroundColor: 'rgb(248,250,252)',
    backgroundColor: customer?.brand_secondary || 'rgb(17,24,39)',
    labelColor: customer?.brand_primary || 'rgb(212,175,55)',
    barcodes: member?.id
      ? [{ format: 'PKBarcodeFormatQR', message: String(member.id), messageEncoding: 'iso-8859-1' }]
      : [],
    storeCard: {
      primaryFields: [{ key: 'balance', label: 'Punkte', value: Number(member?.points_balance ?? 0) }],
      secondaryFields: [
        { key: 'tier', label: 'Level', value: String(member?.tier || 'Basic') },
        { key: 'name', label: 'Name', value: String(member?.display_name || member?.email || 'Mitglied') }
      ],
      backFields: [
        { key: 'brand', label: 'Anbieter', value: customer?.name || 'Mecklenburg Marketing' },
        { key: 'support', label: 'Support', value: customer?.email || 'support@example.com' }
      ]
    }
  }
}

// Apple .pkpass-Bundle bauen.
//
// Nur aktiv, wenn alle drei Zert-ENVs gesetzt sind:
//   APPLE_WALLET_CERT_PEM, APPLE_WALLET_KEY_PEM, APPLE_WALLET_WWDR_PEM
// Optional: APPLE_WALLET_KEY_PASSPHRASE.
//
// Liefert einen Buffer mit dem signierten .pkpass-ZIP — direkt streambar.
// Im Mock-Modus (keine Certs) wirft die Funktion einen 'apple_certs_missing'
// Error, damit der Route-Layer eine klare Fehlermeldung zurueckgeben kann.
async function buildApplePkpass({ member, customer, program }) {
  const certPem = process.env.APPLE_WALLET_CERT_PEM
  const keyPem = process.env.APPLE_WALLET_KEY_PEM
  const wwdrPem = process.env.APPLE_WALLET_WWDR_PEM
  if (!certPem || !keyPem || !wwdrPem) {
    const err = new Error('apple_certs_missing')
    err.code = 'APPLE_CERTS_MISSING'
    err.hint = 'APPLE_WALLET_CERT_PEM / _KEY_PEM / _WWDR_PEM in ENV setzen — siehe docs/WALLET_PASS_SETUP.md'
    throw err
  }

  // Lazy require: passkit-generator nur laden, wenn wirklich signiert wird.
  const { PKPass } = require('passkit-generator')

  const passJson = buildApplePassJson({ member, customer, program })
  // passkit-generator erwartet die Felder als getrennte Properties statt im
  // pass.json — wir uebersetzen sie.

  // Minimal-Icons als 1x1-Pixel-Fallback, falls keine echten Icons im Repo
  // liegen. Produktion: ueber docs/WALLET_PASS_SETUP.md echte Icons in
  // backend/src/assets/wallet/ ablegen.
  const tinyPng = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
    'hex'
  )

  let buffers
  try {
    const path = require('path')
    const fs = require('fs')
    const assetsDir = path.join(__dirname, '../assets/wallet')
    const fromAssets = {}
    for (const name of ['icon.png', 'icon@2x.png', 'logo.png', 'logo@2x.png']) {
      const p = path.join(assetsDir, name)
      if (fs.existsSync(p)) fromAssets[name] = fs.readFileSync(p)
    }
    buffers = {
      'icon.png': fromAssets['icon.png'] || tinyPng,
      'icon@2x.png': fromAssets['icon@2x.png'] || tinyPng,
      'logo.png': fromAssets['logo.png'] || tinyPng,
      'logo@2x.png': fromAssets['logo@2x.png'] || tinyPng
    }
  } catch (_) {
    buffers = {
      'icon.png': tinyPng,
      'icon@2x.png': tinyPng,
      'logo.png': tinyPng,
      'logo@2x.png': tinyPng
    }
  }

  const pass = new PKPass(
    {
      'pass.json': Buffer.from(JSON.stringify(passJson), 'utf-8'),
      ...buffers
    },
    {
      wwdr: wwdrPem.replace(/\\n/g, '\n'),
      signerCert: certPem.replace(/\\n/g, '\n'),
      signerKey: keyPem.replace(/\\n/g, '\n'),
      signerKeyPassphrase: process.env.APPLE_WALLET_KEY_PASSPHRASE || undefined
    }
  )

  return pass.getAsBuffer()
}

function applePkpassConfigured() {
  return Boolean(
    process.env.APPLE_WALLET_CERT_PEM &&
    process.env.APPLE_WALLET_KEY_PEM &&
    process.env.APPLE_WALLET_WWDR_PEM
  )
}

module.exports = {
  buildGoogleWalletPass,
  buildApplePassJson,
  buildApplePkpass,
  applePkpassConfigured
}
