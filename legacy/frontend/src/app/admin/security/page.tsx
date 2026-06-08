'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { securityClient } from '@/lib/adminToolsClients'

type Stage = 'idle' | 'enrolling' | 'activating' | 'active'

export default function SecurityPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [stage, setStage] = useState<Stage>('idle')
  const [otpauth, setOtpauth] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [disableCode, setDisableCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [qrSrc, setQrSrc] = useState('')

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); return }
      setAuthorized(true)
      // mfa_enabled flag aus dem Profil (siehe Migration 0073).
      setMfaEnabled(Boolean((profile as any).mfa_enabled))
      setStage((profile as any).mfa_enabled ? 'active' : 'idle')
    })()
  }, [])

  useEffect(() => {
    if (otpauth && typeof window !== 'undefined') {
      // QR via Backend-Endpoint /api/qr (oeffentlich, kein Drittland).
      const url = `/api/qr?value=${encodeURIComponent(otpauth)}&size=384`
      const apiBase = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '')
      setQrSrc(apiBase ? `${apiBase}${url}` : url)
    }
  }, [otpauth])

  async function startEnroll() {
    setBusy(true); setError(''); setInfo('')
    try {
      const r = await securityClient.enroll()
      setOtpauth(r.otpauth)
      setSecret(r.secret)
      setStage('enrolling')
    } catch (e: any) { setError(e?.message || 'Enrollment fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function activate() {
    setBusy(true); setError('')
    try {
      const r = await securityClient.activate(code.trim())
      setBackupCodes(r.backupCodes || [])
      setMfaEnabled(true)
      setStage('active')
      setInfo('2FA ist jetzt aktiv. Bitte Backup-Codes sicher speichern.')
      setCode('')
    } catch (e: any) { setError(e?.message || 'Aktivierung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function disable() {
    if (!disableCode.trim()) { setError('Bitte aktuellen Code eingeben.'); return }
    if (!confirm('2FA wirklich deaktivieren? Das Konto wird ueber Passwort allein zugaenglich.')) return
    setBusy(true); setError('')
    try {
      await securityClient.disable(disableCode.trim())
      setMfaEnabled(false)
      setStage('idle')
      setBackupCodes([])
      setDisableCode('')
      setInfo('2FA deaktiviert.')
    } catch (e: any) { setError(e?.message || 'Deaktivierung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>Sicherheit · 2FA</h1>
        <p>Zwei-Faktor-Authentifizierung via Authenticator-App (Google Authenticator, 1Password, Authy, Bitwarden). Schuetzt vor Account-Uebernahme bei kompromittiertem Passwort.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && stage === 'idle' && !mfaEnabled && (
        <section className="adminCard">
          <h2>2FA aktivieren</h2>
          <p>Du brauchst eine Authenticator-App auf deinem Smartphone. Empfohlen: Google Authenticator (iOS/Android) oder die Authenticator-Funktion in 1Password / Bitwarden.</p>
          <button type="button" className="adminBtn" onClick={startEnroll} disabled={busy}>
            {busy ? 'Lade …' : 'Enrollment starten'}
          </button>
        </section>
      )}

      {authorized && stage === 'enrolling' && (
        <section className="adminCard adminHighlight">
          <h2>QR-Code scannen</h2>
          <p>Oeffne deine Authenticator-App und scanne den QR-Code. Alternativ kannst du den Secret-Key manuell eingeben.</p>
          {qrSrc && <img src={qrSrc} alt="2FA-QR-Code" style={{ background: '#fff', padding: 8, borderRadius: 8, maxWidth: 280 }} />}
          <div className="adminLabel">Secret (manuell)<code className="adminCode">{secret}</code></div>
          <label className="adminLabel">
            6-stelliger Code aus der App
            <input className="adminInput" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
          </label>
          <button type="button" className="adminBtn" onClick={activate} disabled={busy || code.length !== 6}>
            {busy ? 'Pruefe …' : 'Aktivieren'}
          </button>
        </section>
      )}

      {authorized && stage === 'active' && backupCodes.length > 0 && (
        <section className="adminCard adminHighlight">
          <h2>Backup-Codes — bitte JETZT speichern</h2>
          <p>Diese Codes erlauben dir den Login, falls du dein Handy verlierst. Jeder Code kann nur EINMAL verwendet werden.</p>
          <div className="adminBackupGrid">
            {backupCodes.map((c) => <code key={c} className="adminCode adminInline">{c}</code>)}
          </div>
          <p className="adminMuted">Speichere die Codes in deinem Passwort-Manager oder drucke sie aus. Diese Anzeige erscheint nur EINMAL.</p>
        </section>
      )}

      {authorized && mfaEnabled && (
        <section className="adminCard">
          <h2>2FA-Status</h2>
          <p><span className="adminBadge on">aktiv</span> Dein Konto ist mit Zwei-Faktor-Authentifizierung geschuetzt.</p>
          <hr style={{ border: 0, borderTop: '1px solid var(--border-soft)', margin: '14px 0' }} />
          <label className="adminLabel">2FA deaktivieren (aktueller Code zur Bestaetigung):
            <input className="adminInput" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
          </label>
          <button type="button" className="adminBtn danger" onClick={disable} disabled={busy}>
            {busy ? 'Deaktiviere …' : '2FA deaktivieren'}
          </button>
        </section>
      )}
    </main>
  )
}
