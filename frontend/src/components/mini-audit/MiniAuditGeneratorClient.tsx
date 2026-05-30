'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { resolveLevelBadge, resolveStatusBadge } from '@/lib/mini-audit/badgeLibrary'
import type { GooglePlacePublicData, MiniAuditResult } from '@/lib/mini-audit/types'

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg,#08111f,#111827 48%,#1e1b4b)', color: '#f8fafc', padding: 28 },
  wrap: { maxWidth: 1240, margin: '0 auto' },
  hero: { border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.08)', borderRadius: 28, padding: 28, boxShadow: '0 24px 70px rgba(0,0,0,.32)', backdropFilter: 'blur(16px)' },
  title: { fontSize: 'clamp(34px,5vw,58px)', lineHeight: 1, margin: '12px 0', letterSpacing: '-.05em' },
  sub: { color: '#cbd5e1', lineHeight: 1.6 },
  muted: { color: '#94a3b8' },
  eyebrow: { color: '#a5b4fc', letterSpacing: '.16em', textTransform: 'uppercase', fontSize: 12, fontWeight: 900 },
  input: { width: '100%', background: 'rgba(15,23,42,.92)', color: '#fff', border: '1px solid rgba(255,255,255,.18)', borderRadius: 16, padding: '14px 16px', fontSize: 16 },
  btn: { border: 0, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', borderRadius: 16, padding: '14px 18px', fontWeight: 900, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btn2: { border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.08)', color: '#fff', borderRadius: 16, padding: '14px 18px', fontWeight: 900, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginTop: 18 },
  gridSmall: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginTop: 16 },
  card: { border: '1px solid rgba(255,255,255,.12)', background: 'rgba(15,23,42,.74)', borderRadius: 22, padding: 20 },
  lightCard: { border: '1px solid rgba(226,232,240,.95)', background: '#fff', color: '#0f172a', borderRadius: 22, padding: 20, boxShadow: '0 20px 60px rgba(2,6,23,.18)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 8px', color: '#64748b', borderBottom: '1px solid #e2e8f0', fontSize: 12 },
  td: { padding: '10px 8px', color: '#0f172a', borderBottom: '1px solid #eef2f7', verticalAlign: 'top', fontSize: 13 },
  pill: { display: 'inline-flex', borderRadius: 999, padding: '7px 11px', fontWeight: 900, fontSize: 12, alignItems: 'center', justifyContent: 'center' },
  metric: { fontSize: 32, fontWeight: 950, letterSpacing: '-.04em' },
  notice: { border: '1px solid rgba(147,197,253,.26)', background: 'rgba(37,99,235,.14)', color: '#dbeafe', borderRadius: 18, padding: 16, marginTop: 16 }
}

function Badge({ value, type = 'status' }: { value: string; type?: 'status' | 'level' }) {
  const badge = type === 'level' ? resolveLevelBadge(value) : resolveStatusBadge(value)
  return (
    <span style={{ ...styles.pill, background: badge.background, color: badge.text, border: `1px solid ${badge.border}` }}>
      {badge.label}
    </span>
  )
}

function Metric({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={styles.card}>
      <div style={styles.muted}>{label}</div>
      <div style={styles.metric}>{value}</div>
      {sub && <div style={styles.muted}>{sub}</div>}
    </div>
  )
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function safeFileName(name: string) {
  return `${String(name || 'Mini-Audit').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '-').replace(/^-+|-+$/g, '') || 'Mini-Audit'}-Google-Mini-Audit.pptx`
}

export default function MiniAuditGeneratorClient() {
  const [query, setQuery] = useState('')
  const [placeId, setPlaceId] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [googleData, setGoogleData] = useState<GooglePlacePublicData | null>(null)
  const [audit, setAudit] = useState<MiniAuditResult | null>(null)

  const canExport = useMemo(() => Boolean(googleData && audit), [googleData, audit])

  async function lookup() {
    setLoading(true)
    setError('')
    setAudit(null)
    setGoogleData(null)

    try {
      const response = await fetch('/api/mini-audit/google-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, placeId })
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'Google-Daten konnten nicht geladen werden.')
      setGoogleData(data.googleData)
      setAudit(data.audit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google-Daten konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  async function exportPptx() {
    if (!googleData || !audit) return
    setExporting(true)
    setError('')
    try {
      const response = await fetch('/api/mini-audit/generate-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleData })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'PPTX konnte nicht erzeugt werden.')
      }
      const blob = await response.blob()
      downloadBlob(blob, safeFileName(audit.clientName))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PPTX konnte nicht erzeugt werden.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <section style={styles.hero}>
          <a href="/value-dashboard" style={{ color: '#bfdbfe', textDecoration: 'none' }}>← Zurück zum Value Dashboard</a>
          <p style={{ ...styles.eyebrow, marginTop: 18 }}>Mini Audit Generator · Google-only · keine MMOS-Daten</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 760 }}>
              <h1 style={styles.title}>Automatischer Google Mini-Audit Generator</h1>
              <p style={styles.sub}>
                Erzeugt Mini-Audits ausschließlich aus öffentlich sichtbaren Google-/Maps-Daten: Bewertungsschnitt, Bewertungsanzahl, Profilinformationen, Fotos, Öffnungszeiten und sichtbare Review-Signale.
              </p>
            </div>
            <div style={{ ...styles.card, minWidth: 260 }}>
              <strong>Datenmodus</strong>
              <p style={styles.sub}>Mini Audit: nur Google public data</p>
              <p style={{ ...styles.muted, margin: 0 }}>Normale Audits können später zusätzlich MMOS-Daten einbeziehen.</p>
            </div>
          </div>

          <div style={styles.gridSmall}>
            <label>
              <span style={styles.muted}>Unternehmen + Ort</span>
              <input style={styles.input} placeholder="z. B. Café Milo Schwerin" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label>
              <span style={styles.muted}>Google Place ID optional</span>
              <input style={styles.input} placeholder="optional: ChIJ..." value={placeId} onChange={(event) => setPlaceId(event.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
              <button style={styles.btn} onClick={lookup} disabled={loading}>{loading ? 'Lade Google-Daten ...' : 'Google-Daten analysieren'}</button>
              <button style={styles.btn2} onClick={exportPptx} disabled={!canExport || exporting}>{exporting ? 'Erzeuge PPTX ...' : 'PPTX herunterladen'}</button>
            </div>
          </div>

          {error && <div style={{ ...styles.notice, borderColor: 'rgba(251,113,133,.35)', background: 'rgba(225,29,72,.14)' }}>{error}</div>}
        </section>

        {audit && (
          <>
            <section style={styles.gridSmall}>
              <Metric label="Audit Score" value={`${audit.score}/100`} sub={audit.overallStatus} />
              <Metric label="Ø Bewertung" value={audit.publicSignals.rating ?? '-'} sub="Google public" />
              <Metric label="Bewertungen" value={audit.publicSignals.reviewCount ?? '-'} sub="Google public" />
              <Metric label="Fotos" value={audit.publicSignals.photosCount ?? '-'} sub="Google public" />
            </section>

            <section style={{ ...styles.lightCard, marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ color: '#2563eb', fontWeight: 900, margin: 0 }}>Google-Sichtbarkeitscheck</p>
                  <h2 style={{ fontSize: 38, letterSpacing: '-.04em', margin: '8px 0' }}>{audit.clientName}</h2>
                  <p style={{ color: '#475569', margin: 0 }}>{audit.branch} · {audit.location}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge value={audit.overallStatus} />
                  <p style={{ color: '#64748b' }}>Stand: {audit.auditDate}</p>
                </div>
              </div>
              <p style={{ color: '#334155', fontSize: 16 }}>{audit.overallSummary}</p>
            </section>

            <section style={{ ...styles.lightCard, marginTop: 18 }}>
              <h2>1. Kurz-Check</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Bereich</th>
                      <th style={styles.th}>Automatische Bewertung</th>
                      <th style={styles.th}>Einschätzung</th>
                      <th style={styles.th}>Quelle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.quickCheck.map((item) => (
                      <tr key={item.key}>
                        <td style={styles.td}>{item.area}</td>
                        <td style={styles.td}><Badge value={item.status} /></td>
                        <td style={styles.td}>{item.note}</td>
                        <td style={styles.td}>Google public</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={styles.grid}>
              <div style={styles.lightCard}>
                <h2>2. Die 3 größten Chancen</h2>
                {audit.chances.map((chance, index) => (
                  <div key={chance.title} style={{ borderTop: index ? '1px solid #e2e8f0' : 0, paddingTop: index ? 14 : 0, marginTop: index ? 14 : 0 }}>
                    <strong>{index + 1}. {chance.title}</strong>
                    <p style={{ color: '#475569' }}>{chance.text}</p>
                    <p style={{ color: '#2563eb', fontWeight: 800 }}>Empfehlung: {chance.recommendation}</p>
                  </div>
                ))}
              </div>
              <div style={styles.lightCard}>
                <h2>3. Sofortmaßnahmen</h2>
                {audit.measures.map((measure) => (
                  <div key={measure.title} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center', borderBottom: '1px solid #eef2f7', padding: '10px 0' }}>
                    <span>{measure.title}</span>
                    <Badge value={measure.effort} type="level" />
                    <Badge value={measure.impact} type="level" />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
TS

cat > /mnt/data/repo_files/frontend/src/app/admin/sales/mini-audit-generator/page.tsx <<'TSX'
import MiniAuditGeneratorClient from '@/components/mini-audit/MiniAuditGeneratorClient'

export const metadata = { title: 'Mini Audit Generator · MMOS' }

export default function Page() {
  return <MiniAuditGeneratorClient />
}
