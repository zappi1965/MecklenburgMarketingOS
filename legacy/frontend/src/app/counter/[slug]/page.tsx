'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useParams } from 'next/navigation'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

function absoluteUrl(path: string) {
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

function qrImageUrl(value: string, size = 720) {
  const params = new URLSearchParams({ value, size: String(size) })
  return `/api/qr?${params.toString()}`
}

function fmtTime(value?: string | null) {
  if (!value) return '–'
  try { return new Date(value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) } catch { return '–' }
}

export default function CounterModePage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '')
  const [status, setStatus] = useState<any>(null)
  const [mode, setMode] = useState<'customer_phone_staff_pin' | 'counter_customer_code' | ''>('')
  const [code, setCode] = useState('')
  const [staffPin, setStaffPin] = useState('')
  const [lookup, setLookup] = useState<any>(null)
  const [rewardId, setRewardId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [updatedAt, setUpdatedAt] = useState('')

  async function load() {
    if (!slug) return
    try {
      const r: any = await v33FunctionalClient.publicCounterStatus(slug)
      setStatus(r)
      const backendMode = r?.redemption_mode === 'counter_customer_code' ? 'counter_customer_code' : 'customer_phone_staff_pin'
      setMode((current) => current || backendMode)
      setUpdatedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setError('')
    } catch (e: any) {
      setError(e?.message || 'Tresenmodus konnte nicht geladen werden.')
    }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { void load() }, 6000)
    return () => window.clearInterval(timer)
  }, [slug])

  const scanPath = status?.current_qr?.scan_path || status?.scan_path || `/q/${slug}`
  const scanUrl = useMemo(() => absoluteUrl(scanPath), [scanPath])
  const landingUrl = useMemo(() => absoluteUrl(status?.landing_path || `/l/${slug}`), [status?.landing_path, slug])
  const displayUrl = status?.display_path || `/qr-display/${slug}`
  const qr = qrImageUrl(scanUrl, 900)
  const pins = Array.isArray(status?.staff_pins) ? status.staff_pins : []
  const kpis = status?.daily_kpis || {}
  const rewards = Array.isArray(lookup?.rewards) ? lookup.rewards : []
  const availableRewards = rewards.filter((r: any) => r.available)

  useEffect(() => {
    if (!rewardId && availableRewards[0]?.id) setRewardId(String(availableRewards[0].id))
  }, [lookup])

  async function lookupCode() {
    setBusy(true); setError(''); setMessage(''); setLookup(null)
    try {
      const r: any = await v33FunctionalClient.publicCounterCodeLookup(slug, { code })
      setLookup(r)
      setMessage('Code gefunden. Wähle die Prämie und bestätige mit Mitarbeiter-PIN.')
    } catch (e: any) {
      setError(e?.message || 'Code konnte nicht geprüft werden.')
    } finally { setBusy(false) }
  }

  async function redeemCode() {
    setBusy(true); setError(''); setMessage('')
    try {
      const r: any = await v33FunctionalClient.publicCounterCodeRedeem(slug, { code, reward_id: rewardId, staff_code: staffPin })
      setMessage(`${r?.reward?.title || 'Prämie'} wurde eingelöst. Neuer Punktestand: ${r?.points_balance ?? '–'}`)
      setCode(''); setStaffPin(''); setLookup(null); setRewardId('')
      await load()
    } catch (e: any) {
      setError(e?.message || 'Einlösung fehlgeschlagen.')
    } finally { setBusy(false) }
  }

  return (
    <main style={{minHeight:'100vh',background:'#f7f4ec',padding:24,color:'#111827'}}>
      <section style={{maxWidth:1180,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',marginBottom:20,flexWrap:'wrap'}}>
          <div>
            <span style={{display:'inline-flex',border:'1px solid #d4af37',borderRadius:999,padding:'6px 12px',fontWeight:800,color:'#7c5d12',background:'#fff8df'}}>Tresenmodus</span>
            <h1 style={{fontSize:42,margin:'14px 0 6px'}}>{status?.customer_name || 'QR & Loyalty'}</h1>
            <p style={{color:'#6b7280',fontSize:17,maxWidth:680}}>Für Tablet/Kasse: QR anzeigen, Mitarbeiter-PIN bereithalten oder Kundencode direkt am Tresen einlösen.</p>
          </div>
          <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:20,padding:16,minWidth:220}}>
            <b>Status</b><br/><span>{updatedAt ? `Aktualisiert ${updatedAt}` : 'lädt...'}</span>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:18}}>
          <Kpi label="Scans heute" value={kpis.scans || 0}/>
          <Kpi label="Punkte heute" value={kpis.points || 0}/>
          <Kpi label="Einlösungen" value={kpis.redemptions || 0}/>
          <Kpi label="Letzte Aktivität" value={fmtTime(kpis.last_activity_at)}/>
        </div>

        <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap'}}>
          <button onClick={() => setMode('customer_phone_staff_pin')} style={buttonStyle(mode==='customer_phone_staff_pin')}>Mitarbeiter-PIN auf Kundenhandy</button>
          <button onClick={() => setMode('counter_customer_code')} style={buttonStyle(mode==='counter_customer_code')}>Kundencode am Tresen</button>
          <button onClick={() => window.open(displayUrl, '_blank')} style={buttonStyle(false)}>Live-QR öffnen</button>
          <button onClick={() => window.open(landingUrl, '_blank')} style={buttonStyle(false)}>Kundenseite öffnen</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'minmax(300px,420px) 1fr',gap:18,alignItems:'start'}}>
          <div style={cardStyle}>
            <h2 style={{marginTop:0}}>Aktueller QR</h2>
            <div style={{display:'grid',placeItems:'center',background:'#fff',border:'1px solid #e5e7eb',borderRadius:24,padding:22}}>
              <img src={qr} alt="QR Code" style={{width:'100%',maxWidth:330,height:'auto'}}/>
            </div>
            <p style={{wordBreak:'break-all',color:'#6b7280'}}>{scanUrl}</p>
          </div>

          <div style={cardStyle}>
            {mode === 'customer_phone_staff_pin' ? (
              <>
                <h2 style={{marginTop:0}}>Mitarbeiter-PIN</h2>
                <p style={{color:'#6b7280'}}>Der Gast öffnet die Prämie auf seinem Handy. Das Team tippt die PIN direkt auf dem Kundenhandy ein.</p>
                {pins.length === 0 ? <div style={noticeStyle}>Keine aktive Mitarbeiter-PIN gefunden. Bitte im Dashboard unter Mitarbeitercodes anlegen.</div> : pins.map((pin: any) => (
                  <div key={pin.id} style={{border:'1px solid #e5e7eb',borderRadius:18,padding:18,marginBottom:12,background:'#f9fafb'}}>
                    <div style={{fontWeight:800}}>{pin.label || 'Mitarbeiter-PIN'}</div>
                    <div style={{fontSize:46,fontWeight:900,letterSpacing:'.15em',margin:'8px 0'}}>{pin.code}</div>
                    <div style={{color:'#6b7280'}}>Nutzung: {pin.uses || 0} · zuletzt {fmtTime(pin.last_used_at)}</div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <h2 style={{marginTop:0}}>Kundencode einlösen</h2>
                <p style={{color:'#6b7280'}}>Der Gast zeigt den sechsstelligen Code. Das Team prüft ihn hier und löst eine verfügbare Prämie mit Mitarbeiter-PIN ein.</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10}}>
                  <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-stelliger Kundencode" inputMode="numeric" style={inputStyle}/>
                  <button onClick={lookupCode} disabled={busy || code.length < 4} style={buttonStyle(true)}>{busy ? 'Prüfe...' : 'Prüfen'}</button>
                </div>
                {lookup && (
                  <div style={{marginTop:18,border:'1px solid #e5e7eb',borderRadius:18,padding:16,background:'#f9fafb'}}>
                    <b>{lookup.member?.display_name || 'Gast'}</b>
                    <p style={{marginTop:4,color:'#6b7280'}}>Punktestand: {lookup.member?.points_balance ?? 0} · gültig bis {lookup.expires_at ? new Date(lookup.expires_at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) : '–'}</p>
                    {availableRewards.length === 0 ? <div style={noticeStyle}>Keine verfügbare Prämie für diesen Punktestand.</div> : (
                      <>
                        <select value={rewardId} onChange={(e) => setRewardId(e.target.value)} style={inputStyle}>
                          {availableRewards.map((r: any) => <option key={r.id} value={r.id}>{r.title} · {r.points_required} Punkte</option>)}
                        </select>
                        <input value={staffPin} onChange={(e) => setStaffPin(e.target.value)} placeholder="Mitarbeiter-PIN" autoComplete="off" style={{...inputStyle,marginTop:10}}/>
                        <button onClick={redeemCode} disabled={busy || !staffPin || !rewardId} style={{...buttonStyle(true),marginTop:10,width:'100%'}}>Prämie einlösen</button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
            {message && <div style={{...noticeStyle,borderColor:'#bbf7d0',background:'#f0fdf4',color:'#166534'}}>{message}</div>}
            {error && <div style={{...noticeStyle,borderColor:'#fecaca',background:'#fef2f2',color:'#991b1b'}}>{error}</div>}
          </div>
        </div>
      </section>
    </main>
  )
}

function Kpi({label,value}:{label:string;value:any}) {
  return <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:18,padding:16}}><b style={{fontSize:24}}>{value}</b><div style={{color:'#6b7280',marginTop:4}}>{label}</div></div>
}

const cardStyle: CSSProperties = { background:'#fff', border:'1px solid #e5e7eb', borderRadius:24, padding:22, boxShadow:'0 18px 60px rgba(17,24,39,.08)' }
const inputStyle: CSSProperties = { width:'100%', boxSizing:'border-box', border:'1px solid #d1d5db', borderRadius:14, padding:'13px 14px', fontSize:16 }
const noticeStyle: CSSProperties = { border:'1px solid #fde68a', background:'#fffbeb', color:'#92400e', borderRadius:16, padding:14, marginTop:14 }
function buttonStyle(active:boolean): CSSProperties { return { border: active ? '1px solid #111827' : '1px solid #d1d5db', background: active ? '#111827' : '#fff', color: active ? '#fff' : '#111827', borderRadius:999, padding:'12px 16px', fontWeight:800, cursor:'pointer' } }
