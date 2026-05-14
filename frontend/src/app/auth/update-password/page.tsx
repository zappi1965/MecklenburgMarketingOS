
'use client'

import { useState } from 'react'
import { supabaseAuth } from '@/lib/authClient'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function update() {
    const { error } = await supabaseAuth.auth.updateUser({ password })
    if (error) return setMessage(error.message)
    setMessage('Passwort wurde geändert. Du kannst dich jetzt einloggen.')
  }

  return (
    <main className="authShell">
      <section className="authCard">
        <h1>Neues Passwort setzen</h1>
        <input className="input" type="password" placeholder="Neues Passwort" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn" onClick={update}>Passwort speichern</button>
        {message && <p className="sub">{message}</p>}
      </section>
    </main>
  )
}
