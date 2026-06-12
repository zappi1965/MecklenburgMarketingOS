'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import PublicMarketingShell from '@/components/public/PublicMarketingShell'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

function ReferralPublicContent() {
  const params = useParams<{ code: string }>()
  const search = useSearchParams()
  const code = String(params?.code || '').toUpperCase()
  const slug = String(search?.get('s') || '').trim()

  const [status, setStatus] = useState<any>(null)
  const [form, setForm] = useState<{ email: string; password: string }>({ email: '', password: '' })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!slug) return
      try {
        const res: any = await v33FunctionalClient.publicStatus(slug)
        setStatus(res)
      } catch (_) {
        /* ignore — Seite funktioniert auch ohne Vorschau */
      }
    }
    void load()
  }, [slug])

  const settings = status?.settings || {}
  const brandName = settings.brand_name || status?.program?.name || 'Empfehlung'
  const friendBonus = Number(status?.settings?.referral_bonus_friend ?? status?.program?.metadata?.referral_bonus_friend ?? 50)

  async function submit() {
    setError(null)
    if (!slug) {
      setError('Dieser Empfehlungslink ist unvollständig. Bitte scanne den QR-Code des Betriebs.')
      return
    }
    if (!form.email || form.password.length < 8) {
      setError('Bitte E-Mail und ein Passwort mit mindestens 8 Zeichen angeben.')
      return
    }
    setLoading(true)
    try {
      const res: any = await v33FunctionalClient.publicJoinOrScan(slug, {
        email: form.email,
        password: form.password,
        referral_code: code,
        display_name: form.email.split('@')[0]
      })
      setResult(res)
    } catch (e: any) {
      setError(e?.message || 'Beitritt fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicMarketingShell brandName={brandName} logoUrl={settings.stamp_card_logo_url || settings.logo_url}>
      {result ? (
        <div>
          <h1>Willkommen! 🎉</h1>
          <p className="v37-subline">
            Du bist dem Bonusprogramm von <strong>{brandName}</strong> beigetreten. Dein aktuelles Guthaben:{' '}
            <strong>{Number(result.points_balance || 0)} Punkte</strong>.
          </p>
          <p>Du und die Person, die dich eingeladen hat, erhalten euren Empfehlungsbonus automatisch.</p>
          {slug ? <a className="btn" href={`/l/${slug}`}>Zur Bonusseite</a> : null}
        </div>
      ) : (
        <div>
          <h1>Du wurdest empfohlen!</h1>
          <p className="v37-subline">
            Tritt jetzt dem Bonusprogramm von <strong>{brandName}</strong> bei und sichere dir{' '}
            <strong>{friendBonus} Startpunkte</strong>. Die Person, die dich eingeladen hat, bekommt ebenfalls einen Bonus.
          </p>
          <div className="grid" style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <label>
              <span>E-Mail</span>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="deine@email.de" />
            </label>
            <label>
              <span>Passwort (min. 8 Zeichen)</span>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Passwort wählen" />
            </label>
            {error ? <p style={{ color: '#c0392b' }}>{error}</p> : null}
            <button className="btn" onClick={submit} disabled={loading}>
              {loading ? 'Wird eingelöst…' : 'Beitreten & Bonus sichern'}
            </button>
            <small style={{ opacity: 0.7 }}>Empfehlungscode: {code}</small>
          </div>
        </div>
      )}
    </PublicMarketingShell>
  )
}

export default function ReferralPublicPage() {
  return (
    <Suspense fallback={<PublicMarketingShell><h1>Empfehlung wird geladen…</h1></PublicMarketingShell>}>
      <ReferralPublicContent />
    </Suspense>
  )
}
