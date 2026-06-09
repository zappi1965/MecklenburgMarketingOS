'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams } from 'next/navigation'
import LegalFooter from '@/components/legal/LegalFooter'
import { loadV47Context, rowsForCustomer } from '@/lib/v47CompleteUpgradeClient'

const s: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg,#020617,#111827,#172554)', color: 'white', padding: 24 },
  wrap: { maxWidth: 920, margin: '0 auto' },
  hero: { borderRadius: 30, padding: 28, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.16)', boxShadow: '0 24px 70px rgba(0,0,0,.35)' },
  title: { fontSize: 'clamp(34px,7vw,62px)', lineHeight: 1, letterSpacing: '-.05em' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 18 },
  card: { borderRadius: 22, padding: 20, background: 'rgba(15,23,42,.74)', border: '1px solid rgba(255,255,255,.12)' },
  btn: { display: 'inline-flex', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', textDecoration: 'none', borderRadius: 14, padding: '12px 16px', fontWeight: 900, border: 0, cursor: 'pointer' },
  input: { width: '100%', background: 'rgba(15,23,42,.9)', color: 'white', border: '1px solid rgba(255,255,255,.18)', borderRadius: 14, padding: '12px 14px' },
  muted: { color: '#cbd5e1', lineHeight: 1.6 }
}

function slugify(v: string) {
  return String(v || '').toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
}

export default function PublicHubPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '')
  const [ctx, setCtx] = useState<any>(null)
  const [rating, setRating] = useState('5')
  const [message, setMessage] = useState('')
  const [done, setDone] = useState('')

  useEffect(() => {
    async function load() { setCtx(await loadV47Context()) }
    void load()
  }, [])

  const customer = useMemo(() => {
    const customers = ctx?.customers || []
    return customers.find((c: any) => slugify(c.slug || c.name || c.id) === slug) || customers[0] || {}
  }, [ctx, slug])

  if (!ctx) return <main style={s.page}><section style={s.hero}>Lade Hub ...</section></main>

  const cid = String(customer?.id || '')
  const rewards = rowsForCustomer(ctx.loyalty_rewards || [], cid)
  const vouchers = rowsForCustomer(ctx.voucher_products || [], cid)
  const referrals = rowsForCustomer(ctx.referral_campaigns || [], cid)
  const slots = rowsForCustomer(ctx.booking_slots || [], cid).filter((slot: any) => String(slot.status || '').toLowerCase().includes('frei'))

  async function sendReview() {
    try {
      const response = await fetch('/api/public/review-feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customer_id: cid,
          rating: Number(rating),
          message,
          is_demo: Boolean(customer?.is_demo)
        })
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result?.ok === false) throw new Error(result?.error || 'feedback_failed')
      setDone(Number(rating) >= 4 ? 'Danke! Du kannst deine Bewertung jetzt auch bei Google veröffentlichen.' : 'Danke! Dein Feedback wurde intern weitergeleitet.')
      setMessage('')
    } catch {
      setDone('Feedback konnte gerade nicht gespeichert werden. Bitte später erneut versuchen.')
    }
  }

  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <section style={s.hero}>
          <p style={s.muted}>Mecklenburg Marketing Kundenhub</p>
          <h1 style={s.title}>{customer?.name || 'Lokaler Betrieb'}</h1>
          <p style={s.muted}>Bewerten, Punkte sammeln, Rewards ansehen, Gutschein kaufen, Termin sichern oder weiterempfehlen.</p>
        </section>

        <section style={s.grid}>
          <div style={s.card}>
            <h2>Bewertung abgeben</h2>
            <select style={s.input} value={rating} onChange={(e) => setRating(e.target.value)}>
              {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} Sterne</option>)}
            </select>
            <br/><br/>
            <textarea style={{ ...s.input, minHeight: 100 }} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Dein Feedback" />
            <br/><br/>
            <button style={s.btn} onClick={sendReview}>Feedback senden</button>
            {done && <p style={s.muted}>{done}</p>}
          </div>

          <div style={s.card}>
            <h2>Rewards</h2>
            {rewards.length ? rewards.map((r: any) => <p key={r.id}>{r.title} · {r.points_required || 0} Punkte</p>) : <p style={s.muted}>Noch keine Rewards hinterlegt.</p>}
          </div>

          <div style={s.card}>
            <h2>Gutscheine</h2>
            {vouchers.length ? vouchers.map((v: any) => <p key={v.id}>{v.title} · {v.amount} €</p>) : <p style={s.muted}>Noch keine Gutscheine hinterlegt.</p>}
          </div>

          <div style={s.card}>
            <h2>Freie Termine</h2>
            {slots.length ? slots.map((slot: any) => <p key={slot.id}>{slot.title} · {new Date(slot.starts_at).toLocaleString('de-DE')}</p>) : <p style={s.muted}>Aktuell keine freien Slots.</p>}
          </div>

          <div style={s.card}>
            <h2>Weiterempfehlen</h2>
            {referrals[0]?.public_url ? <a style={s.btn} href={referrals[0].public_url}>Empfehlungslink öffnen</a> : <p style={s.muted}>Keine aktive Empfehlungsaktion.</p>}
          </div>

          <div style={s.card}>
            <h2>Kontakt</h2>
            <p>{customer.phone}</p>
            <p>{customer.email}</p>
            <p>{customer.address}</p>
          </div>
        </section>
        <LegalFooter />
      </div>
    </main>
  )
}
