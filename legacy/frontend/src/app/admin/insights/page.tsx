'use client'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import {
  insightsClient,
  type ComplianceSnapshot,
  type ClvSegment,
  type CohortSnapshot
} from '@/lib/insightsClient'

export const dynamic = 'force-dynamic'

function formatEur(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(n))
}

function scoreColor(score: number) {
  if (score >= 80) return 'var(--semantic-success-fg)'
  if (score >= 60) return 'var(--semantic-warn-fg)'
  return 'var(--semantic-danger-fg)'
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState<string>('')
  const [compliance, setCompliance] = useState<ComplianceSnapshot | null>(null)
  const [clv, setClv] = useState<ClvSegment[]>([])
  const [cohorts, setCohorts] = useState<CohortSnapshot[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refreshCompliance() {
    try {
      const r = await insightsClient.compliance()
      setCompliance(r.snapshot)
    } catch (e: any) {
      setError(e?.message || 'Compliance-Daten konnten nicht geladen werden.')
    }
  }

  async function refreshCustomerData(id: string) {
    if (!id) return
    setBusy(true)
    setError('')
    try {
      const [c, k] = await Promise.all([
        insightsClient.cohorts(id, 'loyalty_signup', 6).catch(() => ({ ok: false, cohorts: [] })),
        insightsClient.clv(id).catch(() => ({ ok: false, segments: [] }))
      ])
      setCohorts(c.cohorts || [])
      setClv(k.segments || [])
    } catch (e: any) {
      setError(e?.message || 'Customer-Daten konnten nicht geladen werden.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) {
        setAuthorized(false)
        setLoading(false)
        return
      }
      setAuthorized(true)
      const cid = profile.customer_id || ''
      setCustomerId(cid)
      await refreshCompliance()
      if (cid) await refreshCustomerData(cid)
      setLoading(false)
    })()
  }, [])

  return (
    <main className="insightsPage">
      <header className="insightsHeader">
        <h1>Insights</h1>
        <p>
          Konsolidierter Blick auf Compliance, Customer-Lifetime-Value, Cohort-Retention und
          Peer-Benchmark. Werte werden bei Bedarf neu berechnet.
        </p>
      </header>

      {authorized === false && (
        <div className="insightsNotice">
          <b>Admin-Zugriff erforderlich.</b>
          <p>Bitte melde dich mit einem berechtigten Konto an.</p>
        </div>
      )}

      {error && <div className="insightsAlert">{error}</div>}

      {authorized && (
        <>
          <section className="insightsCard">
            <h2>Compliance-Score</h2>
            {!compliance ? (
              <div className="insightsMuted">{loading ? 'Lade …' : 'Keine Daten.'}</div>
            ) : (
              <div className="insightsGrid">
                <div className="insightsBigStat" style={{ color: scoreColor(compliance.compliance_score) }}>
                  {compliance.compliance_score}<span>/100</span>
                </div>
                <ul className="insightsList">
                  <li><b>Verarbeitungstaetigkeiten:</b> {compliance.art30.activities_active}</li>
                  <li>
                    <b>Auftragsverarbeiter:</b> {compliance.processors.total} (davon{' '}
                    {compliance.processors.non_eu} Non-EU, {compliance.processors.scc_required} mit SCC)
                  </li>
                  <li>
                    <b>DSAR offen / in Bearbeitung / erledigt:</b>{' '}
                    {compliance.dsar.open} / {compliance.dsar.in_progress} / {compliance.dsar.done}
                  </li>
                  <li>
                    <b>MFA-Abdeckung:</b> {compliance.mfa.coverage_pct}% (
                    {compliance.mfa.admins_enrolled}/{compliance.mfa.admins_total} Admins)
                  </li>
                  <li>
                    <b>Newsletter-Consent:</b> {compliance.consent.newsletter_active} aktiv,{' '}
                    {compliance.consent.newsletter_pending} pending,{' '}
                    {compliance.consent.newsletter_unsubscribed} unsubscribed
                  </li>
                  <li>
                    <b>Security-Events letzte 30 Tage:</b> {compliance.security.events_last_30d}
                  </li>
                </ul>
              </div>
            )}
          </section>

          <section className="insightsCard">
            <h2>Customer Lifetime Value pro Segment</h2>
            {!customerId && <div className="insightsMuted">Kein Customer mit deinem Konto verknuepft.</div>}
            {customerId && (
              <>
                {busy && <div className="insightsMuted">Berechne …</div>}
                {!busy && clv.length === 0 && <div className="insightsMuted">Noch keine Daten.</div>}
                {!busy && clv.length > 0 && (
                  <table className="insightsTable">
                    <thead>
                      <tr>
                        <th>Segment</th><th>Mitglieder</th><th>&Oslash; Umsatz</th><th>Median</th><th>Lifetime (Tage)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clv.map((s) => (
                        <tr key={s.segment_key}>
                          <td>{s.segment_label}</td>
                          <td>{s.member_count}</td>
                          <td>{formatEur(s.avg_revenue_eur)}</td>
                          <td>{formatEur(s.median_revenue_eur)}</td>
                          <td>{s.avg_lifetime_days ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <button
                  type="button"
                  className="insightsBtn"
                  onClick={() => refreshCustomerData(customerId)}
                  disabled={busy}
                >
                  Neu berechnen
                </button>
              </>
            )}
          </section>

          <section className="insightsCard">
            <h2>Cohort-Retention (letzte 6 Monate)</h2>
            {customerId && (
              <>
                {busy && <div className="insightsMuted">Berechne …</div>}
                {!busy && cohorts.length === 0 && (
                  <div className="insightsMuted">Noch keine Cohort-Daten.</div>
                )}
                {!busy && cohorts.length > 0 && (
                  <table className="insightsTable">
                    <thead>
                      <tr>
                        <th>Cohort-Monat</th>
                        <th>Groesse</th>
                        <th>m1</th><th>m2</th><th>m3</th><th>m6</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohorts.map((c) => (
                        <tr key={c.cohort_month}>
                          <td>{c.cohort_month?.slice(0, 7)}</td>
                          <td>{c.cohort_size}</td>
                          <td>{c.retention?.m1 ?? '—'}%</td>
                          <td>{c.retention?.m2 ?? '—'}%</td>
                          <td>{c.retention?.m3 ?? '—'}%</td>
                          <td>{c.retention?.m6 ?? '—'}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </section>

          <footer className="insightsFooter">
            <p>
              Hinweis: Diese Daten sind Snapshots, die auf Knopfdruck neu erzeugt werden. Fuer
              kontinuierliche Ueberwachung empfehlen wir die Workflow-Engine (
              <a href="/admin/automations">Workflows</a>).
            </p>
          </footer>
        </>
      )}
    </main>
  )
}
