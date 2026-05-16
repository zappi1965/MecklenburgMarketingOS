
const QRCode = require('qrcode')

function slugify(input) {
  return String(input || 'demo-kampagne')
    .toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0, 70)
}

async function createQrPayload({ name, customer_name, redirect_url }) {
  const baseUrl = process.env.PUBLIC_APP_URL || process.env.APP_PUBLIC_URL || 'https://mecklenburgmarketing.de'
  const slug = `${slugify(customer_name)}-${slugify(name)}-${Date.now().toString(36)}`
  const public_url = `${baseUrl.replace(/\/$/, '')}/r/${slug}`
  const qr_svg = await QRCode.toString(public_url, { type: 'svg', margin: 1, width: 512 })
  const qr_data_url = await QRCode.toDataURL(public_url, { margin: 1, width: 512 })
  return {
    slug,
    public_url,
    redirect_url: redirect_url || public_url,
    qr_svg,
    qr_png_base64: qr_data_url
  }
}

module.exports = { createQrPayload, slugify }
