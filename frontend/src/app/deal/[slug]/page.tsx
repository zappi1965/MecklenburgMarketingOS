'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import PublicMarketingShell from '@/components/public/PublicMarketingShell'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

function useCountdown(expiresAt?: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return useMemo(() => {
    if (!expiresAt) return null
    const diff = new Date(expiresAt).getTime() - now
    if (diff <= 0) return { ended: true, label: '00:00:00' }
    const s = Math.floor(diff / 1000)
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return { ended: false, label: `${d > 0 ? d + 'T ' : ''}${pad(h)}:${pad(m)}:${pad(sec)}` }
  }, [expiresAt, now])
}

export default function PublicDealPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '')
  const [deal, setDeal] = useState<any>(null)
  const [state, setState] = useState<'loading' | 'active' | 'ended' | 'notfound'>('loading')
  const countdown = useCountdown(deal?.expires_at)

  useEffect(() => {
    async function load() {
      try {
        const res: any = await v33FunctionalClient.publicDeal(slug)
        setDeal(res.deal)
        setState('active')
        v33FunctionalClient.publicDealTrack(slug, 'view').catch(() => {})
      } catch (e: any) {
        if (e?.status === 410 || /DEAL_NOT_ACTIVE/.test(String(e?.message))) setState('ended')
        else setState('notfound')
      }
    }
    if (slug) void load()
  }, [slug])

  const ended = state === 'ended' || countdown?.ended

  return (
    <PublicMarketingShell brandName={deal?.title}>
      {state === 'loading' ? (
        <h1>Aktion wird geladen…</h1>
      ) : state === 'notfound' ? (
        <div>
          <h1>Aktion nicht gefunden</h1>
          <p className="v37-subline">Dieser Aktionslink ist ungültig.</p>
        </div>
      ) : ended ? (
        <div>
          <h1>Aktion beendet</h1>
          <p className="v37-subline">Diese Aktion ist leider abgelaufen. Schau bald wieder vorbei!</p>
        </div>
      ) : (
        <div>
          {deal.discount_label ? (
            <div style={{ display: 'inline-block', background: '#111', color: '#fff', padding: '6px 12px', borderRadius: 999, fontWeight: 700, marginBottom: 12 }}>
              {deal.discount_label}
            </div>
          ) : null}
          <h1>{deal.title}</h1>
          {deal.subtitle ? <p className="v37-subline">{deal.subtitle}</p> : null}
          {deal.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={deal.image_url} alt={deal.title} style={{ width: '100%', borderRadius: 12, margin: '12px 0' }} />
          ) : null}
          {deal.body ? <p style={{ whiteSpace: 'pre-wrap' }}>{deal.body}</p> : null}
          {countdown ? (
            <p style={{ fontSize: 20, fontWeight: 700, margin: '12px 0' }}>Noch {countdown.label}</p>
          ) : null}
          {deal.cta_url ? (
            <a className="btn" href={deal.cta_url} onClick={() => v33FunctionalClient.publicDealTrack(slug, 'share').catch(() => {})}>
              {deal.cta_label || 'Jetzt sichern'}
            </a>
          ) : null}
        </div>
      )}
    </PublicMarketingShell>
  )
}
