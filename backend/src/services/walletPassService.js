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

module.exports = { buildGoogleWalletPass, buildApplePassJson }
