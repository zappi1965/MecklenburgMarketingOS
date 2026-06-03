'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

export default function ReactivationPublicPage() {
  const params = useParams<{ token: string }>()
  const token = String(params?.token || '')
  const [status, setStatus] = useState<any>(null)
  const [staffCode, setStaffCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<any>(null)

  useEffect(() => {
    if (!token) return
    let alive = true
    v33FunctionalClient.publicReactivationStatus(token)
      .then((r: any) => { if (alive) setStatus(r) })
      .catch((e: any) => { if (alive) setError(e?.message || 'Rückhol-Link konnte nicht geladen werden.') })
    return () => { alive = false }
  }, [token])

  async function redeem(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const r: any = await v33FunctionalClient.publicReactivationRedeem(token, { staff_code: staffCode })
      setDone(r)
      setMessage('Deine Rückhol-Prämie wurde eingelöst. Willkommen zurück!')
    } catch (err: any) {
      setError(err?.message || 'Einlösung konnte nicht gespeichert werden.')
    } finally {
      setLoading(false)
    }
  }

  const expired = status?.expired
  const alreadyRedeemed = status?.already_redeemed || done?.ok
  const customerName = status?.customer_name || 'Dein Anbieter'
  const rewardName = done?.reward_name || status?.reward_name || 'Deine Rückhol-Prämie'
  const points = Number(done?.points_added ?? status?.reward_points ?? 0)

  return (
    <main className="publicLoyaltyPage">
      <section className="publicHero">
        <div className="publicHeroGlow" />
        <div className="publicCard">
          <div className="v37-script-brand">{customerName}</div>
          <h1>Wir haben dich vermisst</h1>
          <p className="v37-subline">Dieser persönliche Rückhol-Link ist nur einmal einlösbar.</p>

          {!status && !error && <p>Rückholaktion wird geladen...</p>}

          {status && (
            <div className="publicRewardQuickPanel">
              <div>
                <b>{rewardName}</b>
                <span>{points > 0 ? `${points} Bonuspunkte / Vorteil` : 'Persönliche Prämie'} · gültig bis {status.expires_at ? new Date(status.expires_at).toLocaleDateString('de-DE') : 'auf Widerruf'}</span>
              </div>
            </div>
          )}

          {expired && <div className="publicRescanNotice publicNoScanTokenNotice"><b>Abgelaufen</b><span>Diese Rückholaktion ist nicht mehr gültig.</span></div>}
          {alreadyRedeemed && <div className="publicRescanNotice"><b>Bereits eingelöst</b><span>Diese Rückhol-Prämie wurde bereits genutzt.</span></div>}

          {status && !expired && !alreadyRedeemed && (
            <form className="publicForm" onSubmit={redeem}>
              <div className="publicAuthNotice">Zeige diese Seite vor Ort vor. Die Einlösung wird mit einem Mitarbeitercode bestätigt.</div>
              {status.staff_code_required && (
                <label>
                  Mitarbeitercode
                  <input value={staffCode} onChange={(e) => setStaffCode(e.target.value)} placeholder="Code vom Team eintragen lassen" required autoComplete="off" />
                </label>
              )}
              <button type="submit" disabled={loading}>{loading ? 'Löse ein...' : 'Prämie einlösen'}</button>
            </form>
          )}

          {message && <div className="publicSuccess"><h2>{message}</h2><p>{points > 0 ? `${points} Bonuspunkte wurden deinem Bonuskonto gutgeschrieben.` : 'Die Einlösung wurde gespeichert.'}</p></div>}
          {error && <p className="publicError">{error}</p>}

          {status?.qr_slug && <a className="publicLinkButton" href={`/q/${status.qr_slug}`}>Zum normalen QR-Bonus</a>}
        </div>
      </section>
    </main>
  )
}
