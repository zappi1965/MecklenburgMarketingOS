'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { widgetClient, type ReviewWidget } from '@/lib/adminToolsClients'

const EMPTY: ReviewWidget = {
  slug: '',
  show_count: 5,
  min_rating: 4,
  theme: { primary: '#d4af37', background: '#ffffff', text: '#111827' },
  active: true
}

export default function WidgetPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [widgets, setWidgets] = useState<ReviewWidget[]>([])
  const [draft, setDraft] = useState<ReviewWidget>(EMPTY)
  const [origin, setOrigin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh(cid: string) {
    try {
      const r = await widgetClient.list(cid)
      setWidgets(r.widgets || [])
    } catch (e: any) { setError(e?.message || 'Konnte nicht laden.') }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
    ;(async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); return }
      setAuthorized(true)
      setCustomerId(profile.customer_id || '')
      if (profile.customer_id) await refresh(profile.customer_id)
    })()
  }, [])

  async function save() {
    setBusy(true); setError('')
    try {
      await widgetClient.create(customerId, draft)
      setDraft(EMPTY)
      await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Speichern fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function toggleActive(w: ReviewWidget) {
    if (!w.id) return
    setBusy(true)
    try {
      await widgetClient.update(customerId, w.id, { active: !w.active })
      await refresh(customerId)
    } catch (e: any) { setError(e?.message || 'Update fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  const previewSlug = draft.slug || 'preview'
  const previewUrl = origin ? `${origin}/api/review-widget/embed/${previewSlug}` : ''
  const embedSnippet = useMemo(() =>
    `<iframe src="${previewUrl}" style="border:0;width:100%;height:520px" loading="lazy" title="Bewertungen"></iframe>`,
    [previewUrl]
  )

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text) } catch {}
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>Bewertungs-Widget</h1>
        <p>Erstelle ein iframe-Snippet, das du auf deine Website einbettest. Es zeigt deine besten Bewertungen automatisch aktualisiert.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Neues Widget konfigurieren</h2>
            <div className="adminGrid2">
              <label className="adminLabel">Slug (Pfad-Bestandteil)<input className="adminInput" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="meine-website" /></label>
              <label className="adminLabel">Anzahl Bewertungen<input className="adminInput" type="number" min={1} max={20} value={draft.show_count} onChange={(e) => setDraft({ ...draft, show_count: Number(e.target.value) })} /></label>
            </div>
            <div className="adminGrid2">
              <label className="adminLabel">Mindest-Sterne<input className="adminInput" type="number" min={1} max={5} value={draft.min_rating} onChange={(e) => setDraft({ ...draft, min_rating: Number(e.target.value) })} /></label>
              <label className="adminLabel">Aktiv
                <input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              </label>
            </div>
            <div className="adminGrid2">
              <label className="adminLabel">Akzentfarbe (Sterne)<input className="adminInput" type="color" value={draft.theme.primary || '#d4af37'} onChange={(e) => setDraft({ ...draft, theme: { ...draft.theme, primary: e.target.value } })} /></label>
              <label className="adminLabel">Hintergrund<input className="adminInput" type="color" value={draft.theme.background || '#ffffff'} onChange={(e) => setDraft({ ...draft, theme: { ...draft.theme, background: e.target.value } })} /></label>
            </div>
            <button type="button" className="adminBtn" onClick={save} disabled={busy || !draft.slug}>{busy ? 'Speichere …' : 'Widget anlegen'}</button>
          </section>

          {previewUrl && (
            <section className="adminCard">
              <h2>Embed-Snippet</h2>
              <p className="adminMuted">Kopiere diesen Code in deine Website (Footer, About-Page oder Bewertungs-Sektion):</p>
              <pre className="adminCode">{embedSnippet}</pre>
              <div className="adminActions">
                <button type="button" className="adminBtn" onClick={() => copy(embedSnippet)}>iframe-Code kopieren</button>
                <button type="button" className="adminBtn small" onClick={() => copy(previewUrl)}>Direktlink kopieren</button>
                {draft.slug && <a className="adminBtn small" href={previewUrl} target="_blank" rel="noreferrer">Live-Vorschau</a>}
              </div>
            </section>
          )}

          <section className="adminCard">
            <h2>Vorhandene Widgets ({widgets.length})</h2>
            {widgets.length === 0 && <div className="adminMuted">Noch keine Widgets.</div>}
            {widgets.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Slug</th><th>Reviews</th><th>Min. Sterne</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {widgets.map((w) => (
                    <tr key={w.id}>
                      <td><code>{w.slug}</code></td>
                      <td>{w.show_count}</td>
                      <td>{w.min_rating}+</td>
                      <td>{w.active ? <span className="adminBadge on">aktiv</span> : <span className="adminBadge off">inaktiv</span>}</td>
                      <td><button type="button" className="adminBtn small" onClick={() => toggleActive(w)} disabled={busy}>{w.active ? 'Deaktivieren' : 'Aktivieren'}</button></td>
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
