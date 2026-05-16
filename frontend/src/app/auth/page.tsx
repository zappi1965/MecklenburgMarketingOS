
'use client'

import { useState } from 'react'
import { supabaseAuth } from '@/lib/authClient'
import { customerPortalClient } from '@/lib/customerPortalClient'

export default function AuthPage() {
  const [mode, setMode] = useState<'login'|'register'|'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [requestedPackage, setRequestedPackage] = useState('Starter')
  const [message, setMessage] = useState('')

  async function login() {
    setMessage('')
    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password })
    if (error) return setMessage(error.message)
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

    setMessage('Registrierung erhalten. Dein Zugang wartet auf Freigabe.')
  }

  async function reset() {
    setMessage('')
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`
    })
    if (error) return setMessage(error.message)
    setMessage('Passwort-Reset wurde gesendet.')
  }

  return (
    <main className="authShell">
      <section className="authCard">
        <h1>MecklenburgMarketingOS</h1>
        <p className="sub">
          {mode === 'register' ? 'Kundenkonto erstellen und Paket anfragen.' : 'Sicherer Login für Kunden.'}
        </p>

        <div className="row">
          <button className={mode==='login'?'btn':'btn secondary'} onClick={()=>setMode('login')}>Login</button>
          <button className={mode==='register'?'btn':'btn secondary'} onClick={()=>setMode('register')}>Registrieren</button>
        </div>

        {mode === 'register' && (
          <>
            <input className="input" placeholder="Firma" value={companyName} onChange={e=>setCompanyName(e.target.value)} />
            <input className="input" placeholder="Ansprechpartner" value={contactPerson} onChange={e=>setContactPerson(e.target.value)} />
            <input className="input" placeholder="Telefon optional" value={phone} onChange={e=>setPhone(e.target.value)} />
            <select className="input" value={requestedPackage} onChange={e=>setRequestedPackage(e.target.value)}>
              <option>Starter</option>
              <option>Growth</option>
              <option>Premium</option>
            </select>
          </>
        )}

        <input className="input" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)} />

        {mode !== 'reset' && (
          <input className="input" placeholder="Passwort" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        )}

        {mode === 'login' && <button className="btn" onClick={login}>Einloggen</button>}
        {mode === 'register' && <button className="btn" onClick={register}>Kundenkonto anfragen</button>}
        {mode === 'reset' && <button className="btn" onClick={reset}>Reset-Link senden</button>}

        <button className="btn secondary" onClick={()=>setMode(mode === 'reset' ? 'login' : 'reset')}>
          {mode === 'reset' ? 'Zurück zum Login' : 'Passwort vergessen'}
        </button>

        {message && <p className="sub">{message}</p>}
      </section>
    </main>
  )
}
