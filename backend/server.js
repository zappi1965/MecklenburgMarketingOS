
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const multer = require('multer')
const PDFDocument = require('pdfkit')
const { createClient } = require('@supabase/supabase-js')

const app = express()
app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(rateLimit({ windowMs: 60 * 1000, max: 240 }))

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 18 * 1024 * 1024 } })

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET
const WORKERS_ENABLED = String(process.env.WORKERS_ENABLED || 'true') === 'true'

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY) : null

function requireSupabase(res) {
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlt' })
    return false
  }
  return true
}

async function audit({ user_id = null, customer_id = null, action, entity = null, entity_id = null, before_data = null, after_data = null }) {
  if (!supabaseAdmin) return
  await supabaseAdmin.from('audit_logs').insert({ user_id, customer_id, action, entity, entity_id, before_data, after_data })
}

async function notify(customer_id, title, message, type = 'info', target_view = null) {
  if (!supabaseAdmin) return
  await supabaseAdmin.from('notifications').insert({ customer_id, title, message, type, priority: 'Normal', target_view })
}

async function timeline(customer_id, title, description, event_type = 'event', entity = null, entity_id = null) {
  if (!supabaseAdmin) return
  await supabaseAdmin.from('activity_logs').insert({ customer_id, title, description, event_type, entity, entity_id })
}

function makePdfBuffer({ title, subtitle, rows = [], footer = 'Mecklenburg Marketing OS' }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(22).text(title, { align: 'left' })
    doc.moveDown(0.4)
    if (subtitle) doc.fontSize(11).fillColor('#666').text(subtitle)
    doc.fillColor('#111')
    doc.moveDown(1.2)

    rows.forEach(row => {
      if (row.type === 'heading') {
        doc.moveDown(0.6).fontSize(15).fillColor('#111').text(row.label)
      } else {
        doc.fontSize(11).fillColor('#333').text(`${row.label}: ${row.value ?? '-'}`)
      }
      doc.moveDown(0.25)
    })

    doc.moveDown(2)
    doc.fontSize(9).fillColor('#777').text(footer, { align: 'center' })
    doc.end()
  })
}

async function uploadBuffer(bucket, path, buffer, contentType = 'application/pdf') {
  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true
  })
  if (error) throw error
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

async function createPdfAndStore({ bucket, path, title, subtitle, rows, customer_id, entity, entity_id, targetTable, urlColumn = 'file_url' }) {
  const buffer = await makePdfBuffer({ title, subtitle, rows })
  const publicUrl = await uploadBuffer(bucket, path, buffer)
  if (targetTable && entity_id) {
    await supabaseAdmin.from(targetTable).update({ [urlColumn]: publicUrl }).eq('id', entity_id)
  }
  await timeline(customer_id, `${title} erzeugt`, `PDF wurde erzeugt und gespeichert.`, 'pdf', entity, entity_id)
  await notify(customer_id, `${title} bereit`, 'Ein neues PDF steht im Kundenportal zum Download bereit.', 'pdf', entity)
  return { publicUrl, buffer }
}

app.get('/', (_, res) => res.json({ ok: true, name: 'MMOS v10.1 Enterprise Fullstack Backend' }))
app.get('/api/health', (_, res) => res.json({ ok: true, service: 'MMOS v10.1 Enterprise Fullstack Backend' }))

// ---------------- Bootstrap / Onboarding ----------------

app.post('/api/bootstrap/admin', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { bootstrap_secret, email, password, full_name = 'Admin Demo' } = req.body
    if (bootstrap_secret !== BOOTSTRAP_SECRET) return res.status(401).json({ error: 'Invalid bootstrap secret' })
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error && !String(error.message).includes('already')) throw error
    let userId = data?.user?.id
    if (!userId) {
      const users = await supabaseAdmin.auth.admin.listUsers()
      userId = users.data.users.find(u => u.email === email)?.id
    }
    await supabaseAdmin.from('profiles').upsert({ id: userId, email, full_name, role: 'admin' }, { onConflict: 'id' })
    await audit({ user_id: userId, action: 'bootstrap_admin', entity: 'profiles', entity_id: userId })
    res.json({ ok: true, user_id: userId })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/bootstrap/test-users', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { bootstrap_secret } = req.body
    if (bootstrap_secret !== BOOTSTRAP_SECRET) return res.status(401).json({ error: 'Invalid bootstrap secret' })

    async function user(email, password, full_name, role) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })
      if (error && !String(error.message).includes('already')) throw error
      let id = data?.user?.id
      if (!id) {
        const users = await supabaseAdmin.auth.admin.listUsers()
        id = users.data.users.find(u => u.email === email)?.id
      }
      await supabaseAdmin.from('profiles').upsert({ id, email, full_name, role }, { onConflict: 'id' })
      return { email, password, user_id: id }
    }

    const { data: customer, error: ce } = await supabaseAdmin.from('customers').upsert({
      name: 'Demo Friseur Rostock',
      branch: 'Friseur',
      contact_name: 'Max Mustermann',
      email: 'kunde.demo@agentur.local',
      phone: '0381 123456',
      status: 'Aktiv',
      lifecycle_status: 'Aktivkunde',
      rating: 4.8,
      revenue: 0
    }, { onConflict: 'email' }).select().single()
    if (ce) throw ce

    const admin = await user('admin@agentur.local', 'AdminDemo123!', 'Admin Demo', 'admin')
    const support = await user('support@agentur.local', 'SupportDemo123!', 'Support Demo', 'support')
    const seo = await user('seo@agentur.local', 'SeoDemo123!', 'SEO Demo', 'seo_manager')
    const sales = await user('sales@agentur.local', 'SalesDemo123!', 'Sales Demo', 'sales')
    const finance = await user('buchhaltung@agentur.local', 'FinanceDemo123!', 'Buchhaltung Demo', 'buchhaltung')
    const kunde = await user('kunde.demo@agentur.local', 'KundeDemo123!', 'Demo Kunde', 'customer')

    await supabaseAdmin.from('user_customer_access').upsert({ user_id: kunde.user_id, customer_id: customer.id }, { onConflict: 'user_id,customer_id' })

    const tools = ['seo', 'booking', 'tickets', 'invoices', 'integrations', 'templates', 'reviews', 'qr', 'reports', 'goals', 'multi_locations']
    await supabaseAdmin.from('customer_tool_access').upsert(
      tools.map(tool_key => ({ customer_id: customer.id, tool_key, enabled: true, source_package: 'Demo' })),
      { onConflict: 'customer_id,tool_key' }
    )

    await supabaseAdmin.from('service_categories').upsert({ customer_id: customer.id, name: 'Haarschnitt', price: 35, duration_minutes: 60 })
    await notify(customer.id, 'Demo eingerichtet', 'Testkunden und Tools wurden eingerichtet.', 'bootstrap', 'customerDashboard')
    res.json({ ok: true, users: [admin, support, seo, sales, finance, kunde], customer })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/onboarding/register', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { business_name, branch, contact_name, email, phone, password, package_name = 'Starter' } = req.body
    if (!business_name || !email || !password) return res.status(400).json({ error: 'business_name, email und password erforderlich' })

    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })
    if (userError && !String(userError.message).includes('already')) throw userError

    let userId = created?.user?.id
    if (!userId) {
      const users = await supabaseAdmin.auth.admin.listUsers()
      userId = users.data.users.find(u => u.email === email)?.id
    }

    await supabaseAdmin.from('profiles').upsert({ id: userId, email, full_name: contact_name || business_name, phone, role: 'customer' }, { onConflict: 'id' })

    const { data: customer, error: cError } = await supabaseAdmin.from('customers').upsert({
      name: business_name, branch, contact_name, email, phone, status: 'Lead', lifecycle_status: 'Registriert', rating: 0, revenue: 0
    }, { onConflict: 'email' }).select().single()
    if (cError) throw cError

    await supabaseAdmin.from('user_customer_access').upsert({ user_id: userId, customer_id: customer.id }, { onConflict: 'user_id,customer_id' })
    await supabaseAdmin.from('package_requests').insert({
      customer_id: customer.id,
      package_name,
      status: 'Neu'
    })

    await timeline(customer.id, 'Neue Registrierung', `${business_name} hat sich registriert und ${package_name} angefragt.`, 'onboarding', 'package_requests')
    await notify(customer.id, 'Neue Registrierung', `${business_name} hat sich registriert.`, 'onboarding', 'crm')

    res.json({ ok: true, customer, user_id: userId })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/onboarding/approve-package', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { customer_id, package_name = 'Starter', contract_name = null, monthly_value = null } = req.body
    if (!customer_id) return res.status(400).json({ error: 'customer_id fehlt' })

    const toolMap = {
      Starter: ['reviews', 'qr', 'reports', 'tickets'],
      Growth: ['reviews', 'qr', 'reports', 'tickets', 'seo', 'booking', 'invoices'],
      Premium: ['reviews', 'qr', 'reports', 'tickets', 'seo', 'booking', 'invoices', 'integrations', 'templates', 'goals', 'multi_locations'],
      Individuell: []
    }
    const priceMap = { Starter: 199, Growth: 499, Premium: 899, Individuell: 0 }
    const tools = toolMap[package_name] || []

    if (tools.length) {
      await supabaseAdmin.from('customer_tool_access').upsert(
        tools.map(tool_key => ({ customer_id, tool_key, enabled: true, source_package: package_name })),
        { onConflict: 'customer_id,tool_key' }
      )
    }

    await supabaseAdmin.from('package_requests').update({ status: 'Freigeschaltet' }).eq('customer_id', customer_id).eq('package_name', package_name)
    await supabaseAdmin.from('customers').update({ status: 'Aktiv', lifecycle_status: 'Aktivkunde' }).eq('id', customer_id)

    const { data: contract } = await supabaseAdmin.from('contracts').insert({
      customer_id,
      contract_name: contract_name || `${package_name} Vertrag`,
      package_name,
      monthly_value: monthly_value ?? priceMap[package_name] ?? 0,
      status: 'Aktiv'
    }).select().single()

    if (contract) {
      await createPdfAndStore({
        bucket: 'contracts',
        path: `${customer_id}/${contract.id}.pdf`,
        title: 'Vertrag',
        subtitle: `${package_name} Paket`,
        rows: [
          { label: 'Paket', value: package_name },
          { label: 'Monatswert', value: `${monthly_value ?? priceMap[package_name] ?? 0} EUR` },
          { label: 'Status', value: 'Aktiv' }
        ],
        customer_id,
        entity: 'contracts',
        entity_id: contract.id,
        targetTable: 'contracts'
      })
    }

    await timeline(customer_id, 'Paket freigeschaltet', `${package_name} wurde freigeschaltet.`, 'tool_access', 'customer_tool_access')
    await notify(customer_id, 'Paket freigeschaltet', `Dein ${package_name} Paket ist jetzt aktiv.`, 'tool_access', 'customerDashboard')

    res.json({ ok: true, tools, contract })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ---------------- PDF ----------------

app.post('/api/pdf/invoice/:id', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const id = req.params.id
    const { data: invoice, error } = await supabaseAdmin.from('invoices').select('*, customers(*)').eq('id', id).single()
    if (error) throw error
    const result = await createPdfAndStore({
      bucket: 'invoices',
      path: `${invoice.customer_id}/${invoice.invoice_number}.pdf`,
      title: `Rechnung ${invoice.invoice_number}`,
      subtitle: invoice.customers?.name || '',
      rows: [
        { label: 'Kunde', value: invoice.customers?.name },
        { label: 'Leistung', value: invoice.service },
        { label: 'Betrag', value: `${invoice.amount} EUR` },
        { label: 'Status', value: invoice.status },
        { label: 'Fällig am', value: invoice.due_date }
      ],
      customer_id: invoice.customer_id,
      entity: 'invoices',
      entity_id: invoice.id,
      targetTable: 'invoices'
    })
    res.json({ ok: true, url: result.publicUrl })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/pdf/reminder/:id', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const id = req.params.id
    const { data: reminder, error } = await supabaseAdmin.from('reminders').select('*, invoices(*), customers(*)').eq('id', id).single()
    if (error) throw error
    const result = await createPdfAndStore({
      bucket: 'reminders',
      path: `${reminder.customer_id}/${reminder.reminder_number || reminder.id}.pdf`,
      title: reminder.level || 'Mahnung',
      subtitle: reminder.customers?.name || '',
      rows: [
        { label: 'Rechnung', value: reminder.invoices?.invoice_number },
        { label: 'Gebühr', value: `${reminder.fee} EUR` },
        { label: 'Status', value: reminder.status }
      ],
      customer_id: reminder.customer_id,
      entity: 'reminders',
      entity_id: reminder.id,
      targetTable: 'reminders'
    })
    res.json({ ok: true, url: result.publicUrl })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/pdf/report/:customer_id', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const customer_id = req.params.customer_id
    const { data: customer } = await supabaseAdmin.from('customers').select('*').eq('id', customer_id).single()
    const { data: seo } = await supabaseAdmin.from('seo_traffic').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(1)
    const latest = seo?.[0] || {}
    const buffer = await makePdfBuffer({
      title: 'KPI Report',
      subtitle: customer?.name || '',
      rows: [
        { type: 'heading', label: 'SEO' },
        { label: 'Traffic', value: latest.organic_traffic || 0 },
        { label: 'Impressionen', value: latest.impressions || 0 },
        { label: 'Klicks', value: latest.clicks || 0 },
        { label: 'CTR', value: `${latest.ctr || 0}%` },
        { label: 'Top 10 Keywords', value: latest.top10_keywords || 0 }
      ]
    })
    const url = await uploadBuffer('reports', `${customer_id}/kpi-report-${Date.now()}.pdf`, buffer)
    await supabaseAdmin.from('reports').insert({ customer_id, report_type: 'KPI', title: 'KPI Report', file_url: url })
    await timeline(customer_id, 'KPI Report erzeugt', 'Ein KPI PDF Report wurde erstellt.', 'report', 'reports')
    await notify(customer_id, 'KPI Report bereit', 'Der neue KPI Report kann heruntergeladen werden.', 'report', 'reports')
    res.json({ ok: true, url })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/download/:bucket/*', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const bucket = req.params.bucket
    const path = req.params[0]
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(path)
    if (error) throw error
    const buffer = Buffer.from(await data.arrayBuffer())
    res.setHeader('Content-Type', data.type || 'application/octet-stream')
    res.send(buffer)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ---------------- Uploads ----------------

app.post('/api/upload/:bucket', upload.single('file'), async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const bucket = req.params.bucket
    const { customer_id, entity = 'uploads', entity_id = null } = req.body
    if (!req.file) return res.status(400).json({ error: 'file fehlt' })
    if (!customer_id) return res.status(400).json({ error: 'customer_id fehlt' })
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_')
    const path = `${customer_id}/${Date.now()}-${safeName}`
    const url = await uploadBuffer(bucket, path, req.file.buffer, req.file.mimetype)
    await supabaseAdmin.from('file_uploads').insert({
      customer_id, entity, entity_id, bucket, path, file_name: req.file.originalname, file_url: url, mime_type: req.file.mimetype, size_bytes: req.file.size
    })
    await timeline(customer_id, 'Datei hochgeladen', `${req.file.originalname} wurde gespeichert.`, 'upload', entity, entity_id)
    await notify(customer_id, 'Neue Datei', `${req.file.originalname} wurde hochgeladen.`, 'upload', entity)
    res.json({ ok: true, url, path })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ---------------- RBAC / Permissions ----------------

app.get('/api/permissions/:user_id', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { data, error } = await supabaseAdmin.from('role_permissions').select('*').eq('user_id', req.params.user_id)
    if (error) throw error
    res.json({ ok: true, permissions: data || [] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/permissions/set', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { user_id, role_key, module_key, can_view = true, can_edit = false, can_delete = false } = req.body
    if (!user_id || !module_key) return res.status(400).json({ error: 'user_id und module_key erforderlich' })
    const { data, error } = await supabaseAdmin.from('role_permissions').upsert({
      user_id, role_key, module_key, can_view, can_edit, can_delete
    }, { onConflict: 'user_id,module_key' }).select().single()
    if (error) throw error
    await audit({ user_id, action: 'permission_set', entity: 'role_permissions', entity_id: data.id, after_data: data })
    res.json({ ok: true, permission: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ---------------- AI / Demo Sync ----------------

app.post('/api/ai/review-reply', async (req, res) => {
  try {
    const { review_text = '', rating = 3, tone = 'professionell' } = req.body
    const bad = ['idiot', 'scheiße', 'arsch', 'dreck', 'abzocke', 'betrug'].some(w => review_text.toLowerCase().includes(w))
    const reply = bad
      ? 'Vielen Dank für Ihr Feedback. Wir möchten sachlich bleiben und den Vorgang gerne intern prüfen. Bitte kontaktieren Sie uns direkt, damit wir eine Lösung finden.'
      : Number(rating) >= 4
        ? 'Vielen Dank für die tolle Bewertung! Wir freuen uns sehr, dass Sie zufrieden waren und geben das Lob gerne ans Team weiter.'
        : 'Vielen Dank für Ihr ehrliches Feedback. Wir nehmen Ihre Hinweise ernst und möchten uns weiter verbessern.'
    res.json({ ok: true, reply, bad_words_detected: bad, tone })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/ai/business-insights/:customer_id', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const customer_id = req.params.customer_id
    const { data: invoices } = await supabaseAdmin.from('invoices').select('*').eq('customer_id', customer_id)
    const { data: tickets } = await supabaseAdmin.from('tickets').select('*').eq('customer_id', customer_id)
    const { data: seo } = await supabaseAdmin.from('seo_traffic').select('*').eq('customer_id', customer_id).order('created_at', { ascending: false }).limit(2)

    const insights = []
    const openInvoices = (invoices || []).filter(i => i.status !== 'Bezahlt').length
    const openTickets = (tickets || []).filter(t => t.status !== 'erledigt').length
    if (openInvoices > 0) insights.push(['Offene Rechnungen', `Es gibt ${openInvoices} offene Rechnung(en).`, 'Warnung'])
    if (openTickets > 2) insights.push(['Viele offene Tickets', `Es gibt ${openTickets} offene Ticket(s).`, 'Risiko'])
    if (seo?.length >= 2 && Number(seo[0].organic_traffic) < Number(seo[1].organic_traffic)) insights.push(['SEO Traffic fällt', 'Der organische Traffic ist im Vergleich zum vorherigen Wert gesunken.', 'Warnung'])
    if (!insights.length) insights.push(['Stabiler Kunde', 'Keine kritischen Auffälligkeiten erkannt.', 'Info'])

    const rows = []
    for (const [title, insight_text, severity] of insights) {
      const { data } = await supabaseAdmin.from('ai_business_insights').insert({ customer_id, title, insight_text, severity, status: 'Neu' }).select().single()
      rows.push(data)
    }
    await notify(customer_id, 'AI Business Insights aktualisiert', 'Neue Insights wurden erzeugt.', 'ai', 'insights')
    res.json({ ok: true, insights: rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/google-business/mock-sync', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { customer_id } = req.body
    if (!customer_id) return res.status(400).json({ error: 'customer_id fehlt' })
    await supabaseAdmin.from('seo_traffic').insert({ customer_id, month: 'Google Sync', organic_traffic: 820, impressions: 15400, clicks: 690, ctr: 4.48, avg_position: 8.4, top10_keywords: 12, backlinks: 38, technical_score: 84, local_visibility: 76 })
    for (const k of [['friseur rostock', 3.1, 4200, 310], ['fade cut rostock', 2.4, 1300, 120], ['barber rostock', 5.8, 2800, 180]]) await supabaseAdmin.from('seo_keywords').insert({ customer_id, keyword: k[0], position: k[1], impressions: k[2], clicks: k[3] })
    await supabaseAdmin.from('integration_sync_logs').insert({ customer_id, platform: 'Google Business', status: 'success', message: 'Demo Daten synchronisiert.' })
    await notify(customer_id, 'Google Business Sync ausgeführt', 'Demo-Sync hat Keywords und SEO KPIs aktualisiert.', 'integration', 'seo')
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/integrations/demo-sync', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { customer_id, platform = 'Meta Ads' } = req.body
    if (!customer_id) return res.status(400).json({ error: 'customer_id fehlt' })
    await supabaseAdmin.from('integration_sync_logs').insert({ customer_id, platform, status: 'success', message: `${platform} Demo Sync ausgeführt.` })
    await notify(customer_id, `${platform} Sync`, `${platform} Demo-Sync wurde ausgeführt.`, 'integration', 'integrations')
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ---------------- Search / Locations / Automations ----------------

app.get('/api/search/global', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const qRaw = String(req.query.q || '').trim()
    if (!qRaw) return res.json({ ok: true, results: [] })
    const q = `%${qRaw}%`
    const [customers, invoices, tickets, offers, contracts] = await Promise.all([
      supabaseAdmin.from('customers').select('*').ilike('name', q).limit(10),
      supabaseAdmin.from('invoices').select('*,customers(*)').ilike('invoice_number', q).limit(10),
      supabaseAdmin.from('tickets').select('*,customers(*)').ilike('title', q).limit(10),
      supabaseAdmin.from('offers').select('*,customers(*)').ilike('title', q).limit(10),
      supabaseAdmin.from('contracts').select('*,customers(*)').ilike('contract_name', q).limit(10)
    ])
    res.json({ ok: true, results: [
      ...(customers.data || []).map(x => ({ type: 'Kunde', title: x.name, subtitle: x.email, customer_id: x.id })),
      ...(invoices.data || []).map(x => ({ type: 'Rechnung', title: x.invoice_number, subtitle: x.customers?.name, customer_id: x.customer_id })),
      ...(tickets.data || []).map(x => ({ type: 'Ticket', title: x.title, subtitle: x.customers?.name, customer_id: x.customer_id })),
      ...(offers.data || []).map(x => ({ type: 'Angebot', title: x.title, subtitle: x.customers?.name, customer_id: x.customer_id })),
      ...(contracts.data || []).map(x => ({ type: 'Vertrag', title: x.contract_name, subtitle: x.customers?.name, customer_id: x.customer_id }))
    ]})
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/locations/create-user', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { customer_id, location_name, address = '', phone = '', google_profile_url = '' } = req.body
    if (!customer_id || !location_name) return res.status(400).json({ error: 'customer_id und location_name erforderlich' })
    const safe = location_name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'standort'
    const email = `${safe}.${Date.now()}@standort.local`
    const password = 'Standort' + Math.random().toString(36).slice(2, 8) + '!1'
    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })
    if (userError) throw userError
    await supabaseAdmin.from('profiles').insert({ id: created.user.id, email, full_name: location_name, phone, role: 'standortleiter' })
    await supabaseAdmin.from('user_customer_access').insert({ user_id: created.user.id, customer_id })
    const { data: location, error: locError } = await supabaseAdmin.from('multi_locations').insert({ customer_id, location_name, address, phone, google_profile_url, location_user_id: created.user.id, login_email: email, login_password_hint: password, enabled: true }).select().single()
    if (locError) throw locError
    await timeline(customer_id, 'Standort erstellt', `${location_name} wurde erstellt.`, 'location', 'multi_locations', location.id)
    res.json({ ok: true, location, login: { email, password } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/automation/run', async (req, res) => {
  try {
    if (!requireSupabase(res)) return
    const { customer_id, trigger_type, action_type, payload = {} } = req.body
    await supabaseAdmin.from('automation_runs').insert({ customer_id, trigger_type, action_type, status: 'success', payload })
    await timeline(customer_id, 'Automation ausgeführt', `${trigger_type} → ${action_type}`, 'automation', 'automation_runs')
    await notify(customer_id, 'Automation ausgeführt', `${trigger_type} → ${action_type}`, 'automation', 'automations')
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ---------------- Workers ----------------

async function invoiceWorker() {
  try {
    const { data: invoices } = await supabaseAdmin.from('invoices').select('*').neq('status', 'Bezahlt').lt('due_date', new Date().toISOString().slice(0, 10))
    for (const inv of invoices || []) {
      if (inv.status !== 'Überfällig') {
        await supabaseAdmin.from('invoices').update({ status: 'Überfällig' }).eq('id', inv.id)
        const { data: rem } = await supabaseAdmin.from('reminders').insert({ invoice_id: inv.id, customer_id: inv.customer_id, reminder_number: 'MA-' + Date.now(), level: '1. Mahnung' }).select().single()
        await notify(inv.customer_id, 'Rechnung überfällig', `${inv.invoice_number} ist überfällig.`, 'finance', 'invoices')
        if (rem) {
          await createPdfAndStore({
            bucket: 'reminders',
            path: `${inv.customer_id}/${rem.reminder_number}.pdf`,
            title: '1. Mahnung',
            subtitle: inv.invoice_number,
            rows: [{ label: 'Rechnung', value: inv.invoice_number }, { label: 'Betrag', value: inv.amount + ' EUR' }],
            customer_id: inv.customer_id,
            entity: 'reminders',
            entity_id: rem.id,
            targetTable: 'reminders'
          })
        }
      }
    }
  } catch (e) { console.error('invoiceWorker', e.message) }
}

async function healthWorker() {
  try {
    const { data: customers } = await supabaseAdmin.from('customers').select('*')
    for (const c of customers || []) {
      const { data: tickets } = await supabaseAdmin.from('tickets').select('*').eq('customer_id', c.id).neq('status', 'erledigt')
      const { data: invoices } = await supabaseAdmin.from('invoices').select('*').eq('customer_id', c.id).neq('status', 'Bezahlt')
      let score = 100 - (tickets || []).length * 7 - (invoices || []).length * 10
      score = Math.max(0, Math.min(100, score))
      const status = score >= 75 ? 'Grün' : score >= 45 ? 'Gelb' : 'Rot'
      await supabaseAdmin.from('customer_health').insert({ customer_id: c.id, score, status, churn_risk: 100 - score, reasons: [`${tickets?.length || 0} offene Tickets`, `${invoices?.length || 0} offene Rechnungen`] })
    }
  } catch (e) { console.error('healthWorker', e.message) }
}

if (WORKERS_ENABLED && supabaseAdmin) {
  setInterval(invoiceWorker, 5 * 60 * 1000)
  setInterval(healthWorker, 10 * 60 * 1000)
}

const port = process.env.PORT || 4000
app.listen(port, () => console.log('MMOS v10.1 Enterprise Backend läuft auf ' + port))
