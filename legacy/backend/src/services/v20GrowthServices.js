
const QRCode = require('qrcode')
const crypto = require('crypto')

function slugify(input) {
  return String(input || 'item')
    .toLowerCase()
    .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)
}

function token(prefix='m') {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`
}

function hash(value) {
  return value ? crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex') : null
}

async function createLoyaltyQr({ program_slug }) {
  const base = process.env.PUBLIC_APP_URL || process.env.APP_PUBLIC_URL || 'https://mecklenburgmarketing.de'
  const public_url = `${base.replace(/\/$/,'')}/l/${program_slug}`
  return {
    public_url,
    qr_svg: await QRCode.toString(public_url, { type:'svg', width:512, margin:1 }),
    qr_png_base64: await QRCode.toDataURL(public_url, { width:512, margin:1 })
  }
}

function generateInsights({ revenue=0, qrScans=0, conversions=0, avgRating=0, openTickets=0, leads=0 }) {
  const insights = []
  if (qrScans > 0 && conversions / qrScans < 0.05) insights.push({ insight_type:'qr_conversion', title:'QR-Kampagne mit niedriger Conversion', summary:`${qrScans} Scans, aber nur ${conversions} Conversions.`, recommendation:'Landingpage, Call-to-Action und Reward prüfen.', severity:'warning', source_module:'qr_campaigns', score: Math.round((conversions / qrScans) * 100) })
  if (avgRating && avgRating < 4.2) insights.push({ insight_type:'review_risk', title:'Bewertungsrisiko erkannt', summary:`Die durchschnittliche Bewertung liegt bei ${avgRating}.`, recommendation:'Negative Feedbacks intern auswerten und Review Funnel aktivieren.', severity:'warning', source_module:'reviews', score: avgRating })
  if (revenue > 0 && leads > 0) insights.push({ insight_type:'sales_opportunity', title:'Umsatz- und Leadpotenzial vorhanden', summary:`${leads} Leads und ${revenue.toFixed(2)} EUR Umsatz erkannt.`, recommendation:'Pipeline priorisieren und Follow-ups automatisieren.', severity:'success', source_module:'pipeline', score: revenue })
  if (openTickets >= 3) insights.push({ insight_type:'client_success', title:'Viele offene Tickets', summary:`Aktuell sind ${openTickets} Tickets offen.`, recommendation:'Kundenstatus prüfen und priorisierte Bearbeitung starten.', severity:'warning', source_module:'tickets', score: openTickets })
  if (!insights.length) insights.push({ insight_type:'general', title:'Keine kritischen Auffälligkeiten', summary:'Die wichtigsten Kennzahlen wirken aktuell stabil.', recommendation:'Regelmäßig QR-, Review- und Umsatzdaten prüfen.', severity:'info', source_module:'analytics', score:100 })
  return insights
}

function summarizeTranscript(transcript='') {
  const clean = String(transcript || '').trim()
  const lower = clean.toLowerCase()
  const action_items = []
  if (lower.includes('angebot')) action_items.push('Angebot vorbereiten oder nachfassen')
  if (lower.includes('rechnung')) action_items.push('Rechnung prüfen oder erstellen')
  if (lower.includes('termin')) action_items.push('Termin im Booking prüfen')
  if (lower.includes('premium')) action_items.push('Premium-Paket als Upsell prüfen')
  if (lower.includes('seo')) action_items.push('SEO-KPIs prüfen')
  const tags = []
  if (lower.includes('angebot')) tags.push('angebot')
  if (lower.includes('rechnung')) tags.push('rechnung')
  if (lower.includes('premium')) tags.push('premium')
  if (lower.includes('seo')) tags.push('seo')
  return { summary: clean ? clean.slice(0,220) + (clean.length > 220 ? '...' : '') : 'Keine Transkription vorhanden.', action_items, tags }
}

module.exports = { slugify, token, hash, createLoyaltyQr, generateInsights, summarizeTranscript }
