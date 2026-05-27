'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Gift, Star, ExternalLink, Sparkles } from 'lucide-react'
import { BROWSER_BACKEND_BASE } from '@/lib/backendUrl'
import { apiRequest } from '@/lib/apiRequest'

type Membership = {
  member_id: string
  customer_id: string
  customer_name: string
  brand_primary: string
  brand_secondary: string
  display_name?: string | null
  points_balance: number
  tier?: string | null
  last_scan_at?: string | null
  member_since?: string | null
  unlocked_rewards: number
  total_rewards: number
  wallet_link: string
}

function relativeDate(iso?: string | null) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return null
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`
  if (days < 365) return `vor ${Math.floor(days / 30)} Monaten`
  return `vor ${Math.floor(days / 365)} Jahren`
}

export default function WalletMePageWrapper() {
  // Next.js 15+: useSearchParams braucht Suspense-Boundary, sonst Pre-
  // Render-Fail trotz force-dynamic. Wir wrappen die eigentliche Page.
  return (
    <Suspense fallback={<main className="walletMePage"><p className="walletMeMuted">Lade …</p></main>}>
      <WalletMePage />
    </Suspense>
  )
}

function WalletMePage() {
  const params = useSearchParams()
  const urlEmail = params?.get('email') || ''
  const urlExp = params?.get('exp') || ''
  const urlSig = params?.get('sig') || ''
  const hasToken = Boolean(urlEmail && urlExp && urlSig)

  const [mode, setMode] = useState<'request' | 'loading' | 'view' | 'request-sent' | 'error'>(
    hasToken ? 'loading' : 'request'
  )
  const [email, setEmail] = useState(urlEmail)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string>('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!hasToken) return
    (async () => {
      try {
        const q = new URLSearchParams({ email: urlEmail, exp: urlExp, sig: urlSig })
        const r = await apiRequest<any>(`${BROWSER_BACKEND_BASE}/api/wallet/me?${q.toString()}`, { method: 'GET' })
        setMemberships(r.memberships || [])
        setTokenExpiresAt(r.token_expires_at || '')
        setMode('view')
      } catch (e: any) {
        setError(e?.message || 'Dieser Link ist abgelaufen oder ungueltig.')
        setMode('error')
      }
    })()
  }, [hasToken, urlEmail, urlExp, urlSig])

  async function requestLink(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      await apiRequest(`${BROWSER_BACKEND_BASE}/api/wallet/me/request-link`, {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          base_url: typeof window !== 'undefined' ? window.location.origin : undefined
        })
      })
      setMode('request-sent')
    } catch (e: any) {
      setError(e?.message || 'Anfrage fehlgeschlagen.')
    } finally { setBusy(false) }
  }

  const totalPoints = memberships.reduce((s, m) => s + m.points_balance, 0)
  const totalUnlocked = memberships.reduce((s, m) => s + m.unlocked_rewards, 0)

  return (
    <main className="walletMePage">
      <header className="walletMeHeader">
        <Sparkles size={28} className="walletMeHeaderIcon" />
        <h1>Meine Bonusclubs</h1>
        <p>Alle deine Treuekarten bei MMOS-Partnern in einer Uebersicht — passwortfrei via Magic-Link.</p>
      </header>

      {error && <div className="walletMeAlert">{error}</div>}

      {mode === 'request' && (
        <section className="walletMeCard">
          <h2>Zugang anfordern</h2>
          <p>Gib die E-Mail-Adresse ein, mit der du dich bei deinen Bonusclubs angemeldet hast. Wir schicken dir einen 1-Stunde-Link.</p>
          <form onSubmit={requestLink}>
            <label className="walletMeLabel">
              <Mail size={14} /> E-Mail-Adresse
              <input
                type="email"
                className="walletMeInput"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                inputMode="email"
              />
            </label>
            <button type="submit" className="walletMeBtn primary" disabled={busy || !email.includes('@')}>
              {busy ? 'Sende …' : 'Magic-Link anfordern'}
            </button>
          </form>
          <p className="walletMeMuted">
            Wir verschicken die Mail nur, wenn diese Adresse bei mindestens einem MMOS-Bonusclub registriert ist.
            Aus Datenschutzgruenden bekommst du auch dann eine Bestaetigungs-Anzeige, wenn die Adresse unbekannt ist.
          </p>
        </section>
      )}

      {mode === 'request-sent' && (
        <section className="walletMeCard walletMeHighlight">
          <h2>Prüfe dein Postfach 📬</h2>
          <p>
            Wenn die Adresse <b>{email}</b> bei einem MMOS-Bonusclub registriert ist, hast du in den naechsten Minuten eine Mail mit einem Zugangslink.
          </p>
          <p className="walletMeMuted">Der Link ist 1 Stunde gueltig. Du kannst dieses Fenster jetzt schliessen.</p>
        </section>
      )}

      {mode === 'loading' && (
        <section className="walletMeCard">
          <p className="walletMeMuted">Lade deine Bonusclubs …</p>
        </section>
      )}

      {mode === 'view' && (
        <>
          <section className="walletMeStats">
            <div className="walletMeStat">
              <strong>{memberships.length}</strong>
              <span>Bonusclubs</span>
            </div>
            <div className="walletMeStat">
              <strong>{totalPoints}</strong>
              <span>Punkte gesamt</span>
            </div>
            <div className="walletMeStat">
              <strong>{totalUnlocked}</strong>
              <span>Praemien verfuegbar</span>
            </div>
          </section>

          {memberships.length === 0 && (
            <section className="walletMeCard">
              <p className="walletMeMuted">Aktuell sind unter dieser E-Mail-Adresse keine Bonusclubs registriert.</p>
            </section>
          )}

          {memberships.map((m) => (
            <article
              key={m.member_id}
              className="walletMeMember"
              style={{
                '--card-primary': m.brand_primary,
                '--card-secondary': m.brand_secondary
              } as React.CSSProperties}
            >
              <header className="walletMeMemberHeader">
                <div className="walletMeMemberBrand">{m.customer_name.slice(0, 1).toUpperCase()}</div>
                <div className="walletMeMemberTitle">
                  <strong>{m.customer_name}</strong>
                  {m.tier && <span className="walletMeMemberTier"><Star size={12} /> {m.tier}</span>}
                </div>
              </header>
              <div className="walletMeMemberBody">
                <div className="walletMeMemberPoints">
                  <span className="walletMeMemberBalance">{m.points_balance}</span>
                  <span>Punkte</span>
                </div>
                <div className="walletMeMemberMeta">
                  <div><Gift size={14} /> {m.unlocked_rewards} von {m.total_rewards} Praemien verfuegbar</div>
                  {m.last_scan_at && <div className="walletMeMuted">Letzter Scan {relativeDate(m.last_scan_at)}</div>}
                  {m.member_since && <div className="walletMeMuted">Mitglied seit {new Date(m.member_since).toLocaleDateString('de-DE')}</div>}
                </div>
              </div>
              <footer className="walletMeMemberFooter">
                <a
                  className="walletMeBtn small"
                  href={`${BROWSER_BACKEND_BASE}${m.wallet_link}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={14} /> Wallet-Karte erneut hinzufuegen
                </a>
              </footer>
            </article>
          ))}

          {tokenExpiresAt && (
            <p className="walletMeMuted walletMeFooter">
              Dieser Zugang laeuft ab am {new Date(tokenExpiresAt).toLocaleString('de-DE')}.
            </p>
          )}
        </>
      )}

      <footer className="walletMeLegal">
        <a href="/datenschutz">Datenschutz</a>
        <a href="/impressum">Impressum</a>
      </footer>
    </main>
  )
}
