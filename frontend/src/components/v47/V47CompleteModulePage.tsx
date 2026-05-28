'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import LegalFooter from '@/components/legal/LegalFooter'
import { accessStatus } from '@/lib/toolAccess'
import {
  buildMiniAuditFromLead,
  buildOfferFromCustomer,
  buildSlugHubUrl,
  calculateHealth,
  createHeatmapGrid,
  firstCustomer,
  insertV47Row,
  loadV47Context,
  rowsForCustomer,
  updateV47Row,
  type V47Context,
  type V47TableName
} from '@/lib/v47CompleteUpgradeClient'
import { currentModeLabel, insertRow } from '@/lib/v44FunctionalToolsClient'

type ModuleKey =
  | 'seo_heatmap'
  | 'slug_hub'
  | 'reputation'
  | 'loyalty'
  | 'lead_engine'
  | 'offer_generator'
  | 'tool_access'
  | 'customer_health'
  | 'automation'
  | 'media_reports'
  | 'growth_command'

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg,#08111f,#111827 46%,#1e1b4b)', color: '#f8fafc', padding: 28 },
  wrap: { maxWidth: 1240, margin: '0 auto' },
  hero: { border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.08)', borderRadius: 28, padding: 28, boxShadow: '0 24px 70px rgba(0,0,0,.32)', backdropFilter: 'blur(16px)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginTop: 18 },
  gridSmall: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginTop: 16 },
  card: { border: '1px solid rgba(255,255,255,.12)', background: 'rgba(15,23,42,.74)', borderRadius: 22, padding: 20 },
  title: { fontSize: 'clamp(32px,5vw,56px)', lineHeight: 1, margin: '10px 0', letterSpacing: '-.05em' },
  sub: { color: '#cbd5e1', lineHeight: 1.6 },
  eyebrow: { color: '#a5b4fc', letterSpacing: '.16em', textTransform: 'uppercase', fontSize: 12, fontWeight: 900 },
  select: { background: 'rgba(15,23,42,.9)', color: '#fff', border: '1px solid rgba(255,255,255,.18)', borderRadius: 14, padding: '12px 14px', minWidth: 260 },
  input: { background: 'rgba(15,23,42,.9)', color: '#fff', border: '1px solid rgba(255,255,255,.18)', borderRadius: 14, padding: '12px 14px', width: '100%' },
  btn: { border: 0, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', borderRadius: 14, padding: '12px 16px', fontWeight: 900, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex' },
  btn2: { border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.08)', color: '#fff', borderRadius: 14, padding: '12px 16px', fontWeight: 900, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex' },
  metric: { fontSize: 30, fontWeight: 950, letterSpacing: '-.04em' },
  muted: { color: '#94a3b8' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 8px', color: '#a5b4fc', borderBottom: '1px solid rgba(255,255,255,.14)' },
  td: { padding: '10px 8px', color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,.08)', verticalAlign: 'top' },
  heat: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(90px,1fr))', gap: 10, marginTop: 18 },
  pill: { display: 'inline-flex', border: '1px solid rgba(165,180,252,.34)', background: 'rgba(99,102,241,.18)', color: '#c7d2fe', borderRadius: 999, padding: '7px 11px', fontWeight: 900, fontSize: 12 }
}

const moduleToolKeys: Record<ModuleKey, string> = {
  growth_command: 'growth_command_center',
  seo_heatmap: 'seo_heatmap_pro',
  slug_hub: 'slug_endcustomer_hub',
  reputation: 'reputation_center',
  loyalty: 'loyalty_growth_center',
  lead_engine: 'lead_audit_engine',
  offer_generator: 'value_offer_generator',
  tool_access: 'tool_access_v2',
  customer_health: 'crm_customer_health_v2',
  automation: 'automation_playbooks',
  media_reports: 'media_report_center'
}

const configs: Record<ModuleKey, { title: string; subtitle: string; focus: string }> = {
  growth_command: { title: 'Growth Command Center', subtitle: 'Alle 12 Optimierungsbereiche in einer Steuerzentrale.', focus: 'Gesamtsteuerung' },
  seo_heatmap: { title: 'SEO Heatmap Pro', subtitle: 'Suchradius, Rankingpunkte, Stadtteile und konkrete SEO-Maßnahmen sichtbar machen.', focus: 'SEO' },
  slug_hub: { title: 'QR-/Slug-Endkundenhub', subtitle: 'Bewertungen, Loyalty, Gutscheine, Termine, Empfehlungen und Kontakt auf einer Endkundenseite bündeln.', focus: 'Slug' },
  reputation: { title: 'Review & Reputation Center', subtitle: 'Bewertungsziele, kritisches Feedback, Antwortquote und Review-Tickets steuern.', focus: 'Reviews' },
  loyalty: { title: 'Loyalty Growth Center', subtitle: 'Punkte, Rewards, VIP, Geburtstagsbonus und Umsatzlogik für Wiederkehrer.', focus: 'Loyalty' },
  lead_engine: { title: 'Lead Scraper + Mini-Audit Engine', subtitle: 'Leads bewerten, Mini-Audits erzeugen und Follow-ups vorbereiten.', focus: 'Akquise' },
  offer_generator: { title: 'Value Angebotsgenerator', subtitle: 'Angebote aus Audit, Value Score, Paketlogik und Kundenbedarf erzeugen.', focus: 'Angebote' },
  tool_access: { title: 'Tool-Freigaben & Paketlogik Pro', subtitle: 'Tools pro Kunde, Paket und Add-on sauber aktivieren oder sperren.', focus: 'Pakete' },
  customer_health: { title: 'CRM & Customer Health', subtitle: 'Kündigungsrisiko, Upsell-Chancen, Toolnutzung und offene Themen sichtbar machen.', focus: 'CRM' },
  automation: { title: 'Automation Playbooks', subtitle: 'Standard-Trigger für Reviews, Termine, Rechnungen, SEO und Loyalty verwalten.', focus: 'Automationen' },
  media_reports: { title: 'Media Center & Report-Verknüpfung', subtitle: 'Reports, Angebote, Rechnungen und Dateien kundengenau verknüpfen.', focus: 'Dokumente' }
}

function eur(v: any) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0))
}

function num(v: any) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Number(v || 0))
}

function Field({ label, value, onChange, options }: any) {
  return (
    <label>
      <span style={styles.muted}>{label}</span>
      {options ? (
        <select style={styles.select} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input style={styles.input} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  )
}

function Metric({ label, value, sub }: any) {
  return (
    <div style={styles.card}>
      <div style={styles.muted}>{label}</div>
      <div style={styles.metric}>{value}</div>
      {sub && <div style={styles.muted}>{sub}</div>}
    </div>
  )
}

function Table({ rows, columns }: any) {
  if (!rows.length) return <p style={styles.muted}>Keine Daten vorhanden.</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead><tr>{columns.map((c: any) => <th style={styles.th} key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.id || JSON.stringify(row)}>
              {columns.map((c: any) => <td style={styles.td} key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '-')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function customerOptions(ctx: V47Context) {
  return (ctx.customers || []).map((c: any) => ({ value: c.id, label: c.name || c.email || c.id }))
}

export default function V47CompleteModulePage({ moduleKey }: { moduleKey: ModuleKey }) {
  const [ctx, setCtx] = useState<V47Context | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [form, setForm] = useState<any>({})
  const [notice, setNotice] = useState('')

  async function reload() {
    const data = await loadV47Context()
    setCtx(data)
    if (!customerId && data.customers?.[0]?.id) setCustomerId(data.customers[0].id)
  }

  useEffect(() => { void reload() }, [])

  const cfg = configs[moduleKey]

  const customer = useMemo(() => ctx ? firstCustomer(ctx, customerId) : {}, [ctx, customerId])
  const activeCustomerId = String(customerId || customer?.id || '')
  const health = useMemo(() => ctx ? calculateHealth(ctx, activeCustomerId) : null, [ctx, activeCustomerId])
  const heatmap = useMemo(() => ctx ? createHeatmapGrid(ctx, activeCustomerId) : [], [ctx, activeCustomerId])

  if (!ctx || !health) {
    return <main style={styles.page}><div style={styles.wrap}><section style={styles.hero}>Lade V47 Modul ...</section></div></main>
  }

  async function save(table: V47TableName, payload: any) {
    await insertV47Row(table, { customer_id: activeCustomerId, ...payload })
    setNotice('Gespeichert und verknüpft.')
    setForm({})
    await reload()
  }

  async function createLeadAudit() {
    const lead = rowsForCustomer(ctx.prospect_leads || [], activeCustomerId)[0] || (ctx.prospect_leads || [])[0] || {}
    await save('v47_lead_audits', buildMiniAuditFromLead(lead))
  }

  async function createOffer() {
    await save('v47_value_offers', buildOfferFromCustomer(ctx, activeCustomerId))
  }

  async function createAutomationDefaults() {
    const playbooks = [
      { name: '1-3 Sterne Feedback', trigger_event: 'review_low_rating', action: 'Ticket erstellen + interne Benachrichtigung', status: 'Aktiv' },
      { name: 'Termin abgeschlossen', trigger_event: 'appointment_done', action: 'Bewertungsbitte senden', status: 'Aktiv' },
      { name: 'Rechnung überfällig', trigger_event: 'invoice_overdue', action: 'Zahlungserinnerung vorbereiten', status: 'Aktiv' },
      { name: 'SEO Rückgang', trigger_event: 'seo_drop', action: 'Admin-Aufgabe erstellen', status: 'Entwurf' },
      { name: 'Reward erreicht', trigger_event: 'reward_ready', action: 'Kunde informieren', status: 'Entwurf' }
    ]
    for (const p of playbooks) await insertV47Row('v47_automation_playbooks', { customer_id: activeCustomerId, ...p })
    setNotice('Standard-Automationen wurden angelegt.')
    await reload()
  }

  const reviewRows = rowsForCustomer(ctx.review_feedback || [], activeCustomerId)
  const loyaltyRows = rowsForCustomer(ctx.loyalty_customers || [], activeCustomerId)
  const qrRows = rowsForCustomer(ctx.qr_campaigns || [], activeCustomerId)
  const leadAudits = rowsForCustomer(ctx.v47_lead_audits || [], activeCustomerId)
  const offers = rowsForCustomer(ctx.v47_value_offers || [], activeCustomerId)
  const accessRules = rowsForCustomer(ctx.v47_tool_access_rules || [], activeCustomerId)
  const healthEvents = rowsForCustomer(ctx.v47_customer_health_events || [], activeCustomerId)
  const automations = rowsForCustomer(ctx.v47_automation_playbooks || [], activeCustomerId)
  const mediaLinks = rowsForCustomer(ctx.v47_media_report_links || [], activeCustomerId)
  const reports = rowsForCustomer(ctx.v46_value_reports || [], activeCustomerId)
  const accessStatusLabel = accessStatus(customer, moduleToolKeys[moduleKey], accessRules)

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <section style={styles.hero}>
          <a href="/value-dashboard" style={{ color: '#bfdbfe', textDecoration: 'none' }}>← Zurück zum Value Dashboard</a>
          <p style={{ ...styles.eyebrow, marginTop: 18 }}>V47 Complete Upgrade · {currentModeLabel()} · {cfg.focus}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 style={styles.title}>{cfg.title}</h1>
              <p style={styles.sub}>{cfg.subtitle}</p>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <select style={styles.select} value={activeCustomerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customerOptions(ctx).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <a style={styles.btn2} href={`/hub/${String(customer?.name || 'kunde').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>Endkundenhub öffnen</a>
            </div>
          </div>
          {notice && <p style={styles.sub}>{notice}</p>}
          {accessStatusLabel !== 'Aktiv' && (
            <p style={styles.sub}>Tool-Access: <strong>{accessStatusLabel}</strong> · steuerbar unter /admin/tool-access-v2</p>
          )}
          <div style={styles.gridSmall}>
            <Metric label="Health Score" value={`${health.healthScore}/100`} sub={health.healthStatus} />
            <Metric label="Value Score" value={`${health.valueScore}/100`} sub="aus V46" />
            <Metric label="QR-Scans" value={num(health.metrics.qrScans)} sub={`${health.metrics.qrConversions} Conversions`} />
            <Metric label="Reviews" value={num(health.metrics.reviewCount)} sub={`${health.metrics.negativeFeedback} kritisch`} />
          </div>
        </section>

        {moduleKey === 'growth_command' && (
          <section style={styles.grid}>
            {Object.entries(configs).filter(([k]) => k !== 'growth_command').map(([key, c]) => (
              <a key={key} href={routesForModule(key as ModuleKey)} style={{ ...styles.card, textDecoration: 'none', color: '#fff' }}>
                <span style={styles.pill}>{c.focus}</span>
                <h2>{c.title}</h2>
                <p style={styles.sub}>{c.subtitle}</p>
              </a>
            ))}
          </section>
        )}

        {moduleKey === 'seo_heatmap' && (
          <section style={styles.card}>
            <h2>Heatmap Grid</h2>
            <div style={styles.heat}>
              {heatmap.map((p: any) => {
                const color = Number(p.rank) <= 3 ? '#16a34a' : Number(p.rank) <= 8 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={p.id} style={{ borderRadius: 18, padding: 16, background: color, color: '#fff', minHeight: 110 }}>
                    <strong>{p.area_label}</strong>
                    <div style={{ fontSize: 30, fontWeight: 950 }}>#{p.rank}</div>
                    <div>{p.keyword}</div>
                    <small>{p.recommendation}</small>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 18 }}>
              <button style={styles.btn} onClick={() => save('v47_heatmap_points', {
                keyword: form.keyword || 'friseur rostock',
                area_label: form.area_label || 'Neuer Stadtteil',
                rank: Number(form.rank || 9),
                visibility: Number(form.visibility || 55),
                recommendation: form.recommendation || 'Content + Google Beitrag optimieren'
              })}>Heatmap-Punkt speichern</button>
            </div>
          </section>
        )}

        {moduleKey === 'slug_hub' && (
          <section style={styles.grid}>
            <div style={styles.card}>
              <h2>Endkundenhub</h2>
              <p style={styles.sub}>Öffentliche Hub-URL: <a href={`/hub/${String(customer?.name || 'kunde').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} style={{ color: '#93c5fd' }}>{buildSlugHubUrl(customer)}</a></p>
              <button style={styles.btn} onClick={() => save('v47_slug_hub_settings', {
                slug: String(customer?.name || 'kunde').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                hero_title: form.hero_title || `Willkommen bei ${customer?.name || 'unserem Betrieb'}`,
                enabled_blocks: ['reviews','loyalty','rewards','booking','payments','referrals','contact'],
                status: 'Aktiv'
              })}>Hub-Konfiguration speichern</button>
            </div>
            <div style={styles.card}>
              <h2>Verknüpfte Hub-Daten</h2>
              <ul style={styles.sub}>
                <li>{qrRows.length} QR-Kampagnen</li>
                <li>{reviewRows.length} Reviews/Feedbacks</li>
                <li>{loyaltyRows.length} Loyalty-Kunden</li>
                <li>{rowsForCustomer(ctx.voucher_products || [], activeCustomerId).length} Gutscheine</li>
                <li>{rowsForCustomer(ctx.referral_campaigns || [], activeCustomerId).length} Empfehlungsaktionen</li>
              </ul>
            </div>
          </section>
        )}

        {moduleKey === 'reputation' && (
          <section style={styles.grid}>
            <div style={styles.card}>
              <h2>Review-Zielsystem</h2>
              <Field label="Monatsziel Bewertungen" value={form.monthly_goal} onChange={(v: string) => setForm({ ...form, monthly_goal: v })} />
              <Field label="Zielbewertung" value={form.target_rating} onChange={(v: string) => setForm({ ...form, target_rating: v })} />
              <button style={styles.btn} onClick={() => save('v47_review_goals', { monthly_goal: Number(form.monthly_goal || 10), target_rating: Number(form.target_rating || 4.6), status: 'Aktiv' })}>Ziel speichern</button>
            </div>
            <div style={styles.card}>
              <h2>Review-Daten</h2>
              <Metric label="Feedbacks" value={reviewRows.length} sub={`${health.metrics.negativeFeedback} kritisch`} />
              <Table rows={reviewRows.slice(0, 5)} columns={[{ key: 'rating', label: 'Sterne' }, { key: 'message', label: 'Feedback' }, { key: 'status', label: 'Status' }]} />
            </div>
          </section>
        )}

        {moduleKey === 'loyalty' && (
          <section style={styles.grid}>
            <div style={styles.card}>
              <h2>Loyalty-Umsatzlogik</h2>
              <Field label="Ziel Wiederkehrer / Monat" value={form.returning_goal} onChange={(v: string) => setForm({ ...form, returning_goal: v })} />
              <Field label="Ø Warenkorb" value={form.avg_ticket} onChange={(v: string) => setForm({ ...form, avg_ticket: v })} />
              <button style={styles.btn} onClick={() => save('v47_loyalty_goals', {
                returning_goal: Number(form.returning_goal || 20),
                avg_ticket: Number(form.avg_ticket || 18),
                estimated_monthly_value: Number(form.returning_goal || 20) * Number(form.avg_ticket || 18),
                status: 'Aktiv'
              })}>Loyalty-Ziel speichern</button>
            </div>
            <div style={styles.card}>
              <h2>Aktueller Loyalty-Status</h2>
              <Metric label="Mitglieder" value={loyaltyRows.length} sub={`${health.metrics.activeRewards} aktive Rewards`} />
              <Metric label="Punkte" value={health.metrics.loyaltyPoints} />
            </div>
          </section>
        )}

        {moduleKey === 'lead_engine' && (
          <section style={styles.card}>
            <h2>Mini-Audit aus Lead erzeugen</h2>
            <button style={styles.btn} onClick={createLeadAudit}>Mini-Audit erzeugen</button>
            <Table rows={leadAudits} columns={[{ key: 'business_name', label: 'Betrieb' }, { key: 'audit_score', label: 'Score' }, { key: 'recommended_package', label: 'Paket' }, { key: 'city', label: 'Ort' }]} />
          </section>
        )}

        {moduleKey === 'offer_generator' && (
          <section style={styles.card}>
            <h2>Angebot aus Value Score erzeugen</h2>
            <button style={styles.btn} onClick={createOffer}>Angebot erzeugen</button>
            <Table rows={offers} columns={[
              { key: 'title', label: 'Angebot' },
              { key: 'package_name', label: 'Paket' },
              { key: 'monthly_price', label: 'Monatlich', render: (r: any) => eur(r.monthly_price) },
              { key: 'setup_fee', label: 'Einrichtung', render: (r: any) => eur(r.setup_fee) },
              { key: 'reason', label: 'Grund' }
            ]} />
          </section>
        )}

        {moduleKey === 'tool_access' && (
          <section style={styles.card}>
            <h2>Tool-Freigabe erstellen</h2>
            <div style={styles.gridSmall}>
              <Field label="Tool-Key" value={form.tool_key} onChange={(v: string) => setForm({ ...form, tool_key: v })} />
              <Field label="Status" value={form.status} onChange={(v: string) => setForm({ ...form, status: v })} options={[{ value: 'Aktiv', label: 'Aktiv' }, { value: 'Gesperrt', label: 'Gesperrt' }, { value: 'Add-on', label: 'Add-on' }]} />
            </div>
            <button style={styles.btn} onClick={() => save('v47_tool_access_rules', { tool_key: form.tool_key || 'seo_heatmap', status: form.status || 'Aktiv', package_scope: form.package_scope || 'Growth' })}>Freigabe speichern</button>
            <Table rows={accessRules} columns={[{ key: 'tool_key', label: 'Tool' }, { key: 'status', label: 'Status' }, { key: 'package_scope', label: 'Paket/Add-on' }]} />
          </section>
        )}

        {moduleKey === 'customer_health' && (
          <section style={styles.grid}>
            <div style={styles.card}>
              <h2>Customer Health</h2>
              <Metric label="Health Score" value={`${health.healthScore}/100`} sub={health.healthStatus} />
              <button style={styles.btn} onClick={() => save('v47_customer_health_events', { type: 'Upsell Chance', note: 'Value Score und Nutzung prüfen', status: 'Offen' })}>Health Event speichern</button>
            </div>
            <div style={styles.card}>
              <h2>Events</h2>
              <Table rows={healthEvents} columns={[{ key: 'type', label: 'Typ' }, { key: 'note', label: 'Notiz' }, { key: 'status', label: 'Status' }]} />
            </div>
          </section>
        )}

        {moduleKey === 'automation' && (
          <section style={styles.card}>
            <h2>Standard-Automationen</h2>
            <button style={styles.btn} onClick={createAutomationDefaults}>Playbooks erzeugen</button>
            <Table rows={automations} columns={[{ key: 'name', label: 'Name' }, { key: 'trigger_event', label: 'Trigger' }, { key: 'action', label: 'Aktion' }, { key: 'status', label: 'Status' }]} />
          </section>
        )}

        {moduleKey === 'media_reports' && (
          <section style={styles.grid}>
            <div style={styles.card}>
              <h2>Report/Datei verknüpfen</h2>
              <Field label="Titel" value={form.title} onChange={(v: string) => setForm({ ...form, title: v })} />
              <Field label="URL" value={form.url} onChange={(v: string) => setForm({ ...form, url: v })} />
              <button style={styles.btn} onClick={() => save('v47_media_report_links', { title: form.title || 'Monatsreport', url: form.url || '/value-dashboard', type: 'Report', status: 'Aktiv' })}>Verknüpfung speichern</button>
            </div>
            <div style={styles.card}>
              <h2>Reports & Dateien</h2>
              <Table rows={[...mediaLinks, ...reports.map((r: any) => ({ id: r.id, title: r.period_label, url: `/reports/value/${r.id}`, type: 'Value Report', status: r.value_score }))]} columns={[
                { key: 'title', label: 'Titel' },
                { key: 'type', label: 'Typ' },
                { key: 'url', label: 'Link', render: (r: any) => r.url ? <a href={r.url} style={{ color: '#93c5fd' }}>öffnen</a> : '-' },
                { key: 'status', label: 'Status' }
              ]} />
            </div>
          </section>
        )}

        <LegalFooter />
      </div>
    </main>
  )
}

function routesForModule(key: ModuleKey) {
  const map: Record<ModuleKey, string> = {
    growth_command: '/growth-command',
    seo_heatmap: '/analytics/seo-heatmap-pro',
    slug_hub: '/slug-hub',
    reputation: '/reputation-center',
    loyalty: '/loyalty/growth',
    lead_engine: '/admin/sales/lead-engine',
    offer_generator: '/admin/sales/value-offers',
    tool_access: '/admin/tool-access-v2',
    customer_health: '/crm/customer-health',
    automation: '/automation/playbooks',
    media_reports: '/media/report-center'
  }
  return map[key]
}
