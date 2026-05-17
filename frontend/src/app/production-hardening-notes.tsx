
'use client'

import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/config'
import { signInWithPassword, signOut, getSession } from '@/lib/auth'

export function AuthPanel() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<any>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getSession().then(setSession).catch(() => null)
  }, [])

  async function login() {
    try {
      const { data, error } = await signInWithPassword(email, password)
      if (error) throw error
      setSession(data.session)
      setMessage('Login erfolgreich.')
    } catch (e: any) {
      setMessage(e.message || 'Login fehlgeschlagen.')
    }
  }

  async function logout() {
    await signOut()
    setSession(null)
    setMessage('Ausgeloggt.')
  }

  return (
    <section className="card">
      <h2>Live Auth</h2>
      <p className="sub">Supabase Auth ist vorbereitet. Demo-Login kann parallel bestehen bleiben.</p>
      {session ? (
        <>
          <div className="item"><b>Session aktiv</b><span>{session.user?.email}</span></div>
          <button className="btn secondary" onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <input className="input" placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input" placeholder="Passwort" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="btn" onClick={login}>Live Login</button>
        </>
      )}
      {message && <div className="sub">{message}</div>}
    </section>
  )
}

export function EnvCheckPanel() {
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/hardening/health`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false, error: 'Backend nicht erreichbar' }))
  }, [])

  return (
    <section className="card">
      <h2>Production Guard</h2>
      <div className="item"><b>Backend</b><span>{health?.ok ? 'verbunden' : 'nicht verbunden'}</span></div>
      <div className="item"><b>Mail</b><span>{health?.services?.mail ? 'aktiv' : 'Dry-Run / ENV fehlt'}</span></div>
      <div className="item"><b>Stripe</b><span>{health?.services?.stripe ? 'aktiv' : 'nicht konfiguriert'}</span></div>
      <div className="item"><b>Gotenberg</b><span>{health?.services?.gotenberg ? 'aktiv' : 'nicht konfiguriert'}</span></div>
      {health?.error && <div className="sub">{health.error}</div>}
    </section>
  )
}
