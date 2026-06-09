'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { Megaphone, Sparkles, Check, Save } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { storeClient } from '@/lib/storeClient'
import { socialClient, type SocialPlatform, type SocialPost } from '@/lib/deToolsClients'

const PLATFORMS: Array<{ key: SocialPlatform; label: string }> = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'google_post', label: 'Google Post' },
  { key: 'linkedin', label: 'LinkedIn' }
]

export default function SocialPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [platform, setPlatform] = useState<SocialPlatform>('instagram')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('')
  const [count, setCount] = useState(3)
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [provider, setProvider] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); return }
      setAuthorized(true)
      const role = String(profile.role || '').toLowerCase()
      setIsAdmin(role === 'admin' || role === 'super_admin')
      setCustomerId(profile.customer_id || '')
    })()
  }, [])

  function flash(m: string) { setInfo(m); setTimeout(() => setInfo(''), 3000) }

  async function generate() {
    setBusy(true); setError(''); setPosts([])
    try {
      const r = await socialClient.generate({ customer_id: customerId || undefined, platform, topic: topic.trim(), tone: tone.trim() || undefined, count })
      setPosts(r.posts || [])
      setProvider(r.provider)
      if (r.provider === 'mock') flash('Hinweis: Kein AI-Provider konfiguriert — Beispiel-Varianten (Mock).')
    } catch (e: any) { setError(e?.message || 'Generierung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function saveDraft(p: SocialPost) {
    if (!customerId) { setError('Kein Customer zugeordnet — Speichern nicht moeglich.'); return }
    setBusy(true); setError('')
    try {
      await storeClient.create('social_posts', {
        customer_id: customerId, platform, topic: topic.trim() || null, tone: tone.trim() || null,
        content: p.text, hashtags: p.hashtags, status: 'draft'
      })
      flash('Als Entwurf gespeichert.')
    } catch (e: any) { setError(e?.message || 'Speichern fehlgeschlagen (Migration 0084 angewendet?).') }
    finally { setBusy(false) }
  }

  async function copy(p: SocialPost) {
    const full = [p.text, p.hashtags?.join(' ')].filter(Boolean).join('\n\n')
    try { await navigator.clipboard.writeText(full); flash('Kopiert.') } catch (_) {}
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><Megaphone size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> AI Social-Post-Generator</h1>
        <p>Erzeuge Social-Media-Posts im Markenton — fuer Instagram, Facebook, Google Posts und LinkedIn. Brand-Voice wird automatisch aus dem Customer geladen.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {authorized && !isAdmin && <div className="adminNotice">Die Generierung ist nur fuer Admins verfuegbar.</div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Post generieren</h2>
            <div className="adminGrid2">
              <label className="adminLabel">Plattform
                <select className="adminInput" value={platform} onChange={(e) => setPlatform(e.target.value as SocialPlatform)}>
                  {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </label>
              <label className="adminLabel">Anzahl Varianten
                <select className="adminInput" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <label className="adminLabel">Thema / Anlass<input className="adminInput" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="z.B. Sommer-Aktion, Neueroeffnung, freie Termine diese Woche" /></label>
            <label className="adminLabel">Tonfall (optional, ueberschreibt Brand-Voice)<input className="adminInput" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="z.B. locker und humorvoll" /></label>
            <button type="button" className="adminBtn" onClick={generate} disabled={busy || !isAdmin}>
              <Sparkles size={14} /> {busy ? 'Generiere …' : 'Posts generieren'}
            </button>
          </section>

          {posts.length > 0 && (
            <section className="adminCard">
              <h2>Vorschlaege {provider && <span className="adminMuted">({provider})</span>}</h2>
              {posts.map((p, i) => (
                <div key={i} className="adminCard" style={{ marginTop: 10 }}>
                  <textarea className="adminInput" readOnly rows={4} value={p.text} />
                  {p.hashtags?.length > 0 && <p className="adminMuted" style={{ marginTop: 6 }}>{p.hashtags.join(' ')}</p>}
                  <div className="adminActions" style={{ marginTop: 6 }}>
                    <button type="button" className="adminBtn small" onClick={() => copy(p)}><Check size={12} /> Kopieren</button>
                    <button type="button" className="adminBtn small" onClick={() => saveDraft(p)} disabled={busy || !customerId}><Save size={12} /> Als Entwurf speichern</button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  )
}
