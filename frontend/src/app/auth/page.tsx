'use client'

import { useEffect, useState } from 'react'
import { supabaseAuth } from '@/lib/authClient'
import { customerPortalClient } from '@/lib/customerPortalClient'

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

  async function login() {
    setMessage('')
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
    if (error) return setMessage(error.message)
    const { data: profile } = await supabaseAuth.from('user_profiles').select('*').eq('id', data.user?.id).maybeSingle()
    if (profile?.role !== 'admin' && profile?.status && profile.status !== 'active') {
      await supabaseAuth.auth.signOut()
      return setMessage('Dein Zugang wartet noch auf Freigabe durch Mecklenburg Marketing.')
    }
    if (!profile) {
      await supabaseAuth.auth.signOut()
      return setMessage('Für diesen Login ist noch kein freigegebenes Kundenprofil vorhanden.')
    }
    window.location.href = '/'
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
            <input className="input" placeholder="Firma" value={companyName} onChange={e=>setCompanyName(e.target.value)} readOnly={isInvite} />
            <input className="input" placeholder="Ansprechpartner" value={contactPerson} onChange={e=>setContactPerson(e.target.value)} />
            {!isInvite && <input className="input" placeholder="Telefon optional" value={phone} onChange={e=>setPhone(e.target.value)} />}
            {!isInvite && (
              <select className="input" value={requestedPackage} onChange={e=>setRequestedPackage(e.target.value)}>
                <option>Starter</option>
                <option>Growth</option>
                <option>Premium</option>
              </select>
            )}
          </>
        )}

        <input className="input" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)} readOnly={isInvite && Boolean(inviteInfo?.invite?.email)} />

        {mode !== 'reset' && (
          <input className="input" placeholder={isInvite ? 'Passwort für den Kundenlogin setzen' : 'Passwort'} type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        )}

        {mode === 'login' && <button className="btn" onClick={login}>Einloggen</button>}
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
