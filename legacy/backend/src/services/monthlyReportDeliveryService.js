const GotenbergService = require('./gotenbergService')
const DocumentMediaService = require('./documentMediaService')
const MailService = require('./mailService')
const { generateMonthlyCustomerReport } = require('./monthlyReportGeneratorService')

function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
}

function safeFilename(value = 'monatsreport') {
  return String(value || 'monatsreport')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9äöüß_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'monatsreport'
}

function reportHtml(report = {}) {
  const metrics = report.metrics || {}
  const recs = report.recommendations || []
  const rows = Object.entries(metrics).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"/>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#172033;margin:0;padding:28px;background:#f6f7fb}
    .wrap{max-width:820px;margin:0 auto;background:#fff;border:1px solid #e5e9f3;border-radius:22px;padding:28px}
    h1{font-size:30px;margin:0 0 8px}.muted{color:#667085}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:22px 0}
    .card{border:1px solid #e5e9f3;border-radius:16px;padding:16px;background:#fbfcff}.metric{font-size:26px;font-weight:800;color:#0b1020}
    table{width:100%;border-collapse:collapse;margin-top:14px}td{border-bottom:1px solid #eef1f6;padding:10px 6px}
    ul{line-height:1.7}.brand{letter-spacing:.08em;text-transform:uppercase;color:#d4af37;font-weight:700;font-size:12px}
  </style></head><body><div class="wrap">
    <div class="brand">Mecklenburg Marketing OS</div>
    <h1>Monatsreport ${esc(report.month)}</h1>
    <p class="muted">${esc(report.customer_name || report.customer_id)} · erzeugt am ${esc(String(report.generated_at || '').slice(0,10))}</p>
    <div class="grid">
      <div class="card"><div class="muted">Bewertungen</div><div class="metric">${esc(metrics.review_count ?? 0)}</div></div>
      <div class="card"><div class="muted">Ø Bewertung</div><div class="metric">${esc(metrics.avg_rating ?? '—')}</div></div>
      <div class="card"><div class="muted">Leads</div><div class="metric">${esc(metrics.leads ?? 0)}</div></div>
      <div class="card"><div class="muted">Punkte gesammelt</div><div class="metric">${esc(metrics.points_earned ?? 0)}</div></div>
    </div>
    <h2>Kennzahlen</h2><table>${rows}</table>
    <h2>Empfehlungen</h2><ul>${recs.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    <p class="muted">Dieser Report wurde automatisch als Entwurf durch MMOS erstellt.</p>
  </div></body></html>`
}

async function createMonthlyReportPdf(supabase, { customer_id, month = null, save = true, actor_name = 'MMOS' } = {}) {
  const generated = await generateMonthlyCustomerReport(supabase, { customer_id, month, save })
  if (!generated.ok) return generated
  const report = generated.report
  const html = reportHtml(report)
  const filename = `${safeFilename(`Monatsreport_${report.customer_name}_${report.month}`)}.pdf`
  const gotenberg = new GotenbergService(supabase)
  const media = new DocumentMediaService(supabase)
  const pdf = await gotenberg.convertHtmlToPdf(html, filename)
  if (pdf?.dryRun) return { ok: false, code: 'PDF_NOT_CONFIGURED', error: pdf.note, report, html }
  const stored = await media.storePdf({
    customer_id,
    pdfBuffer: pdf,
    filename,
    title: `Monatsreport ${report.month}`,
    document_type: 'monthly_report',
    source_table: report.saved?.row?.id ? 'monthly_reports' : 'monthly_report_generator',
    source_id: report.saved?.row?.id || null,
    visibility: 'customer',
    actor_name
  })
  return { ok: true, report, pdf: { filename, size_bytes: pdf.length, base64: pdf.toString('base64') }, document: stored }
}

async function sendMonthlyReportPdf(supabase, { customer_id, month = null, to = null, actor_name = 'MMOS', requireDelivery = true } = {}) {
  const created = await createMonthlyReportPdf(supabase, { customer_id, month, save: true, actor_name })
  if (!created.ok) return created
  let recipient = to
  if (!recipient) {
    try {
      const customer = await supabase.from('customers').select('email, contact_email, metadata').eq('id', customer_id).maybeSingle()
      recipient = customer?.data?.email || customer?.data?.contact_email || customer?.data?.metadata?.email || null
    } catch (_) {}
  }
  if (!recipient) return { ok: false, error: 'Empfänger für Report-Mail fehlt.', created }
  const mail = new MailService()
  const subject = `Monatsreport ${created.report.month} · ${created.report.customer_name}`
  const text = `Hallo,\n\nanbei der Monatsreport ${created.report.month} als PDF.\n\nViele Grüße\nMecklenburg Marketing`
  const html = `<p>Hallo,</p><p>anbei der Monatsreport <b>${esc(created.report.month)}</b> als PDF.</p><p>Viele Grüße<br/>Mecklenburg Marketing</p>`
  try {
    const result = await mail.send({
      to: recipient,
      subject,
      text,
      html,
      requireDelivery,
      attachments: [{ filename: created.pdf.filename, content: created.pdf.base64, content_type: 'application/pdf' }]
    })
    try {
      await supabase.from('mail_events').insert({
        customer_id,
        recipient,
        subject,
        template_key: 'monthly_report_pdf',
        provider: result.provider || (result.dryRun ? 'dry_run' : 'resend'),
        status: result.sent ? 'sent' : result.dryRun ? 'dry_run' : 'created',
        metadata: { result, document: created.document },
        created_at: new Date().toISOString()
      })
    } catch (_) {}
    return { ok: true, created, mail: result }
  } catch (error) {
    return { ok: false, error: error.message, created }
  }
}

module.exports = { reportHtml, createMonthlyReportPdf, sendMonthlyReportPdf }
