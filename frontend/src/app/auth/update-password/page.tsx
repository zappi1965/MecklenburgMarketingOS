'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabaseAuth } from '@/lib/authClient'

type LinkState = 'checking' | 'ready' | 'expired' | 'success'

function readResetLinkError() {
  if (typeof window === 'undefined') return ''
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  const error = hash.get('error') || query.get('error')
  const errorCode = hash.get('error_code') || query.get('error_code')
  const description = hash.get('error_description') || query.get('error_description')
  if (!error && !errorCode && !description) return ''
  if (errorCode === 'otp_expired') return 'Der Reset-Link ist abgelaufen oder wurde bereits verwendet.'
  if (description) return description.replace(/\+/g, ' ')
  return 'Der Reset-Link ist ungültig oder abgelaufen.'
}

function passwordRules(password: string) {
  return [
    { key: 'length', label: 'Mindestens 10 Zeichen', ok: password.length >= 10 },
    { key: 'upper', label: 'Mindestens ein Großbuchstabe', ok: /[A-ZÄÖÜ]/.test(password) },
    { key: 'lower', label: 'Mindestens ein Kleinbuchstabe', ok: /[a-zäöüß]/.test(password) },
    { key: 'number', label: 'Mindestens eine Zahl', ok: /\d/.test(password) },
    { key: 'special', label: 'Mindestens ein Sonderzeichen', ok: /[^A-Za-zÄÖÜäöüß0-9]/.test(password) }
  ]
}

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [linkState, setLinkState] = useState<LinkState>('checking')
  const [loading, setLoading] = useState(false)

  const rules = useMemo(() => passwordRules(password), [password])
  const validPassword = rules.every((rule) => rule.ok)
  const passwordMatches = Boolean(confirmPassword) && password === confirmPassword
  const canSubmit = linkState === 'ready' && validPassword && passwordMatches && !loading

  useEffect(() => {
    let active = true

    async function checkResetSession() {
      const urlError = readResetLinkError()
      if (urlError) {
        if (!active) return
        setMessage(urlError)
        setLinkState('expired')
        return
      }

      const { data, error } = await supabaseAuth.auth.getSession()
      if (!active) return

      if (error) {
        setMessage(error.message)
        setLinkState('expired')
        return
      }

      if (!data?.session) {
        setMessage('Der Reset-Link ist abgelaufen, wurde bereits verwendet oder die Sitzung konnte nicht hergestellt werden. Bitte fordere einen neuen Link an.')
        setLinkState('expired')
        return
      }

      setMessage('')
      setLinkState('ready')
    }

    void checkResetSession()

    const { data: subscription } = supabaseAuth.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setLinkState('ready')
        setMessage('')
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  async function update() {
    if (!canSubmit) return

    setLoading(true)
    setMessage('Passwort wird gespeichert...')

    const { error } = await supabaseAuth.auth.updateUser({ password })

    if (error) {
      const expired = /expired|invalid|session|token|jwt/i.test(error.message)
      setMessage(expired ? 'Der Reset-Link ist abgelaufen oder nicht mehr gültig. Bitte fordere einen neuen Passwort-Link an.' : error.message)
      setLinkState(expired ? 'expired' : 'ready')
      setLoading(false)
      return
    }

    await supabaseAuth.auth.signOut().catch(() => null)
    setLoading(false)
    setLinkState('success')
    setMessage('Passwort wurde geändert. Du kannst dich jetzt mit deinem neuen Passwort einloggen.')
  }

  return (
    <main className="authShell">
      <section className="authCard updatePasswordCard">
        <div className="authMiniBadge">Sicherheit</div>
        <h1>Neues Passwort setzen</h1>
        <p className="sub">
          Wähle ein starkes Passwort. Nach dem Speichern wirst du zurück zum Login geführt.
        </p>

        {linkState === 'checking' && (
          <div className="hintBox">
            Reset-Link wird geprüft...
          </div>
        )}

        {linkState === 'expired' && (
          <div className="authStatusBox error">
            <b>Reset-Link nicht mehr gültig</b>
            <span>{message}</span>
            <Link className="btn" href="/auth">Neuen Link anfordern</Link>
          </div>
        )}

        {linkState === 'success' && (
          <div className="authStatusBox success">
            <b>Passwort geändert</b>
            <span>{message}</span>
            <Link className="btn" href="/auth">Zurück zum Login</Link>
          </div>
        )}

        {linkState === 'ready' && (
          <>
            <label className="authField">
              Neues Passwort
              <input
                className="input"
                type="password"
                placeholder="Neues Passwort eingeben"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <label className="authField">
              Passwort bestätigen
              <input
                className="input"
                type="password"
                placeholder="Passwort erneut eingeben"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) void update() }}
              />
            </label>

            <div className="passwordRuleBox" aria-live="polite">
              {rules.map((rule) => (
                <div className={rule.ok ? 'passwordRule ok' : 'passwordRule'} key={rule.key}>
                  <span>{rule.ok ? '✓' : '•'}</span>
                  {rule.label}
                </div>
              ))}
              <div className={passwordMatches ? 'passwordRule ok' : 'passwordRule'}>
                <span>{passwordMatches ? '✓' : '•'}</span>
                Passwörter stimmen überein
              </div>
            </div>

            <button className="btn" disabled={!canSubmit} onClick={update}>
              {loading ? 'Speichere...' : 'Passwort speichern'}
            </button>

            {message && <div className="hintBox">{message}</div>}

            <Link className="authSecondaryLink" href="/auth">
              Zurück zum Login
            </Link>
          </>
        )}
      </section>
    </main>
  )
}
