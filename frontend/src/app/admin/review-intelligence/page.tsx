'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Gauge, RefreshCw } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { getAdminSelectedCustomerId, onAdminCustomerSelected } from '@/lib/adminCustomerSelection'
import { reviewIntelligenceClient } from '@/lib/reviewIntelligenceClient'

type Item = { id: string; rating?: number; sentiment?: string; summary?: string; feedback_text?: string; created_at?: string }
type Template = { id: string; name?: string; sentiment?: string; body?: string; content?: string }

function sentimentBadge(s?: string) {
  const v = String(s || '').toLowerCase()
  if (v === 'positive') return 'on'
  if (v === 'negative') return 'off'
  return ''
}

export default function ReviewIntelligencePage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [items, setItems] = useState<Item[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function load(cid: string) {
    setLoading(true); setError('')
    try {
      const [p, it, tpl] = await Promise.all([
        reviewIntelligenceClient.profile(cid).catch(() => ({ profile: null })),
        reviewIntelligenceClient.items(cid).catch(() => ({ items: [] })),
        reviewIntelligenceClient.templates(cid).catch(() => ({ templates: [] }))
      ])
      setProfile((p as any).profile || null)
      setItems((it as any).items || [])
      setTemplates((tpl as any).templates || [])
    } catch (e: any) { setError(e?.message || 'Konnte Daten nicht laden.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const p = await getCurrentUserProfile()
      if (!mounted) return
      if (!p) { setAuthorized(false); setLoading(false); return }
      const role = String(p.role || '').toLowerCase()
      const admin = role === 'admin' || role === 'super_admin'
      setIsAdmin(admin)
      setAuthorized(true)
      const cid = p.customer_id || (admin ? getAdminSelectedCustomerId() : '') || ''
      setCustomerId(cid)
      if (cid) await load(cid); else setLoading(false)
    })()
    const off = onAdminCustomerSelected((cid) => {
      setCustomerId(cid)
      if (cid) void load(cid)
    })
    return () => { mounted = false; off() }
  }, [])

  async function rebuild() {
    setBusy(true); setError(''); setInfo('')
    try {
      const r = await reviewIntelligenceClient.rebuildProfile(customerId)
      setProfile((r as any).profile || null)
      setInfo('Sentiment-Profil neu aufgebaut.')
      await load(customerId)
    } catch (e: any) { setError(e?.message || 'Neuaufbau fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  const profileNums = profile ? Object.entries(profile).filter(([k, v]) => typeof v === 'number' && !/id$/i.test(k)) : []

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><Gauge size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Review Intelligence</h1>
        <p>Sentiment-Profil, analysierte Bewertungen und Antwortvorlagen — Grundlage fuer schnelle, markenkonforme Reaktionen.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {authorized && !customerId && <section className="adminCard"><p className="adminMuted">{isAdmin ? 'Bitte oben in der Backoffice-Kundensuche einen Kunden wählen.' : 'Dein Konto ist mit keinem Customer verknuepft.'}</p></section>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && customerId && (
        <>
          <section className="adminCard">
            <div className="adminActions">
              <h2 style={{ margin: 0 }}>Sentiment-Profil</h2>
              <span className="adminTabSpacer" />
              <button type="button" className="adminBtn small" onClick={rebuild} disabled={busy}><RefreshCw size={14} /> Neu aufbauen</button>
            </div>
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && !profile && <div className="adminMuted">Noch kein Profil — klick „Neu aufbauen".</div>}
            {!loading && profile && profileNums.length > 0 && (
              <div className="seoGrid">
                {profileNums.slice(0, 8).map(([k, v]) => (
                  <div className="seoStat" key={k}><strong>{Math.round(Number(v) * 100) / 100}</strong><span>{k.replace(/_/g, ' ')}</span></div>
                ))}
              </div>
            )}
          </section>

          <section className="adminCard">
            <h2>Analysierte Bewertungen ({items.length})</h2>
            {items.length === 0 && <div className="adminMuted">Keine analysierten Bewertungen.</div>}
            {items.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Rating</th><th>Sentiment</th><th>Zusammenfassung</th><th>Datum</th></tr></thead>
                <tbody>
                  {items.slice(0, 50).map((it) => (
                    <tr key={it.id}>
                      <td>{it.rating != null ? `${it.rating}★` : '—'}</td>
                      <td><span className={`adminBadge ${sentimentBadge(it.sentiment)}`}>{it.sentiment || '—'}</span></td>
                      <td>{(it.summary || it.feedback_text || '').slice(0, 80) || '—'}</td>
                      <td>{(it.created_at || '').slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="adminCard">
            <h2>Antwortvorlagen ({templates.length})</h2>
            {templates.length === 0 && <div className="adminMuted">Keine Vorlagen hinterlegt.</div>}
            {templates.length > 0 && (
              <ul className="adminCardList">
                {templates.map((t) => (
                  <li key={t.id} className="adminCardListItem">
                    <div className="adminCardListMain">
                      <div className="adminCardListHead">
                        <b>{t.name || 'Vorlage'}</b>
                        {t.sentiment && <span className={`adminBadge ${sentimentBadge(t.sentiment)}`}>{t.sentiment}</span>}
                      </div>
                      <p className="adminMuted">{(t.body || t.content || '').slice(0, 160)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  )
}
