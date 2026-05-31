'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabaseAuth, getCurrentUserProfilePayload } from '@/lib/authClient'
import { customerPortalClient } from '@/lib/customerPortalClient'
import { BROWSER_BACKEND_BASE } from '@/lib/backendUrl'

export default function AuthPage() {
  const [mode, setMode] = useState<'login'|'register'|'reset'|'invite'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [requestedPackage, setRequestedPackage] = useState('Starter')
  const [inviteToken, setInviteToken] = useState('')
  const [inviteInfo, setInviteInfo] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [mfaPending, setMfaPending] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [pendingProfile, setPendingProfile] = useState<any>(null)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('invite')
    if (!token) return
    setMode('invite')
    setInviteToken(token)
    setMessage('Einladung wird geprüft...')
    customerPortalClient.getInvite(token)
      .then((r:any) => {
        setInviteInfo(r)
        setEmail(r.invite?.email || '')
        setCompanyName(r.customer?.name || r.invite?.metadata?.company_name || '')
        setContactPerson(r.invite?.contact_person || r.customer?.contact_person || '')
        setRequestedPackage(r.invite?.package_name || r.customer?.package_name || 'Starter')
        setMessage('Einladung gefunden. Bitte Passwort setzen und Zugang aktivieren.')
      })
      .catch((e:any) => setMessage(e.message || 'Einladung konnte nicht geladen werden.'))
  }, [])


  function finishLogin(profile:any) {
    const role = String(profile?.role || '').toLowerCase() === 'admin' ? 'admin' : 'customer'
    try {
      localStorage.setItem('mmos_mode', 'live')
      localStorage.setItem('mmos_role', role)
      if (profile?.customer_id) localStorage.setItem('mmos_customer_id', profile.customer_id)
      sessionStorage.setItem('mmos_profile_cache_v1', JSON.stringify({ profile, expiresAt: Date.now() + 1000 * 60 * 10 }))
    } catch {}
    window.location.href = '/?app=1&view=dashboard'
  }

  async function verifyMfaLogin() {
    setMessage('')
    const clean = mfaCode.replace(/\s+/g,'').toUpperCase()
    if (!clean) return setMessage('Bitte 2FA-Code oder Backup-Code eingeben.')
    const { data } = await supabaseAuth.auth.getSession()
    const token = data.session?.access_token
    if (!token) return setMessage('Session abgelaufen. Bitte erneut mit Passwort anmelden.')
    const res = await fetch(`${BROWSER_BACKEND_BASE}/api/security/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: clean })
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok || payload?.ok === false) return setMessage(payload?.error || '2FA-Code ist ungültig. Prüfe bitte auch, ob die Uhrzeit auf deinem Handy automatisch synchronisiert wird.')
    setMfaPending(false)
    setMfaCode('')
    finishLogin(pendingProfile)
  }

  async function cancelMfaLogin() {
    setMfaPending(false)
    setMfaCode('')
    setPendingProfile(null)
    try { await supabaseAuth.auth.signOut() } catch {}
    setMessage('Login abgebrochen.')
  }


  async function login() {
    setMessage('')
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
    if (error) return setMessage(error.message)
    const profilePayload:any = await getCurrentUserProfilePayload()
    const profile = profilePayload?.profile || null

    if (profilePayload?.is_admin || (String(profile?.role || '').toLowerCase() === 'admin' && String(profile?.status || '').toLowerCase() === 'active')) {
      if (profilePayload?.mfa_required || (profile?.mfa_enabled && profilePayload?.mfa_verified === false)) {
        setPendingProfile(profile)
        setMfaPending(true)
        setMessage('2FA erforderlich: Bitte Code aus deiner Authenticator-App eingeben.')
        return
      }
      finishLogin(profile)
      return
    }

    if (!profile) {
      await supabaseAuth.auth.signOut()
      const debugHint = profilePayload?.hint ? ` (${profilePayload.hint})` : ''
      return setMessage(`Für diesen Login ist noch kein freigegebenes Kundenprofil vorhanden.${debugHint}`)
    }

    const status = String(profile.status || 'active').toLowerCase()
    if (status !== 'active') {
      await supabaseAuth.auth.signOut()
      return setMessage('Dein Zugang wartet noch auf Freigabe durch Mecklenburg Marketing.')
    }

    finishLogin(profile)
  }

  async function register() {
    setMessage('')
    if (!email || !password || !companyName) {
      setMessage('Bitte Firmenname, E-Mail und Passwort ausfüllen.')
      return
    }

    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: { data: { company_name: companyName, contact_person: contactPerson } }
    })

    if (error) return setMessage(error.message)

    await customerPortalClient.register({
      auth_user_id: data.user?.id,
      company_name: companyName,
      contact_person: contactPerson,
      email,
      phone,
      requested_package: requestedPackage
    })

    setMessage('Registrierung erhalten. Dein Zugang wartet auf Freigabe durch Mecklenburg Marketing.')
  }

  async function acceptInvite() {
    setMessage('')
    if (!inviteToken) return setMessage('Einladungslink fehlt.')
    if (!email || !password) return setMessage('Bitte E-Mail und Passwort ausfüllen.')

    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: { data: { company_name: companyName, contact_person: contactPerson, invite_token: inviteToken } }
    })
    if (error) return setMessage(error.message)

    await customerPortalClient.acceptInvite({
      token: inviteToken,
      auth_user_id: data.user?.id,
      contact_person: contactPerson
    })

    setMessage('Zugang aktiviert. Du kannst dich jetzt einloggen.')
    setMode('login')
  }

  async function reset() {
    setMessage('')
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`
    })
    if (error) return setMessage(error.message)
    setMessage('Passwort-Reset wurde gesendet.')
  }

  const isInvite = mode === 'invite'

  return (
    <main className="authShell">
      <section className="authCard">
        <h1>MecklenburgMarketingOS</h1>
        <p className="sub">
          {isInvite ? 'Kundenportal aktivieren.' : mode === 'register' ? 'Kundenkonto erstellen und Paket anfragen.' : 'Sicherer Login für Kunden.'}
        </p>

        {!isInvite && (
          <div className="row">
            <button className={mode==='login'?'btn':'btn secondary'} onClick={()=>setMode('login')}>Login</button>
            <button className={mode==='register'?'btn':'btn secondary'} onClick={()=>setMode('register')}>Registrieren</button>
          </div>
        )}

        {isInvite && inviteInfo?.customer && (
          <div className="hintBox">
            <b>{inviteInfo.customer.name}</b>
            <p>Paket: {requestedPackage}. Dieser Zugang wird nach Aktivierung direkt mit der Kundenakte verknüpft.</p>
          </div>
        )}

        {(mode === 'register' || isInvite) && (
          <>
            <input className="input" placeholder="Offizieller Firmen- oder Kundenname" title="So wird der Kunde später im Portal und in Dokumenten angezeigt." value={companyName} onChange={e=>setCompanyName(e.target.value)} readOnly={isInvite} />
            <input className="input" placeholder="Name der Kontaktperson" title="Hauptansprechpartner beim Kunden." value={contactPerson} onChange={e=>setContactPerson(e.target.value)} />
            {!isInvite && <input className="input" placeholder="Telefonnummer optional" title="Telefonnummer für Rückfragen oder Freigabeprozesse." value={phone} onChange={e=>setPhone(e.target.value)} />}
            {!isInvite && (
              <select className="input" value={requestedPackage} onChange={e=>setRequestedPackage(e.target.value)}>
                <option>Starter</option>
                <option>Growth</option>
                <option>Premium</option>
              </select>
            )}
          </>
        )}

        <input className="input" placeholder="E-Mail-Adresse für Login oder Kontakt" title="Diese Adresse wird für Login, Freigaben und Benachrichtigungen genutzt." value={email} onChange={e=>setEmail(e.target.value)} readOnly={(isInvite && Boolean(inviteInfo?.invite?.email)) || mfaPending} />

        {mode !== 'reset' && (
          <input className="input" placeholder={isInvite ? 'Passwort für den Kundenlogin setzen' : 'Passwort eingeben'} title="Mindestens 10 Zeichen und idealerweise ein Sonderzeichen verwenden." type="password" value={password} onChange={e=>setPassword(e.target.value)} readOnly={mfaPending} />
        )}

        {mfaPending && (
          <div className="hintBox">
            <b>2FA erforderlich</b>
            <p>Gib den 6-stelligen Code aus deiner Authenticator-App ein. Alternativ kannst du einen Backup-Code verwenden.</p>
            <input className="input" placeholder="2FA-Code oder Backup-Code" inputMode="numeric" autoFocus value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\s+/g,''))} onKeyDown={e=>{if(e.key==='Enter')verifyMfaLogin()}} />
            <button className="btn" onClick={verifyMfaLogin}>2FA bestätigen</button>
            <button className="btn secondary" onClick={cancelMfaLogin}>Abbrechen</button>
          </div>
        )}

        {mode === 'login' && !mfaPending && <button className="btn" onClick={login}>Einloggen</button>}
        {mode === 'register' && <button className="btn" onClick={register}>Kundenkonto anfragen</button>}
        {mode === 'invite' && <button className="btn" onClick={acceptInvite}>Zugang aktivieren</button>}
        {mode === 'reset' && <button className="btn" onClick={reset}>Reset-Link senden</button>}

        {!isInvite && (
          <button className="btn secondary" onClick={()=>setMode(mode === 'reset' ? 'login' : 'reset')}>
            {mode === 'reset' ? 'Zurück zum Login' : 'Passwort vergessen'}
          </button>
        )}

        {isInvite && <button className="btn secondary" onClick={()=>setMode('login')}>Zum normalen Login</button>}

        {message && <p className="sub">{message}</p>}
      </section>
    </main>
  )
}
