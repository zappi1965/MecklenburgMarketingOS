'use client'

import { useEffect, useState } from 'react'
import PublicMarketingShell from '@/components/public/PublicMarketingShell'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

export default function PublicMiniSite({ slug, initialSite }: { slug: string; initialSite?: any }) {
  const [site, setSite] = useState<any>(initialSite || null)
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>(initialSite ? 'ok' : 'loading')

  useEffect(() => {
    if (initialSite) return
    async function load() {
      try {
        const res: any = await v33FunctionalClient.publicSite(slug)
        setSite(res.site)
        setState('ok')
      } catch (_) {
        setState('notfound')
      }
    }
    if (slug) void load()
  }, [slug, initialSite])

  if (state === 'loading') {
    return <PublicMarketingShell><h1>Seite wird geladen…</h1></PublicMarketingShell>
  }
  if (state === 'notfound' || !site) {
    return (
      <PublicMarketingShell>
        <h1>Seite nicht gefunden</h1>
        <p className="v37-subline">Diese Mini-Website ist nicht verfügbar.</p>
      </PublicMarketingShell>
    )
  }

  return (
    <PublicMarketingShell brandName={site.brand?.name} logoUrl={site.brand?.logo_url} accent={site.brand?.primary_color}>
      <h1>{site.hero?.headline || site.brand?.name}</h1>
      {site.hero?.subline ? <p className="v37-subline">{site.hero.subline}</p> : null}
      {site.hero?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={site.hero.image_url} alt={site.brand?.name || ''} style={{ width: '100%', borderRadius: 12, margin: '12px 0' }} />
      ) : null}

      {site.reviews && site.reviews.count > 0 ? (
        <p style={{ fontWeight: 600 }}>★ {site.reviews.average} aus {site.reviews.count} Bewertungen</p>
      ) : null}

      {Array.isArray(site.services) && site.services.length > 0 ? (
        <section style={{ marginTop: 16 }}>
          <h2>Leistungen</h2>
          <ul>
            {site.services.map((s: any, i: number) => (
              <li key={i}>{s.name}{s.price ? ` — ${s.price}` : ''}{s.note ? ` (${s.note})` : ''}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {Array.isArray(site.hours) && site.hours.length > 0 ? (
        <section style={{ marginTop: 16 }}>
          <h2>Öffnungszeiten</h2>
          <ul>
            {site.hours.map((h: any, i: number) => (
              <li key={i}>{h.day}: {h.open}–{h.close}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {site.cta?.url ? <a className="btn" href={site.cta.url}>{site.cta.label || 'Termin anfragen'}</a> : null}
        {site.cta?.phone ? <a className="btn ghost" href={`tel:${site.cta.phone}`}>Anrufen</a> : null}
      </div>
    </PublicMarketingShell>
  )
}
