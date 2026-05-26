'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { gmbClient, type GmbPost } from '@/lib/adminToolsClients'

const EMPTY: GmbPost = {
  post_type: 'STANDARD',
  summary: '',
  cta_label: '',
  cta_url: '',
  image_url: ''
}

function statusBadge(status?: string) {
  const cls = status === 'published' ? 'on' : status === 'failed' ? 'off' : ''
  return <span className={`adminBadge ${cls}`}>{status || 'draft'}</span>
}

export default function GmbPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [posts, setPosts] = useState<GmbPost[]>([])
  const [draft, setDraft] = useState<GmbPost>(EMPTY)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh(cid: string) {
    try {
      const r = await gmbClient.list(cid)
      setPosts(r.posts || [])
    } catch (e: any) { setError(e?.message || 'Konnte nicht laden.') }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); setLoading(false); return }
      setAuthorized(true)
      setCustomerId(profile.customer_id || '')
      if (profile.customer_id) await refresh(profile.customer_id)
      setLoading(false)
    })()
  }, [])

  async function create() {
    setBusy(true); setError(''); setInfo('')
    try {
      await gmbClient.create(customerId, draft)
      setDraft(EMPTY)
      setInfo('Entwurf gespeichert.')
      await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Speichern fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function publish(id: string) {
    setBusy(true); setError(''); setInfo('')
    try {
      const r = await gmbClient.publish(customerId, id)
      if (r.post?.error_message) setError(r.post.error_message)
      else setInfo('Post veroeffentlicht.')
      await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Veroeffentlichung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!confirm('Post wirklich loeschen?')) return
    setBusy(true); setError('')
    try {
      await gmbClient.remove(customerId, id)
      await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Loeschen fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  const remaining = 1500 - (draft.summary || '').length

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>Google Business Profile</h1>
        <p>Erstelle und veroeffentliche Posts (Standard, Event, Offer, Alert) direkt aus MMOS auf das verknuepfte Google-Profil deines Kunden.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Neuen Post erstellen</h2>
            <div className="adminGrid2">
              <label className="adminLabel">Typ
                <select className="adminInput" value={draft.post_type} onChange={(e) => setDraft({ ...draft, post_type: e.target.value as GmbPost['post_type'] })}>
                  <option value="STANDARD">Standard-Post</option>
                  <option value="EVENT">Event</option>
                  <option value="OFFER">Angebot</option>
                  <option value="ALERT">Hinweis (Alert)</option>
                </select>
              </label>
              <label className="adminLabel">Geplant fuer (optional)
                <input className="adminInput" type="datetime-local" value={draft.scheduled_at?.slice(0, 16) || ''} onChange={(e) => setDraft({ ...draft, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </label>
            </div>
            <label className="adminLabel">Text (max 1500 Zeichen, mind. 10)
              <textarea className="adminInput" rows={5} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="Was moechtest du verkuenden?" />
              <span className="adminMuted">{remaining} Zeichen uebrig</span>
            </label>
            <div className="adminGrid2">
              <label className="adminLabel">CTA-Label (optional)<input className="adminInput" value={draft.cta_label} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} placeholder="z.B. Jetzt buchen" /></label>
              <label className="adminLabel">CTA-URL (optional)<input className="adminInput" value={draft.cta_url} onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })} placeholder="https://…" /></label>
            </div>
            {(draft.post_type === 'EVENT' || draft.post_type === 'OFFER') && (
              <div className="adminGrid2">
                <label className="adminLabel">Start<input className="adminInput" type="datetime-local" value={draft.start_time?.slice(0, 16) || ''} onChange={(e) => setDraft({ ...draft, start_time: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
                <label className="adminLabel">Ende<input className="adminInput" type="datetime-local" value={draft.end_time?.slice(0, 16) || ''} onChange={(e) => setDraft({ ...draft, end_time: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
              </div>
            )}
            <label className="adminLabel">Bild-URL (optional)<input className="adminInput" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} placeholder="https://…" /></label>
            <button type="button" className="adminBtn" onClick={create} disabled={busy || (draft.summary || '').length < 10}>
              {busy ? 'Speichere …' : 'Als Entwurf speichern'}
            </button>
          </section>

          <section className="adminCard">
            <h2>Posts ({posts.length})</h2>
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && posts.length === 0 && <div className="adminMuted">Noch keine Posts.</div>}
            {!loading && posts.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Typ</th><th>Text</th><th>Status</th><th>Erstellt</th><th></th></tr></thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.post_type}</td>
                      <td>{(p.summary || '').slice(0, 60)}{(p.summary || '').length > 60 ? '…' : ''}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td>{p.created_at?.slice(0, 10)}</td>
                      <td className="adminActions">
                        {p.id && p.status !== 'published' && (
                          <button type="button" className="adminBtn small" onClick={() => publish(p.id!)} disabled={busy}>Veroeffentlichen</button>
                        )}
                        {p.id && (
                          <button type="button" className="adminBtn danger small" onClick={() => remove(p.id!)} disabled={busy}>Loeschen</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  )
}
