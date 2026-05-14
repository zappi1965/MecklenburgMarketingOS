
'use client'

import { useState } from 'react'
import { supabaseAuth } from '@/lib/authClient'

export default function AuthPage() {
  const [mode, setMode] = useState<'login'|'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function login() {
    setMessage('')
    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password })
    if (error) return setMessage(error.message)
    window.location.href = '/'
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
        <p className="sub">Sicherer Login für Kunden und Admins.</p>
        <input className="input" placeholder="E-Mail" value={email} onChange={e=>setEmail(e.target.value)} />
        {mode === 'login' && <input className="input" placeholder="Passwort" type="password" value={password} onChange={e=>setPassword(e.target.value)} />}
        {mode === 'login' ? <button className="btn" onClick={login}>Einloggen</button> : <button className="btn" onClick={reset}>Reset-Link senden</button>}
        <button className="btn secondary" onClick={()=>setMode(mode === 'login' ? 'reset' : 'login')}>
          {mode === 'login' ? 'Passwort vergessen' : 'Zurück zum Login'}
        </button>
        {message && <p className="sub">{message}</p>}
      </section>
    </main>
  )
}
