'use client'

import { useEffect, useMemo, useState, memo, type CSSProperties } from 'react'
import LegalFooter from '@/components/legal/LegalFooter'
import {
  buildReportPayload,
  calculateCustomerValue,
  loadValueContext,
  saveValueReport,
  type ValueReport
} from '@/lib/v46ValueClient'
import { currentModeLabel } from '@/lib/v44FunctionalToolsClient'

function eur(value: any) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0))
}

function num(value: any) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Number(value || 0))
}

function monthLabel() {
  return new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
}

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top left, rgba(120, 86, 255, .22), transparent 32%), linear-gradient(135deg, #070817 0%, #111827 45%, #1f2937 100%)',
    color: '#f8fafc',
    padding: '28px',
  },
  wrap: { maxWidth: 1240, margin: '0 auto' },
  hero: {
    border: '1px solid rgba(255,255,255,.14)',
    background: 'linear-gradient(135deg, rgba(255,255,255,.13), rgba(255,255,255,.06))',
    borderRadius: 28,
    padding: 28,
    boxShadow: '0 24px 70px rgba(0,0,0,.35)',
    backdropFilter: 'blur(18px)'
  },
  topRow: { display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', alignItems: 'center' },
  eyebrow: { color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 12, fontWeight: 800 },
  title: { fontSize: 'clamp(34px, 5vw, 64px)', lineHeight: 1, margin: '12px 0', letterSpacing: '-.05em' },
  text: { color: '#cbd5e1', maxWidth: 820, fontSize: 17, lineHeight: 1.65 },
  select: {
    background: 'rgba(15,23,42,.88)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,.16)',
    padding: '12px 14px',
    borderRadius: 14,
    minWidth: 260
  },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 18 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, marginTop: 18 },
  card: {
    border: '1px solid rgba(255,255,255,.12)',
    background: 'rgba(15,23,42,.72)',
    borderRadius: 22,
    padding: 20,
    boxShadow: '0 18px 50px rgba(0,0,0,.25)'
  },
  metricValue: { fontSize: 34, fontWeight: 900, letterSpacing: '-.04em', marginTop: 8 },
  metricLabel: { color: '#94a3b8', fontSize: 13, fontWeight: 700 },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid rgba(165,180,252,.32)',
    background: 'rgba(99,102,241,.18)',
    color: '#c7d2fe',
    borderRadius: 999,
    padding: '8px 12px',
    fontSize: 13,
    fontWeight: 800
  },
  btn: {
    display: 'inline-flex',
    border: '0',
    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    color: 'white',
    borderRadius: 14,
    padding: '12px 16px',
    fontWeight: 800,
    cursor: 'pointer',
    textDecoration: 'none'
  },
  btnSecondary: {
    display: 'inline-flex',
    border: '1px solid rgba(255,255,255,.16)',
    background: 'rgba(255,255,255,.08)',
    color: 'white',
    borderRadius: 14,
    padding: '12px 16px',
    fontWeight: 800,
    cursor: 'pointer',
    textDecoration: 'none'
  },
  progressOuter: { height: 14, background: 'rgba(255,255,255,.1)', borderRadius: 999, overflow: 'hidden', marginTop: 12 },
  progressInner: { height: '100%', background: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e)', borderRadius: 999 },
  list: { margin: 0, paddingLeft: 18, color: '#dbeafe', lineHeight: 1.7 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', color: '#a5b4fc', padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,.12)', fontSize: 13 },
  td: { padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,.08)', color: '#e5e7eb' }
}

const MetricCard = memo(function MetricCard({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div style={styles.card}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
      {sub && <div style={{ color: '#94a3b8', marginTop: 6 }}>{sub}</div>}
    </div>
  )
})

const MiniTable = memo(function MiniTable({ rows }: { rows: ValueReport[] }) {
  if (!rows.length) return <p style={{ color: '#94a3b8' }}>Noch keine Reports gespeichert.</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Zeitraum</th>
            <th style={styles.th}>Kunde</th>
            <th style={styles.th}>Score</th>
            <th style={styles.th}>Report</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 6).map((report) => (
            <tr key={report.id}>
              <td style={styles.td}>{report.period_label}</td>
              <td style={styles.td}>{report.customer_name}</td>
              <td style={styles.td}>{report.value_score}/100</td>
              <td style={styles.td}><a style={{ color: '#93c5fd' }} href={`/reports/value/${report.id}`}>oeffnen</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

export default function V46ValueDashboard() {
  const [ctx, setCtx] = useState<any>(null)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [period, setPeriod] = useState(monthLabel())
  const [saving, setSaving] = useState(false)
  const [createdReport, setCreatedReport] = useState<ValueReport | null>(null)

  async function reload() {
    const loaded = await loadValueContext()
    setCtx(loaded)
    if (!selectedCustomer && loaded.customers?.[0]?.id) setSelectedCustomer(loaded.customers[0].id)
  }

  useEffect(() => { void reload() }, [])

  const value = useMemo(() => {
    if (!ctx) return null
    return calculateCustomerValue(ctx, selectedCustomer)
  }, [ctx, selectedCustomer])

  async function createReport() {
    if (!ctx || !value) return
    setSaving(true)
    try {
      const payload = buildReportPayload(ctx, value.customerId, period)
      const report = await saveValueReport(payload)
      setCreatedReport(report)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  if (!ctx || !value) {
    return (
      <main style={styles.shell}>
        <div style={styles.wrap}>
          <section style={styles.hero}><p>Lade Value Dashboard ...</p></section>
        </div>
      </main>
    )
  }

  const m = value.metrics
  const customers = ctx.customers || []
  const reports = useMemo(() => (ctx.v46_value_reports || []).filter((r: ValueReport) => !selectedCustomer || String(r.customer_id) === String(value.customerId)), [ctx.v46_value_reports, selectedCustomer, value.customerId])

  return (
    <main style={styles.shell}>
      <div style={styles.wrap}>
        <section style={styles.hero}>
          <div style={styles.topRow}>
            <div>
              <a href="/tools" style={{ color: '#bfdbfe', textDecoration: 'none' }}>← Zur Tool-Uebersicht</a>
              <div style={{ marginTop: 18 }}><span style={styles.eyebrow}>V46 Value Dashboard · {currentModeLabel()}</span></div>
              <h1 style={styles.title}>Das hat MMOS gebracht.</h1>
              <p style={styles.text}>
                Dieses Dashboard fuehrt SEO, QR, Reviews, Loyalty, Leads, Termine, Inbox, Listings,
                Payments und Referrals zu einer verstaendlichen Kundennutzen-Ansicht zusammen.
              </p>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <select style={styles.select} value={value.customerId} onChange={(e) => setSelectedCustomer(e.target.value)}>
                {customers.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>{customer.name || customer.email || customer.id}</option>
                ))}
              </select>
              <input style={styles.select} value={period} onChange={(e) => setPeriod(e.target.value)} />
              <button style={styles.btn} onClick={createReport} disabled={saving}>{saving ? 'Report wird erstellt ...' : 'Monatsreport erstellen'}</button>
              {createdReport && <a style={styles.btnSecondary} href={`/reports/value/${createdReport.id}`}>Report oeffnen</a>}
            </div>
          </div>

          <div style={styles.grid4}>
            <MetricCard label="Value Score" value={`${value.valueScore}/100`} sub="gewichteter Nutzenindikator" />
            <MetricCard label="Potenzial-Indikator" value={eur(m.potentialValue)} sub="grobe Wirkung aus Scans, Leads, Loyalty, Empfehlungen" />
            <MetricCard label="QR Aktionen" value={num(m.qrScans)} sub={`${num(m.qrConversions)} Conversions · ${m.conversionRate}% Quote`} />
            <MetricCard label="Bewertungen / Feedback" value={num(m.reviewCount)} sub={`Ø ${m.avgRating || '-'} Sterne · ${m.negativeFeedback} kritisch`} />
          </div>

          <div style={styles.progressOuter}>
            <div style={{ ...styles.progressInner, width: `${value.valueScore}%` }} />
          </div>
        </section>

        <section style={styles.grid2}>
          <div style={styles.card}>
            <span style={styles.pill}>Zusammenfassung</span>
            <h2>Management Summary</h2>
            <p style={styles.text}>{value.summary}</p>
            <div style={styles.grid2}>
              <MetricCard label="Lokale Sichtbarkeit" value={`${m.avgVisibility || 0}`} sub={`Bestes Keyword: ${m.bestKeyword}`} />
              <MetricCard label="Listings Score" value={`${m.avgNapScore || 0}`} sub={`${m.listingIssues} offene Listing-Themen`} />
            </div>
          </div>

          <div style={styles.card}>
            <span style={styles.pill}>Naechste Schritte</span>
            <h2>Empfohlene Maßnahmen</h2>
            <ul style={styles.list}>
              {value.recommendations.map((item: string) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </section>

        <section style={styles.grid4}>
          <MetricCard label="Loyalty Kontakte" value={num(m.loyaltyMembers)} sub={`${num(m.loyaltyPoints)} Punkte · ${m.activeRewards} aktive Rewards`} />
          <MetricCard label="Offene Inbox" value={num(m.openMessages + m.openTickets)} sub={`${m.openMessages} Nachrichten · ${m.openTickets} Tickets`} />
          <MetricCard label="Termine/Auslastung" value={num(m.appointments)} sub={`${m.freeSlots} freie Slots · ${m.waitlistCount} Warteliste`} />
          <MetricCard label="Payments & Gutscheine" value={eur(m.voucherValue)} sub={`${m.paymentOpen} offene Zahlungslinks`} />
        </section>

        <section style={styles.grid2}>
          <div style={styles.card}>
            <span style={styles.pill}>Verknuepfte Module</span>
            <h2>Datenquellen</h2>
            <div style={styles.grid2}>
              <MetricCard label="SEO Snapshots" value={value.rows.seo.length} />
              <MetricCard label="QR Kampagnen" value={value.rows.qr.length} />
              <MetricCard label="Reviews" value={value.rows.reviews.length} />
              <MetricCard label="Listings" value={value.rows.listings.length} />
              <MetricCard label="Rechnungen" value={value.rows.invoices.length} />
              <MetricCard label="Referrals" value={value.rows.referralEvents.length} />
            </div>
          </div>

          <div style={styles.card}>
            <span style={styles.pill}>Report-Historie</span>
            <h2>Gespeicherte Monatsreports</h2>
            <MiniTable rows={reports} />
          </div>
        </section>

        <section style={styles.card}>
          <span style={styles.pill}>Admin Fokus</span>
          <h2>Top-Aktionen fuer diesen Kunden</h2>
          <ol style={styles.list}>
            {value.nextActions.map((item: string) => <li key={item}>{item}</li>)}
          </ol>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <a style={styles.btnSecondary} href="/growth-command">Growth Command</a>
            <a style={styles.btnSecondary} href="/analytics/seo-heatmap-pro">SEO Heatmap Pro</a>
            <a style={styles.btnSecondary} href="/qr-campaigns">QR Kampagnen</a>
            <a style={styles.btnSecondary} href="/reviews">Reviews</a>
            <a style={styles.btnSecondary} href="/loyalty/growth">Loyalty Growth</a>
            <a style={styles.btnSecondary} href="/inbox">Inbox</a>
            <a style={styles.btnSecondary} href="/payments-vouchers">Payments</a>
          </div>
        </section>

        <LegalFooter />
      </div>
    </main>
  )
}
