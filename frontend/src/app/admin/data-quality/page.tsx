'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Database, Users, Mail, Sparkles, Search, GitMerge, Check } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { getAdminSelectedCustomerId, onAdminCustomerSelected } from '@/lib/adminCustomerSelection'
import { storeClient } from '@/lib/storeClient'
import { dataQualityClient, type DuplicateCluster, type EmailValidation, type ReviewResponseSuggestion } from '@/lib/deToolsClients'

type Tab = 'duplicates' | 'email' | 'ai_review'
const TABS: Array<{ key: Tab; label: string; icon: any }> = [
  { key: 'duplicates', label: 'Dubletten', icon: Users },
  { key: 'email', label: 'E-Mail-Check', icon: Mail },
  { key: 'ai_review', label: 'AI-Review-Antwort', icon: Sparkles }
]

type ReviewRow = { id: string; customer_id?: string; rating?: number; feedback_text?: string; author_name?: string; source?: string; created_at?: string }

export default function DataQualityPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [tab, setTab] = useState<Tab>('duplicates')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Dubletten
  const [clusters, setClusters] = useState<DuplicateCluster[]>([])
  const [primary, setPrimary] = useState<Record<number, string>>({})
  const [mergeSel, setMergeSel] = useState<Record<number, Set<string>>>({})

  // E-Mail
  const [email, setEmail] = useState('')
  const [emailResult, setEmailResult] = useState<EmailValidation | null>(null)

  // AI-Review
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [suggestions, setSuggestions] = useState<ReviewResponseSuggestion[]>([])
  const [activeReview, setActiveReview] = useState('')
  const [customerNames, setCustomerNames] = useState<Record<string,string>>({})

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const profile = await getCurrentUserProfile()
      if (!mounted) return
      if (!profile) { setAuthorized(false); return }
      setAuthorized(true)
      const role = String(profile.role || '').toLowerCase()
      const admin = role === 'admin' || role === 'super_admin'
      setIsAdmin(admin)
      setCustomerId(profile.customer_id || (admin ? getAdminSelectedCustomerId() : '') || '')
      if (admin) {
        try {
          const r = await storeClient.list<any>('customers', { limit: 300, order_by: 'created_at', order_dir: 'desc' })
          const map: Record<string,string> = {}
          ;((r as any).data || []).forEach((c:any) => { map[c.id] = c.name || c.email || c.id })
          if (mounted) setCustomerNames(map)
        } catch {}
      }
    })()
    const off = onAdminCustomerSelected((cid) => { setCustomerId(cid); if (tab === 'ai_review') void loadReviews(cid) })
    return () => { mounted = false; off() }
  }, [])

  function flash(m: string) { setInfo(m); setTimeout(() => setInfo(''), 4000) }

  async function findDuplicates() {
    setBusy(true); setError(''); setClusters([])
    try {
      const r = await dataQualityClient.findDuplicates(0.8, 500)
      setClusters(r.clusters || [])
      const p: Record<number, string> = {}
      ;(r.clusters || []).forEach((c, i) => { if (c.records?.[0]) p[i] = c.records[0].id })
      setPrimary(p); setMergeSel({})
      if ((r.clusters || []).length === 0) flash('Keine Dubletten ueber dem Schwellwert gefunden.')
    } catch (e: any) { setError(e?.message || 'Dublettensuche fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  function toggleMerge(ci: number, id: string) {
    setMergeSel((prev) => {
      const next = { ...prev }
      const set = new Set(next[ci] || [])
      if (set.has(id)) set.delete(id); else set.add(id)
      next[ci] = set
      return next
    })
  }

  async function doMerge(ci: number) {
    const primaryId = primary[ci]
    const ids = Array.from(mergeSel[ci] || []).filter((id) => id !== primaryId)
    if (!primaryId || ids.length === 0) { setError('Bitte Haupt-Datensatz und mind. einen Merge-Datensatz waehlen.'); return }
    if (!confirm(`${ids.length} Datensatz/-saetze in ${primaryId.slice(0, 8)} zusammenfuehren? Das ist nicht umkehrbar.`)) return
    setBusy(true); setError('')
    try {
      await dataQualityClient.merge(primaryId, ids)
      flash('Zusammengefuehrt.')
      setClusters((prev) => prev.filter((_, i) => i !== ci))
    } catch (e: any) { setError(e?.message || 'Merge fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function checkEmail() {
    setBusy(true); setError(''); setEmailResult(null)
    try {
      const r = await dataQualityClient.validateEmail(email.trim())
      setEmailResult(r.validation)
    } catch (e: any) { setError(e?.message || 'Validierung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function loadReviews(selectedCustomerId = customerId) {
    setBusy(true); setError('')
    try {
      const q: any = { limit: 50, order_by: 'created_at', order_dir: 'desc' }
      if (selectedCustomerId) q.customer_id = selectedCustomerId
      const r = await storeClient.list<ReviewRow>('review_feedback', q)
      setReviews((r as any).data || [])
    } catch (e: any) { setError(e?.message || 'Reviews konnten nicht geladen werden.') }
    finally { setBusy(false) }
  }

  async function generate(reviewId: string) {
    setActiveReview(reviewId); setBusy(true); setError(''); setSuggestions([])
    try {
      const r = await dataQualityClient.aiReviewResponse(reviewId)
      setSuggestions(r.suggestions || r.responses || [])
      if ((r.suggestions || r.responses || []).length === 0) flash('Keine Vorschlaege erhalten (AI-Provider evtl. nicht konfiguriert).')
    } catch (e: any) { setError(e?.message || 'Generierung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  useEffect(() => { if (authorized && tab === 'ai_review' && reviews.length === 0) loadReviews() /* eslint-disable-line */ }, [tab, authorized])

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><Database size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Datenqualitaet</h1>
        <p>Dubletten finden &amp; zusammenfuehren, E-Mail-Adressen pruefen und KI-Antworten auf Bewertungen erzeugen.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && (
        <>
          <nav className="adminTabs" aria-label="Datenqualitaet-Bereiche">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.key} type="button" className={tab === t.key ? 'adminTab active' : 'adminTab'}
                  aria-current={tab === t.key ? 'page' : undefined} onClick={() => setTab(t.key)}>
                  <Icon size={14} /> {t.label}
                </button>
              )
            })}
          </nav>

          {tab === 'duplicates' && (
            <section className="adminCard">
              {!isAdmin && <div className="adminNotice">Dubletten-Scan &amp; Merge sind nur fuer Admins verfuegbar.</div>}
              <div className="adminActions">
                <button type="button" className="adminBtn" onClick={findDuplicates} disabled={busy || !isAdmin}><Search size={14} /> {busy ? 'Suche …' : 'Dubletten suchen'}</button>
              </div>
              {clusters.length === 0 && <div className="adminMuted">Noch kein Scan ausgefuehrt.</div>}
              {clusters.map((c, ci) => (
                <div key={ci} className="adminCard" style={{ marginTop: 12 }}>
                  <div className="adminCardListHead">
                    <b>Cluster #{ci + 1}</b>
                    <span className="adminBadge">{Math.round((c.confidence || 0) * 100)}% Aehnlichkeit</span>
                  </div>
                  {c.reason && <div className="adminMuted">{c.reason}</div>}
                  <table className="adminTable adminDesktopTable">
                    <thead><tr><th>Haupt</th><th>Merge</th><th>Name</th><th>E-Mail</th><th>Telefon</th><th>PLZ/Ort</th></tr></thead>
                    <tbody>
                      {c.records.map((r) => (
                        <tr key={r.id}>
                          <td><input type="radio" name={`primary-${ci}`} checked={primary[ci] === r.id} onChange={() => setPrimary({ ...primary, [ci]: r.id })} /></td>
                          <td><input type="checkbox" checked={mergeSel[ci]?.has(r.id) || false} disabled={primary[ci] === r.id} onChange={() => toggleMerge(ci, r.id)} /></td>
                          <td>{r.name || '—'}</td>
                          <td>{r.email || '—'}</td>
                          <td>{r.phone || '—'}</td>
                          <td>{[r.postal_code, r.city].filter(Boolean).join(' ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="adminMobileCardList">
                    {c.records.map((r) => (
                      <article key={r.id} className="adminMobileDataCard">
                        <div><span>Name</span><strong>{r.name || '—'}</strong></div>
                        <div><span>E-Mail</span><strong>{r.email || '—'}</strong></div>
                        <div><span>Telefon</span><strong>{r.phone || '—'}</strong></div>
                        <p>{[r.postal_code, r.city].filter(Boolean).join(' ') || 'Kein Ort hinterlegt'}</p>
                        <div className="adminMobileCardActions">
                          <label><input type="radio" name={`mobile-primary-${ci}`} checked={primary[ci] === r.id} onChange={() => setPrimary({ ...primary, [ci]: r.id })} /> Hauptdatensatz</label>
                          <label><input type="checkbox" checked={mergeSel[ci]?.has(r.id) || false} disabled={primary[ci] === r.id} onChange={() => toggleMerge(ci, r.id)} /> mergen</label>
                        </div>
                      </article>
                    ))}
                  </div>
                  <button type="button" className="adminBtn small mobileWideBtn" onClick={() => doMerge(ci)} disabled={busy}><GitMerge size={12} /> Zusammenfuehren</button>
                </div>
              ))}
            </section>
          )}

          {tab === 'email' && (
            <section className="adminCard">
              <h2>E-Mail-Validierung</h2>
              <label className="adminLabel">E-Mail-Adresse<input className="adminInput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@beispiel.de" /></label>
              <button type="button" className="adminBtn" onClick={checkEmail} disabled={busy || !email.includes('@')}>Pruefen</button>
              {emailResult && (
                <div className="adminCard" style={{ marginTop: 12 }}>
                  <div className="adminCardListHead">
                    <b>{emailResult.email}</b>
                    <span className={`adminBadge ${emailResult.valid ? 'on' : 'off'}`}>{emailResult.valid ? 'gueltig' : 'ungueltig'}</span>
                  </div>
                  <ul className="adminMuted" style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                    {emailResult.mx != null && <li>MX-Eintrag: {emailResult.mx ? 'vorhanden' : 'fehlt'}</li>}
                    {emailResult.disposable != null && <li>Wegwerf-Adresse: {emailResult.disposable ? 'ja' : 'nein'}</li>}
                    {emailResult.reason && <li>{emailResult.reason}</li>}
                  </ul>
                </div>
              )}
            </section>
          )}

          {tab === 'ai_review' && (
            <section className="adminCard">
              <div className="adminActions">
                <h2 style={{ margin: 0 }}>Bewertungen</h2>
                <span className="adminTabSpacer" />
                <button type="button" className="adminBtn small" onClick={loadReviews} disabled={busy}>Neu laden</button>
              </div>
              {!isAdmin && <div className="adminNotice">AI-Antwort-Generierung ist nur fuer Admins verfuegbar.</div>}
              {!customerId && isAdmin && <div className="adminNotice">Kein Kundenfilter aktiv. Es werden beim Laden globale Review-Feedbacks aus der Tabelle <code>review_feedback</code> angezeigt. Wähle oben einen Kunden, um die Quelle eindeutig einzugrenzen.</div>}
              {reviews.length === 0 && <div className="adminMuted">Keine Bewertungen geladen. Quelle: <code>review_feedback</code>.</div>}
              {reviews.length > 0 && (
                <table className="adminTable adminDesktopTable">
                  <thead><tr><th>Rating</th><th>Quelle/Kunde</th><th>Feedback</th><th>Datum</th><th></th></tr></thead>
                  <tbody>
                    {reviews.map((r) => (
                      <tr key={r.id}>
                        <td>{r.rating != null ? `${r.rating}★` : '—'}</td>
                        <td>{customerNames[r.customer_id || ''] || r.customer_id || r.source || 'review_feedback'}</td>
                        <td>{(r.feedback_text || '').slice(0, 120) || '—'}</td>
                        <td>{(r.created_at || '').slice(0, 10)}</td>
                        <td><button type="button" className="adminBtn small" onClick={() => generate(r.id)} disabled={busy || !isAdmin}><Sparkles size={12} /> Antwort</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {reviews.length > 0 && (
                <div className="adminMobileCardList">
                  {reviews.map((r) => (
                    <article className="adminMobileDataCard" key={`mobile-${r.id}`}>
                      <div><span>Rating</span><strong>{r.rating != null ? `${r.rating}★` : '—'}</strong></div>
                      <div><span>Quelle/Kunde</span><strong>{customerNames[r.customer_id || ''] || r.customer_id || r.source || 'review_feedback'}</strong></div>
                      <p>{r.feedback_text || 'Kein Feedbacktext'}</p>
                      <small>{(r.created_at || '').slice(0, 10) || 'Kein Datum'}</small>
                      <button type="button" className="adminBtn small mobileWideBtn" onClick={() => generate(r.id)} disabled={busy || !isAdmin}><Sparkles size={12} /> Antwort erzeugen</button>
                    </article>
                  ))}
                </div>
              )}
              {activeReview && suggestions.length > 0 && (
                <div className="adminCard" style={{ marginTop: 12 }}>
                  <h3 style={{ marginTop: 0 }}>Antwort-Vorschlaege</h3>
                  {suggestions.map((s, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      {s.tone && <div className="adminMuted">{s.tone}</div>}
                      <div className="adminCode" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55, padding: 12 }}>{s.text}</div>
                      <button type="button" className="adminBtn small" style={{ marginTop: 4 }} onClick={async () => { try { await navigator.clipboard.writeText(s.text); flash('Kopiert.') } catch (_) {} }}><Check size={12} /> Kopieren</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  )
}
