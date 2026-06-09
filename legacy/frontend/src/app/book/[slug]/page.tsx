'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

type Service = { id: string; name: string; description?: string | null; duration_minutes: number; price_eur: number; category?: string | null }
type AvailResp = { ok: boolean; date: string; slots: string[]; service?: any; granularity?: number; error?: string; code?: string }

function todayIso(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  let body: any = null
  try { body = await res.json() } catch (_) { /* ignore */ }
  if (!res.ok || body?.ok === false) {
    const msg = body?.error || `Fehler (${res.status})`
    const err: any = new Error(msg); err.code = body?.code; err.status = res.status
    throw err
  }
  return body
}

export default function BookingWidgetPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '')

  const [step, setStep] = useState<'service' | 'slot' | 'contact' | 'done'>('service')
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [service, setService] = useState<Service | null>(null)
  const [date, setDate] = useState(todayIso())
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [time, setTime] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<string>('')

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        const r = await api<{ ok: boolean; services: Service[] }>(`/api/booking/${encodeURIComponent(slug)}/services`)
        setServices(r.services || [])
      } catch (e: any) { setError(e?.message || 'Buchungsseite konnte nicht geladen werden.') }
      finally { setLoading(false) }
    })()
  }, [slug])

  async function loadSlots(svc: Service, d: string) {
    setSlotsLoading(true); setError(''); setSlots([]); setTime('')
    try {
      const qs = new URLSearchParams({ service_id: svc.id, date: d })
      const r = await api<AvailResp>(`/api/booking/${encodeURIComponent(slug)}/slots?${qs.toString()}`)
      setSlots(r.slots || [])
    } catch (e: any) { setError(e?.message || 'Verfuegbarkeit konnte nicht geladen werden.') }
    finally { setSlotsLoading(false) }
  }

  function chooseService(svc: Service) {
    setService(svc)
    setStep('slot')
    loadSlots(svc, date)
  }

  function changeDate(d: string) {
    setDate(d)
    if (service) loadSlots(service, d)
  }

  async function submit() {
    if (!service || !time) return
    setBusy(true); setError('')
    try {
      const r = await api<{ ok: boolean; confirmation: string }>(`/api/booking/${encodeURIComponent(slug)}/book`, {
        method: 'POST',
        body: JSON.stringify({ service_id: service.id, date, time, contact: { name: name.trim(), email: email.trim(), phone: phone.trim() } })
      })
      setConfirmation(r.confirmation || 'confirmed')
      setStep('done')
    } catch (e: any) {
      if (e?.code === 'SLOT_TAKEN') {
        setError('Dieser Termin wurde gerade vergeben. Bitte waehle einen anderen.')
        setStep('slot')
        if (service) loadSlots(service, date)
      } else {
        setError(e?.message || 'Buchung fehlgeschlagen.')
      }
    } finally { setBusy(false) }
  }

  const dateOptions = useMemo(() => Array.from({ length: 14 }, (_, i) => todayIso(i)), [])
  const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })

  return (
    <main style={S.page}>
      <div style={S.card}>
        <header style={S.header}>
          <h1 style={S.h1}>Termin buchen</h1>
          <div style={S.steps}>
            {['Leistung', 'Termin', 'Daten'].map((label, i) => {
              const active = ['service', 'slot', 'contact', 'done'].indexOf(step) >= i
              return <span key={label} style={{ ...S.stepDot, ...(active ? S.stepDotActive : {}) }}>{label}</span>
            })}
          </div>
        </header>

        {error && <div style={S.error}>{error}</div>}
        {loading && <div style={S.muted}>Lade …</div>}

        {!loading && step === 'service' && (
          <section>
            <h2 style={S.h2}>Leistung waehlen</h2>
            {services.length === 0 && <div style={S.muted}>Aktuell sind keine buchbaren Leistungen hinterlegt.</div>}
            <div style={S.list}>
              {services.map((s) => (
                <button key={s.id} type="button" style={S.serviceBtn} onClick={() => chooseService(s)}>
                  <span style={S.serviceName}>{s.name}</span>
                  <span style={S.serviceMeta}>{s.duration_minutes} Min.{Number(s.price_eur) > 0 ? ` · ${Number(s.price_eur).toFixed(2)} €` : ''}</span>
                  {s.description && <span style={S.serviceDesc}>{s.description}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 'slot' && service && (
          <section>
            <button type="button" style={S.back} onClick={() => setStep('service')}>← Andere Leistung</button>
            <h2 style={S.h2}>{service.name}</h2>
            <p style={S.muted}>{service.duration_minutes} Min.{Number(service.price_eur) > 0 ? ` · ${Number(service.price_eur).toFixed(2)} €` : ''}</p>

            <label style={S.label}>Datum
              <select style={S.input} value={date} onChange={(e) => changeDate(e.target.value)}>
                {dateOptions.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}
              </select>
            </label>

            <h3 style={S.h3}>Freie Zeiten</h3>
            {slotsLoading && <div style={S.muted}>Pruefe Verfuegbarkeit …</div>}
            {!slotsLoading && slots.length === 0 && <div style={S.muted}>Keine freien Termine an diesem Tag. Bitte anderes Datum waehlen.</div>}
            <div style={S.slotGrid}>
              {slots.map((t) => (
                <button key={t} type="button" style={{ ...S.slotBtn, ...(time === t ? S.slotBtnActive : {}) }} onClick={() => setTime(t)}>{t}</button>
              ))}
            </div>
            {time && <button type="button" style={S.primary} onClick={() => setStep('contact')}>Weiter mit {time} Uhr →</button>}
          </section>
        )}

        {step === 'contact' && service && (
          <section>
            <button type="button" style={S.back} onClick={() => setStep('slot')}>← Zeit aendern</button>
            <h2 style={S.h2}>Deine Kontaktdaten</h2>
            <p style={S.muted}>{service.name} · {fmtDate(date)} · {time} Uhr</p>
            <label style={S.label}>Name<input style={S.input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
            <label style={S.label}>E-Mail*<input style={S.input} type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="name@beispiel.de" /></label>
            <label style={S.label}>Telefon<input style={S.input} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
            <p style={S.consent}>
              Mit dem Absenden willige ich in die Verarbeitung meiner Daten zur Terminabwicklung ein
              (Art. 6 Abs. 1 lit. a + b DSGVO). Verantwortlich ist der jeweilige Anbieter. Details in den{' '}
              <a href="/datenschutz" style={S.link} target="_blank" rel="noopener noreferrer">Datenschutzhinweisen</a>.
            </p>
            <button type="button" style={S.primary} onClick={submit} disabled={busy || !email.includes('@')} aria-busy={busy}>
              {busy ? 'Buche …' : 'Termin verbindlich buchen'}
            </button>
          </section>
        )}

        {step === 'done' && service && (
          <section style={{ textAlign: 'center' }}>
            <div style={S.checkmark}>✓</div>
            <h2 style={S.h2}>{confirmation === 'pending' ? 'Anfrage erhalten' : 'Termin gebucht'}</h2>
            <p style={S.muted}>
              {confirmation === 'pending'
                ? 'Deine Terminanfrage liegt vor und wird vom Anbieter bestaetigt. Du erhaeltst eine Rueckmeldung.'
                : 'Dein Termin ist bestaetigt. Wir freuen uns auf dich!'}
            </p>
            <div style={S.summary}>
              <div><strong>{service.name}</strong></div>
              <div>{fmtDate(date)} · {time} Uhr</div>
              <div>{service.duration_minutes} Min.{Number(service.price_eur) > 0 ? ` · ${Number(service.price_eur).toFixed(2)} €` : ''}</div>
            </div>
          </section>
        )}
      </div>
      <p style={S.footer}>Buchung bereitgestellt mit MMOS</p>
    </main>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', background: '#0b1220', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom))', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: '#e8edf6' },
  card: { width: '100%', maxWidth: 460, background: '#121a2b', border: '1px solid #233048', borderRadius: 18, padding: 22, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' },
  header: { marginBottom: 18 },
  h1: { fontSize: 22, margin: '0 0 12px', fontWeight: 700 },
  h2: { fontSize: 18, margin: '0 0 6px', fontWeight: 650 },
  h3: { fontSize: 14, margin: '16px 0 8px', color: '#9fb0c9', fontWeight: 600 },
  steps: { display: 'flex', gap: 6 },
  stepDot: { flex: 1, textAlign: 'center', fontSize: 11.5, padding: '5px 4px', borderRadius: 7, background: '#1b2740', color: '#7e8da6' },
  stepDotActive: { background: '#2563eb', color: '#fff' },
  list: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 },
  serviceBtn: { display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left', padding: '14px 16px', minHeight: 44, border: '1px solid #2a3a57', borderRadius: 12, background: '#16203400', cursor: 'pointer', color: '#e8edf6' },
  serviceName: { fontSize: 15.5, fontWeight: 600 },
  serviceMeta: { fontSize: 13, color: '#8fa1bd' },
  serviceDesc: { fontSize: 12.5, color: '#7e8da6', marginTop: 2 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5, color: '#9fb0c9', margin: '12px 0' },
  input: { background: '#0e1626', border: '1px solid #2a3a57', borderRadius: 10, padding: '12px 13px', color: '#e8edf6', fontSize: 15, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', minHeight: 44 },
  slotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8, marginTop: 4 },
  slotBtn: { padding: '11px 6px', minHeight: 44, border: '1px solid #2a3a57', borderRadius: 9, background: '#0e1626', color: '#e8edf6', fontSize: 14, cursor: 'pointer' },
  slotBtnActive: { background: '#2563eb', borderColor: '#2563eb', color: '#fff', fontWeight: 600 },
  primary: { width: '100%', marginTop: 18, padding: '14px', minHeight: 48, border: 'none', borderRadius: 11, background: '#2563eb', color: '#fff', fontSize: 15.5, fontWeight: 600, cursor: 'pointer' },
  back: { background: 'none', border: 'none', color: '#7e9bd4', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 8 },
  muted: { color: '#8fa1bd', fontSize: 13.5, margin: '8px 0' },
  error: { background: '#3a1620', border: '1px solid #7c2d3a', color: '#ffb4c0', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, marginBottom: 12 },
  consent: { fontSize: 11.5, color: '#7e8da6', lineHeight: 1.5, margin: '14px 0 4px' },
  link: { color: '#7e9bd4' },
  checkmark: { width: 56, height: 56, lineHeight: '56px', borderRadius: '50%', background: '#16a34a', color: '#fff', fontSize: 30, margin: '4px auto 12px' },
  summary: { marginTop: 16, padding: 16, background: '#0e1626', borderRadius: 12, fontSize: 14, lineHeight: 1.7 },
  footer: { marginTop: 18, fontSize: 11.5, color: '#5a6a85' }
}
