'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { BarChart3, Map, LineChart, Swords, RefreshCw } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { storeClient } from '@/lib/storeClient'

type Tab = 'dashboard' | 'heatmap' | 'kpi' | 'competitors'

type SeoSnapshot = {
  id: string
  customer_id: string
  snapshot_date?: string
  visibility?: number
  total_clicks?: number
  total_impressions?: number
  avg_position?: number
  top_keywords?: any[] | null
  heatmap?: any[] | null
  metadata?: Record<string, any>
}

type CompetitorBenchmark = {
  id: string
  customer_id: string
  competitor_name?: string
  visibility?: number
  reviews_count?: number
  avg_rating?: number
  created_at?: string
}

const TABS: Array<{ key: Tab; label: string; icon: any }> = [
  { key: 'dashboard',   label: 'Dashboard',   icon: BarChart3 },
  { key: 'heatmap',     label: 'Heatmap',     icon: Map },
  { key: 'kpi',         label: 'KPI-Trend',   icon: LineChart },
  { key: 'competitors', label: 'Wettbewerber', icon: Swords }
]

function fmtNum(n?: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('de-DE').format(n)
}

function fmtPct(n?: number | null) {
  if (n == null) return '—'
  return `${Math.round(Number(n) * 10) / 10}%`
}

export default function SeoPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [snapshots, setSnapshots] = useState<SeoSnapshot[]>([])
  const [competitors, setCompetitors] = useState<CompetitorBenchmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh(cid: string) {
    setLoading(true); setError('')
    try {
      const [snap, comp] = await Promise.all([
        storeClient.list<SeoSnapshot>('seo_snapshots', { customer_id: cid, limit: 100, order_by: 'snapshot_date', order_dir: 'desc' }).catch(() => ({ data: [] as SeoSnapshot[] })),
        storeClient.list<CompetitorBenchmark>('competitor_benchmarks', { customer_id: cid, limit: 50, order_by: 'visibility', order_dir: 'desc' }).catch(() => ({ data: [] as CompetitorBenchmark[] }))
      ])
      setSnapshots((snap as any).data || [])
      setCompetitors((comp as any).data || [])
    } catch (e: any) {
      setError(e?.message || 'Konnte SEO-Daten nicht laden.')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); setLoading(false); return }
      setAuthorized(true)
      const cid = profile.customer_id || ''
      setCustomerId(cid)
      if (cid) await refresh(cid)
      else setLoading(false)
    })()
  }, [])

  const latest = snapshots[0]
  const previous = snapshots[1]
  const trend = latest && previous && previous.visibility
    ? Math.round(((Number(latest.visibility || 0) - Number(previous.visibility || 0)) / Number(previous.visibility)) * 1000) / 10
    : null

  const heatmapData = (latest?.heatmap || latest?.metadata?.heatmap) as any[] | null
  const allKeywords = latest?.top_keywords || latest?.metadata?.top_keywords || []

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>SEO &amp; Lokale Sichtbarkeit</h1>
        <p>Konsolidierte Sicht auf Dashboard, Heatmap, KPI-Trend und Wettbewerber — ehemals 4 getrennte Module.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}

      {authorized && (
        <>
          <nav className="adminTabs" aria-label="SEO-Bereiche">
            {TABS.map((t) => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  className={active ? 'adminTab active' : 'adminTab'}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(t.key)}
                >
                  <Icon size={14} /> {t.label}
                </button>
              )
            })}
            <span className="adminTabSpacer" />
            <button type="button" className="adminBtn small" onClick={() => customerId && refresh(customerId)} disabled={busy || !customerId}>
              <RefreshCw size={14} /> Neu laden
            </button>
          </nav>

          {!customerId && (
            <section className="adminCard">
              <p className="adminMuted">Dein Konto ist mit keinem Customer verknuepft.</p>
            </section>
          )}

          {customerId && tab === 'dashboard' && (
            <>
              <section className="adminCard">
                <h2>Sichtbarkeit (letzter Snapshot)</h2>
                {loading && <div className="adminMuted">Lade …</div>}
                {!loading && !latest && <div className="adminMuted">Noch keine SEO-Snapshots fuer diesen Customer.</div>}
                {!loading && latest && (
                  <div className="seoGrid">
                    <div className="seoStat">
                      <strong>{fmtPct(latest.visibility)}</strong>
                      <span>Sichtbarkeitsindex</span>
                      {trend != null && (
                        <em className={trend >= 0 ? 'seoTrendUp' : 'seoTrendDown'}>
                          {trend >= 0 ? '+' : ''}{trend}% ggue. Vor-Snapshot
                        </em>
                      )}
                    </div>
                    <div className="seoStat"><strong>{fmtNum(latest.total_clicks)}</strong><span>Klicks (Periode)</span></div>
                    <div className="seoStat"><strong>{fmtNum(latest.total_impressions)}</strong><span>Impressions</span></div>
                    <div className="seoStat"><strong>{latest.avg_position ? Number(latest.avg_position).toFixed(1) : '—'}</strong><span>Ø Position</span></div>
                  </div>
                )}
              </section>

              <section className="adminCard">
                <h2>Top-Keywords</h2>
                {(!allKeywords || allKeywords.length === 0) && <div className="adminMuted">Keine Keyword-Daten vorhanden.</div>}
                {allKeywords && allKeywords.length > 0 && (
                  <table className="adminTable">
                    <thead><tr><th>Keyword</th><th>Position</th><th>Klicks</th></tr></thead>
                    <tbody>
                      {allKeywords.slice(0, 20).map((k: any, i: number) => (
                        <tr key={i}>
                          <td>{k.keyword || k.term || '—'}</td>
                          <td>{k.position != null ? Number(k.position).toFixed(1) : '—'}</td>
                          <td>{fmtNum(k.clicks ?? k.click_count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}

          {customerId && tab === 'heatmap' && (
            <section className="adminCard">
              <h2>Lokale Suchradius-Heatmap</h2>
              {!heatmapData || heatmapData.length === 0 ? (
                <div className="adminMuted">
                  Noch keine Heatmap-Daten. Heatmap-Snapshots werden ueber den Google-Business-Audit-Lauf
                  oder eine SEO-Provider-Integration erzeugt.
                </div>
              ) : (
                <div className="seoHeatmapWrap">
                  <table className="adminTable seoHeatmapTable">
                    <thead><tr><th>Radius / Position</th><th>Treffer</th><th>Ranking</th></tr></thead>
                    <tbody>
                      {heatmapData.map((row: any, i: number) => (
                        <tr key={i}>
                          <td>{row.location || row.lat ? `${row.lat}, ${row.lng}` : `Punkt ${i + 1}`}</td>
                          <td>{fmtNum(row.hits ?? row.results)}</td>
                          <td>{row.rank != null ? `#${row.rank}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="adminMuted">Visualisierung als interaktive Karte folgt in einem Folgesprint (Leaflet + OSM-Tiles, kein Drittland-Map-Provider).</p>
                </div>
              )}
            </section>
          )}

          {customerId && tab === 'kpi' && (
            <section className="adminCard">
              <h2>KPI-Trend ueber Zeit</h2>
              {snapshots.length === 0 && <div className="adminMuted">Noch keine Snapshots.</div>}
              {snapshots.length > 0 && (
                <table className="adminTable">
                  <thead><tr><th>Datum</th><th>Sichtbarkeit</th><th>Klicks</th><th>Impressions</th><th>Ø Position</th></tr></thead>
                  <tbody>
                    {snapshots.slice(0, 30).map((s) => (
                      <tr key={s.id}>
                        <td>{s.snapshot_date ? new Date(s.snapshot_date).toLocaleDateString('de-DE') : '—'}</td>
                        <td>{fmtPct(s.visibility)}</td>
                        <td>{fmtNum(s.total_clicks)}</td>
                        <td>{fmtNum(s.total_impressions)}</td>
                        <td>{s.avg_position ? Number(s.avg_position).toFixed(1) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {customerId && tab === 'competitors' && (
            <section className="adminCard">
              <h2>Wettbewerber im lokalen Markt</h2>
              {competitors.length === 0 && <div className="adminMuted">Keine Wettbewerber-Datensaetze vorhanden.</div>}
              {competitors.length > 0 && (
                <table className="adminTable">
                  <thead><tr><th>Wettbewerber</th><th>Sichtbarkeit</th><th>Bewertungen</th><th>Ø Sterne</th><th>Datum</th></tr></thead>
                  <tbody>
                    {competitors.map((c) => (
                      <tr key={c.id}>
                        <td>{c.competitor_name || '—'}</td>
                        <td>{fmtPct(c.visibility)}</td>
                        <td>{fmtNum(c.reviews_count)}</td>
                        <td>{c.avg_rating ? Number(c.avg_rating).toFixed(2) : '—'}</td>
                        <td>{c.created_at ? new Date(c.created_at).toLocaleDateString('de-DE') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          <p className="adminMuted seoFooter">
            Diese Seite konsolidiert die ehemaligen Monolith-Views <code>seo</code>, <code>heatmap</code>, <code>kpi</code> und <code>competitors</code>
            in einer Tab-Navigation. Alle Daten kommen ueber den neuen Backend-Catch-All-Endpoint <code>/api/store</code>
            (kein direkter Browser-Supabase-Write, keine RLS-Lottery mehr).
          </p>
        </>
      )}
    </main>
  )
}
