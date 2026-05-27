'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { ScanLine, Camera, X, Check, AlertCircle } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { loyaltyScanClient, type LoyaltyMemberSnapshot } from '@/lib/adminToolsClients'

type Mode = 'idle' | 'scanning' | 'review' | 'done' | 'error'

declare global {
  // Native BarcodeDetector ist in Chromium-Browsern verfuegbar.
  // Wir typisieren defensiv, damit TS auf strict-OFF-Setups baut.
  interface Window { BarcodeDetector?: any }
}

export default function LoyaltyScanPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [mode, setMode] = useState<Mode>('idle')
  const [member, setMember] = useState<LoyaltyMemberSnapshot | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [staffCode, setStaffCode] = useState('')
  const [pointsToAdd, setPointsToAdd] = useState(10)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [lastResult, setLastResult] = useState<{ pointsAdded: number; newBalance: number; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [detectorAvailable, setDetectorAvailable] = useState<boolean | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); return }
      setAuthorized(true)
      setCustomerId(profile.customer_id || '')
    })()
    if (typeof window !== 'undefined') {
      setDetectorAvailable(Boolean(window.BarcodeDetector))
    }
    return () => stopCamera()
  }, [])

  function stopCamera() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop()
      streamRef.current = null
    }
    if (videoRef.current) {
      try { videoRef.current.srcObject = null } catch {}
    }
  }

  async function startCamera() {
    setError(''); setInfo('')
    if (!window.BarcodeDetector) {
      setError('BarcodeDetector ist im Browser nicht verfuegbar. Bitte Chrome/Edge auf Android oder Desktop nutzen, oder unten den Code manuell eintragen.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] })
      setMode('scanning')
      loop()
    } catch (e: any) {
      setError(e?.message || 'Kamera-Zugriff fehlgeschlagen.')
    }
  }

  function loop() {
    rafRef.current = requestAnimationFrame(async () => {
      try {
        if (!videoRef.current || !detectorRef.current) { loop(); return }
        if (videoRef.current.readyState >= 2) {
          const codes = await detectorRef.current.detect(videoRef.current)
          if (codes && codes.length > 0) {
            const raw = codes[0].rawValue || codes[0].rawData || ''
            if (raw) {
              stopCamera()
              await handleQrPayload(raw)
              return
            }
          }
        }
        loop()
      } catch {
        loop()
      }
    })
  }

  async function handleQrPayload(raw: string) {
    setBusy(true); setError(''); setInfo('')
    try {
      const r = await loyaltyScanClient.lookup(customerId, raw)
      setMember(r.member)
      setMode('review')
    } catch (e: any) {
      setError(e?.message || 'Mitglied nicht gefunden.')
      setMode('error')
    } finally { setBusy(false) }
  }

  async function confirmAddPoints() {
    if (!member) return
    setBusy(true); setError('')
    try {
      const idempotency_key = `${member.id}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
      const r = await loyaltyScanClient.scan(customerId, {
        qr_payload: member.id,
        points: pointsToAdd,
        staff_code: staffCode || undefined,
        idempotency_key
      })
      setLastResult({
        pointsAdded: r.member.points_added,
        newBalance: r.member.points_balance,
        name: r.member.display_name || r.member.email || 'Mitglied'
      })
      setMember(null)
      setMode('done')
      setInfo(`${r.member.points_added} Punkte gebucht. Neuer Stand: ${r.member.points_balance}.`)
    } catch (e: any) {
      setError(e?.message || 'Punkte konnten nicht gebucht werden.')
    } finally { setBusy(false) }
  }

  function resetAndScanAgain() {
    setMember(null); setLastResult(null); setError(''); setInfo(''); setManualInput('')
    setMode('idle')
  }

  return (
    <main className="adminPage scanPage">
      <header className="adminHeader">
        <h1>Loyalty-Scan</h1>
        <p>Scanne den QR-Code des Endkunden aus seiner Wallet-Karte oder vom Ausdruck. Punkte werden automatisch gutgeschrieben.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert" role="alert"><AlertCircle size={14} /> {error}</div>}
      {info && <div className="adminAlertInfo" role="status"><Check size={14} /> {info}</div>}

      {authorized && customerId && (
        <>
          <section className="adminCard">
            <h2>Einstellungen</h2>
            <div className="adminGrid2">
              <label className="adminLabel">Punkte pro Scan
                <input className="adminInput" type="number" min={1} max={500} value={pointsToAdd} onChange={(e) => setPointsToAdd(Number(e.target.value))} />
              </label>
              <label className="adminLabel">Mitarbeiter-Code (optional)
                <input className="adminInput" inputMode="text" value={staffCode} onChange={(e) => setStaffCode(e.target.value)} placeholder="z.B. PIN" />
              </label>
            </div>
          </section>

          {(mode === 'idle' || mode === 'error') && (
            <section className="adminCard">
              <h2>1 · QR-Code scannen</h2>
              {detectorAvailable === false && (
                <p className="adminMuted">
                  Dein Browser unterstuetzt keine Kamera-Erkennung. Du kannst den Member-Code unten manuell eintippen oder einfuegen.
                </p>
              )}
              <button type="button" className="adminBtn scanBtnLarge" onClick={startCamera} disabled={busy || detectorAvailable === false}>
                <Camera size={18} /> Kamera starten
              </button>

              <hr style={{ border: 0, borderTop: '1px solid var(--border-soft)', margin: '18px 0' }} />

              <label className="adminLabel">Oder Code manuell:
                <input
                  className="adminInput"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="z.B. a1b2c3d4-5678-... oder mmos:loyalty:<id>"
                />
              </label>
              <button type="button" className="adminBtn" onClick={() => handleQrPayload(manualInput.trim())} disabled={busy || !manualInput.trim()}>
                Pruefen
              </button>
            </section>
          )}

          {mode === 'scanning' && (
            <section className="adminCard scanCameraCard">
              <h2><ScanLine size={18} /> Halte den QR-Code in den Rahmen …</h2>
              <div className="scanVideoWrap">
                <video ref={videoRef} playsInline muted className="scanVideo" />
                <div className="scanReticle" />
              </div>
              <button type="button" className="adminBtn small" onClick={() => { stopCamera(); setMode('idle') }}>
                <X size={14} /> Abbrechen
              </button>
            </section>
          )}

          {mode === 'review' && member && (
            <section className="adminCard adminHighlight">
              <h2>2 · Buchung bestaetigen</h2>
              <div className="scanMemberCard">
                <div className="scanMemberAvatar">{(member.display_name || member.email || '?').slice(0, 1).toUpperCase()}</div>
                <div className="scanMemberInfo">
                  <strong>{member.display_name || member.email || 'Mitglied'}</strong>
                  <span>Aktueller Stand: <b>{member.points_balance}</b> Punkte{member.tier ? ` · ${member.tier}` : ''}</span>
                  {member.last_scan_at && <span className="adminMuted">Letzter Scan: {new Date(member.last_scan_at).toLocaleString('de-DE')}</span>}
                </div>
              </div>
              <div className="adminActions">
                <button type="button" className="adminBtn scanBtnLarge" onClick={confirmAddPoints} disabled={busy}>
                  <Check size={18} /> {busy ? 'Buche …' : `+${pointsToAdd} Punkte gutschreiben`}
                </button>
                <button type="button" className="adminBtn small" onClick={resetAndScanAgain} disabled={busy}>
                  Abbrechen
                </button>
              </div>
            </section>
          )}

          {mode === 'done' && lastResult && (
            <section className="adminCard adminHighlight">
              <h2>3 · Erledigt 🎉</h2>
              <p className="scanResultBig">
                <span className="scanResultPlus">+{lastResult.pointsAdded}</span>
                <span className="scanResultSub">fuer {lastResult.name}</span>
              </p>
              <p className="adminMuted">Neuer Stand: <b>{lastResult.newBalance}</b> Punkte</p>
              <button type="button" className="adminBtn scanBtnLarge" onClick={resetAndScanAgain}>
                Naechsten Kunden scannen
              </button>
            </section>
          )}
        </>
      )}
    </main>
  )
}
