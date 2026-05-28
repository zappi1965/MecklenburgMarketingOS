'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useParams } from 'next/navigation'
import LegalFooter from '@/components/legal/LegalFooter'
import { findValueReport, type ValueReport } from '@/lib/v46ValueClient'

function eur(value: any) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0))
}

const s: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: 28 },
  wrap: { maxWidth: 980, margin: '0 auto' },
  paper: { background: 'white', borderRadius: 24, padding: 36, boxShadow: '0 24px 70px rgba(15,23,42,.12)', border: '1px solid #e2e8f0' },
  eyebrow: { color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '.16em', fontSize: 12, fontWeight: 900 },
  title: { fontSize: 46, lineHeight: 1, letterSpacing: '-.05em', margin: '10px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, margin: '24px 0' },
  card: { border: '1px solid #e2e8f0', borderRadius: 18, padding: 16, background: '#f8fafc' },
  metric: { fontSize: 28, fontWeight: 900 },
  muted: { color: '#64748b' },
  btn: { display: 'inline-flex', background: '#111827', color: 'white', borderRadius: 12, padding: '10px 14px', textDecoration: 'none', border: 0, cursor: 'pointer' },
  list: { lineHeight: 1.75 }
}

export default function V46ValueReportPage() {
  const params = useParams<{ id: string }>()
  const id = String(params?.id || '')
  const [report, setReport] = useState<ValueReport | null>(null)

  useEffect(() => {
    async function load() {
      setReport(await findValueReport(id))
    }
    void load()
  }, [id])

  if (!report) {
    return (
      <main style={s.page}>
        <div style={s.wrap}>
          <section style={s.paper}>
            <a href="/value-dashboard">← Zurueck</a>
            <p>Report wird geladen oder ist nicht vorhanden.</p>
          </section>
        </div>
      </main>
    )
  }

  const m = report.metrics || {}

  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <section style={s.paper}>
          <a href="/value-dashboard">← Zurueck zum Value Dashboard</a>
          <p style={s.eyebrow}>Mecklenburg Marketing Monatsreport</p>
          <h1 style={s.title}>{report.customer_name}</h1>
          <p style={s.muted}>{report.period_label} · Value Score {report.value_score}/100</p>
          <p>{report.summary}</p>

          <div style={s.grid}>
            <div style={s.card}><div style={s.muted}>QR-Scans</div><div style={s.metric}>{m.qrScans || 0}</div></div>
            <div style={s.card}><div style={s.muted}>Conversions</div><div style={s.metric}>{m.qrConversions || 0}</div></div>
            <div style={s.card}><div style={s.muted}>Bewertungen</div><div style={s.metric}>{m.reviewCount || 0}</div></div>
            <div style={s.card}><div style={s.muted}>Sichtbarkeit</div><div style={s.metric}>{m.avgVisibility || 0}</div></div>
            <div style={s.card}><div style={s.muted}>Loyalty Kontakte</div><div style={s.metric}>{m.loyaltyMembers || 0}</div></div>
            <div style={s.card}><div style={s.muted}>Potenzial-Indikator</div><div style={s.metric}>{eur(m.potentialValue)}</div></div>
          </div>

          <h2>Empfohlene Maßnahmen</h2>
          <ul style={s.list}>
            {(report.recommendations || []).map((item) => <li key={item}>{item}</li>)}
          </ul>

          <h2>Naechste Schritte</h2>
          <ol style={s.list}>
            {(report.next_actions || []).map((item) => <li key={item}>{item}</li>)}
          </ol>

          <button style={s.btn} onClick={() => window.print()}>Drucken / als PDF speichern</button>
        </section>
        <LegalFooter />
      </div>
    </main>
  )
}
