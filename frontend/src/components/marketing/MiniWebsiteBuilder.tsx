'use client'

import { useEffect, useState } from 'react'
import ToolAccessGate from '@/components/security/ToolAccessGate'
import { getCurrentUserProfile } from '@/lib/authClient'
import { miniWebsiteClient, MiniWebsite } from '@/lib/miniWebsiteClient'
import { publicQrImage, absolutePublicUrl, copyToClipboard } from '@/lib/shareQr'

function linesToServices(text: string) {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, price] = l.split('|').map((p) => p.trim())
    return { name, price: price || '' }
  })
}
function servicesToLines(services: any[] = []) {
  return services.map((s) => `${s.name || ''}${s.price ? ' | ' + s.price : ''}`).join('\n')
}

export default function MiniWebsiteBuilder() {
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [site, setSite] = useState<MiniWebsite | null>(null)
  const [servicesText, setServicesText] = useState('')
  const [auditQuery, setAuditQuery] = useState('')
  const [booster, setBooster] = useState<any>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    const profile: any = await getCurrentUserProfile()
    const cid = profile?.customer_id
    if (!cid) return
    setCustomerId(cid)
    const res = await miniWebsiteClient.get(cid)
    setSite(res.site)
    setServicesText(servicesToLines(res.site.services))
    setBooster(res.site.booster_state || null)
  }
  useEffect(() => { void load() }, [])

  function patch(p: Partial<MiniWebsite>) { setSite((s) => (s ? { ...s, ...p } : s)) }

  async function save() {
    if (!customerId || !site) return
    setBusy(true); setMsg(null)
    try {
      const res = await miniWebsiteClient.save(customerId, {
        enabled: site.enabled,
        brand: site.brand,
        hero: site.hero,
        cta: site.cta,
        show_reviews: site.show_reviews,
        services: linesToServices(servicesText),
        hours: site.hours
      })
      setSite(res.site)
      setMsg('Gespeichert.')
    } catch (e: any) { setMsg(e?.message || 'Speichern fehlgeschlagen.') } finally { setBusy(false) }
  }

  async function runBooster() {
    if (!customerId || !auditQuery.trim()) return
    setBusy(true); setMsg(null)
    try {
      const audit = await miniWebsiteClient.runGoogleAudit(auditQuery.trim())
      const res = await miniWebsiteClient.saveBooster(customerId, audit.audit)
      setBooster(res.site.booster_state)
      setMsg('Google-Booster aktualisiert.')
    } catch (e: any) { setMsg(e?.message || 'Google-Audit fehlgeschlagen (API-Key gesetzt?).') } finally { setBusy(false) }
  }

  if (!site) return <div className="adminPage"><p>Lädt…</p></div>
  const publicUrl = absolutePublicUrl(`/site/${site.slug}`)

  return (
    <ToolAccessGate toolKey="mini_website">
      <div className="adminPage">
        <header className="adminHeader">
          <h1>Mini-Website &amp; Google-Booster</h1>
          <p>Öffentliche One-Page aus deinen MMOS-Daten plus eine Google-Booster-Checkliste aus dem Mini-Audit.</p>
        </header>

        <section className="adminCard" style={{ display: 'grid', gap: 10, maxWidth: 620 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={site.enabled} onChange={(e) => patch({ enabled: e.target.checked })} />
            <span>Mini-Website öffentlich aktiv</span>
          </label>
          <label><span>Markenname</span><input className="input" value={site.brand?.name || ''} onChange={(e) => patch({ brand: { ...site.brand, name: e.target.value } })} /></label>
          <label><span>Logo-URL</span><input className="input" value={site.brand?.logo_url || ''} onChange={(e) => patch({ brand: { ...site.brand, logo_url: e.target.value } })} /></label>
          <label><span>Akzentfarbe</span><input className="input" type="color" value={site.brand?.primary_color || '#111111'} onChange={(e) => patch({ brand: { ...site.brand, primary_color: e.target.value } })} /></label>
          <label><span>Hero-Überschrift</span><input className="input" value={site.hero?.headline || ''} onChange={(e) => patch({ hero: { ...site.hero, headline: e.target.value } })} /></label>
          <label><span>Hero-Text</span><textarea className="input" value={site.hero?.subline || ''} onChange={(e) => patch({ hero: { ...site.hero, subline: e.target.value } })} /></label>
          <label><span>Leistungen (eine pro Zeile, „Name | Preis")</span><textarea className="input" rows={5} value={servicesText} onChange={(e) => setServicesText(e.target.value)} /></label>
          <label><span>Button-Text</span><input className="input" value={site.cta?.label || ''} onChange={(e) => patch({ cta: { ...site.cta, label: e.target.value } })} /></label>
          <label><span>Button-Ziel (URL)</span><input className="input" value={site.cta?.url || ''} onChange={(e) => patch({ cta: { ...site.cta, url: e.target.value } })} /></label>
          <label><span>Telefon</span><input className="input" value={site.cta?.phone || ''} onChange={(e) => patch({ cta: { ...site.cta, phone: e.target.value } })} /></label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={site.show_reviews} onChange={(e) => patch({ show_reviews: e.target.checked })} />
            <span>Bewertungs-Schnitt anzeigen</span>
          </label>
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Speichern…' : 'Speichern'}</button>
          {msg ? <p style={{ opacity: 0.8 }}>{msg}</p> : null}
        </section>

        <section className="adminCard" style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <h2>Öffentliche Seite</h2>
            <div style={{ fontSize: 13, opacity: 0.7 }}>{publicUrl}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <a className="btn ghost" href={publicUrl} target="_blank" rel="noreferrer">Vorschau</a>
              <button className="btn ghost" onClick={() => copyToClipboard(publicUrl)}>Link kopieren</button>
            </div>
          </div>
          <img src={publicQrImage(publicUrl, 200)} alt="QR" width={140} height={140} style={{ borderRadius: 8 }} />
        </section>

        <section className="adminCard" style={{ marginTop: 16 }}>
          <h2>Google-Booster</h2>
          <p>Name + Ort eingeben, um die öffentliche Google-Präsenz zu prüfen.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="Friseur Müller, Schwerin" value={auditQuery} onChange={(e) => setAuditQuery(e.target.value)} />
            <button className="btn" onClick={runBooster} disabled={busy}>Prüfen</button>
          </div>
          {booster ? (
            <div style={{ marginTop: 12 }}>
              <p>Google-Score: <strong>{booster.score}</strong> · offene Punkte: <strong>{booster.open_count}</strong></p>
              <ul>
                {(booster.items || []).map((it: any) => (
                  <li key={it.key} style={{ color: it.action_needed ? '#c0392b' : '#1e8449' }}>
                    {it.action_needed ? '⚠️' : '✅'} <strong>{it.area}</strong>: {it.note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </ToolAccessGate>
  )
}
