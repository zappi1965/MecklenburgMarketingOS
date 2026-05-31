'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, ShieldCheck, UserPlus, Lock, Unlock, Save, X } from 'lucide-react'
import { adminProfilesClient } from '@/lib/adminProfilesClient'

type AdminProfile = {
  id: string
  username?: string
  display_name?: string
  email?: string
  role?: string
  status?: 'active' | 'pending' | 'blocked' | string
  created_at?: string
  updated_at?: string
}

const emptyForm = {
  username: '',
  display_name: '',
  email: '',
  password: '',
  status: 'active'
}

function statusClass(status?: string) {
  if (status === 'active') return 'on'
  if (status === 'blocked') return 'off'
  return ''
}

function validatePassword(pw: string) {
  if (!pw) return 'Passwort fehlt.'
  if (pw.length < 10) return 'Passwort muss mindestens 10 Zeichen lang sein.'
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Passwort braucht mindestens ein Sonderzeichen.'
  return ''
}

export default function AdminProfilesPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [setupToken, setSetupToken] = useState('')
  const [form, setForm] = useState<any>(emptyForm)
  const [edit, setEdit] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const activeCount = useMemo(() => profiles.filter((p) => p.status === 'active').length, [profiles])

  async function load() {
    setBusy(true); setMsg(''); setError('')
    try {
      const r = await adminProfilesClient.list(setupToken)
      setProfiles(r.profiles || [])
      setMsg(r.auth_via === 'setup_token' ? 'Adminprofile per Setup-Key geladen.' : 'Adminprofile geladen.')
    } catch (e:any) {
      setError(e?.message || 'Adminprofile konnten nicht geladen werden.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function create() {
    setMsg(''); setError('')
    if (!form.username || !form.email || !form.password) {
      setError('Bitte Benutzername, E-Mail und Passwort ausfüllen.')
      return
    }
    const pwError = validatePassword(String(form.password || ''))
    if (pwError) { setError(pwError); return }

    setBusy(true)
    try {
      const r = await adminProfilesClient.create({ ...form, setup_token: setupToken })
      setProfiles([r.profile, ...profiles.filter((p) => p.id !== r.profile.id)])
      setForm(emptyForm)
      setMsg('Live-Adminprofil wurde in Supabase Auth angelegt und für den Login freigeschaltet.')
    } catch (e:any) {
      setError(e?.message || 'Adminprofil konnte nicht erstellt werden.')
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    if (!edit?.id) return
    setMsg(''); setError('')
    if (edit.password) {
      const pwError = validatePassword(String(edit.password || ''))
      if (pwError) { setError(pwError); return }
    }
    setBusy(true)
    try {
      const r = await adminProfilesClient.update(edit.id, { ...edit, setup_token: setupToken })
      setProfiles(profiles.map((p) => p.id === edit.id ? r.profile : p))
      setEdit(null)
      setMsg('Adminprofil aktualisiert.')
    } catch (e:any) {
      setError(e?.message || 'Adminprofil konnte nicht aktualisiert werden.')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(profile: AdminProfile, status: string) {
    setMsg(''); setError('')
    if (profile.status === 'active' && status !== 'active' && activeCount <= 1) {
      setError('Der letzte aktive Admin kann nicht gesperrt werden.')
      return
    }
    setBusy(true)
    try {
      const r = await adminProfilesClient.setStatus(profile.id, status, setupToken)
      setProfiles(profiles.map((p) => p.id === profile.id ? r.profile : p))
      setMsg(status === 'blocked' ? 'Adminprofil wurde gesperrt.' : 'Adminprofil wurde aktiviert.')
    } catch (e:any) {
      setError(e?.message || 'Status konnte nicht geändert werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <div>
          <p className="eyebrow">Interne Verwaltung</p>
          <h1><ShieldCheck size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Adminprofile</h1>
          <p>Live-Adminzugänge für Supabase Auth erstellen, sperren und verwalten.</p>
        </div>
        <a className="adminBtn small" href="/admin/security">Sicherheit & 2FA öffnen</a>
      </header>

      {error && <div className="adminAlert">{error}</div>}
      {msg && <div className="adminAlertInfo">{msg}</div>}

      <section className="adminCard">
        <div className="adminCardListHead">
          <div>
            <h2 style={{ margin: 0 }}>Autorisierung</h2>
            <p className="adminMuted">Wenn du bereits als Live-Admin angemeldet bist, reicht deine Session. Für den ersten Admin kann der Railway Setup-Key genutzt werden.</p>
          </div>
          <button className="adminBtn small" onClick={load} disabled={busy}><RefreshCw size={14} /> {busy ? 'Lade …' : 'Neu laden'}</button>
        </div>
        <label className="adminLabel">
          Optionaler Setup-Key aus Railway ENV <code>ADMIN_PROFILE_SETUP_TOKEN</code>
          <input className="adminInput" value={setupToken} onChange={(e) => setSetupToken(e.target.value)} placeholder="Setup-Key optional" type="password" />
        </label>
      </section>

      <section className="adminCard">
        <h2><UserPlus size={16} /> Neues Adminprofil anlegen</h2>
        <div className="adminFormGrid">
          <label className="adminLabel">Benutzername<input className="adminInput" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="z. B. DominiqueMM" /></label>
          <label className="adminLabel">Anzeigename<input className="adminInput" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="z. B. Dominique" /></label>
          <label className="adminLabel">E-Mail für Live-Login<input className="adminInput" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@mecklenburgmarketing.de" type="email" /></label>
          <label className="adminLabel">Startpasswort<input className="adminInput" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="mind. 10 Zeichen + Sonderzeichen" type="password" /></label>
          <label className="adminLabel">Status<select className="adminInput" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">active</option><option value="pending">pending</option><option value="blocked">blocked</option></select></label>
        </div>
        <div className="adminActions mobileStickyActions">
          <button className="adminBtn" onClick={create} disabled={busy}><UserPlus size={14} /> {busy ? 'Speichert …' : 'Live-Admin erstellen'}</button>
        </div>
      </section>

      <section className="adminCard">
        <div className="adminCardListHead">
          <div>
            <h2 style={{ margin: 0 }}>Vorhandene Live-Adminprofile</h2>
            <p className="adminMuted">Aktive Admins: {activeCount}. Der letzte aktive Admin kann nicht gesperrt werden.</p>
          </div>
        </div>

        {profiles.length === 0 && <div className="adminMuted">Noch keine Adminprofile geladen.</div>}

        <table className="adminTable adminDesktopTable">
          <thead><tr><th>Name</th><th>E-Mail</th><th>Status</th><th>Rolle</th><th>Aktionen</th></tr></thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <td><b>{p.username || p.display_name || '—'}</b><br /><span className="adminMuted">{p.display_name || p.id}</span></td>
                <td>{p.email || '—'}</td>
                <td><span className={`adminBadge ${statusClass(p.status)}`}>{p.status || 'pending'}</span></td>
                <td>{p.role || 'admin'}</td>
                <td>
                  <div className="adminActions">
                    <button className="adminBtn small" onClick={() => setEdit({ ...p, password: '' })}>Bearbeiten</button>
                    <button className="adminBtn small" onClick={() => setStatus(p, p.status === 'blocked' ? 'active' : 'blocked')} disabled={busy}>
                      {p.status === 'blocked' ? <Unlock size={12} /> : <Lock size={12} />} {p.status === 'blocked' ? 'Aktivieren' : 'Sperren'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="adminMobileCardList">
          {profiles.map((p) => (
            <article className="adminMobileDataCard" key={`mobile-${p.id}`}>
              <div><span>Name</span><strong>{p.username || p.display_name || '—'}</strong></div>
              <div><span>E-Mail</span><strong>{p.email || '—'}</strong></div>
              <div><span>Status</span><strong>{p.status || 'pending'}</strong></div>
              <p>{p.role || 'admin'} · {p.id}</p>
              <div className="adminMobileCardActions">
                <button className="adminBtn small" onClick={() => setEdit({ ...p, password: '' })}>Bearbeiten</button>
                <button className="adminBtn small" onClick={() => setStatus(p, p.status === 'blocked' ? 'active' : 'blocked')} disabled={busy}>{p.status === 'blocked' ? 'Aktivieren' : 'Sperren'}</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {edit && (
        <section className="adminCard">
          <div className="adminCardListHead">
            <h2 style={{ margin: 0 }}>Adminprofil bearbeiten</h2>
            <button className="adminBtn small" onClick={() => setEdit(null)}><X size={14} /> Schließen</button>
          </div>
          <div className="adminFormGrid">
            <label className="adminLabel">Benutzername<input className="adminInput" value={edit.username || ''} onChange={(e) => setEdit({ ...edit, username: e.target.value })} /></label>
            <label className="adminLabel">Anzeigename<input className="adminInput" value={edit.display_name || ''} onChange={(e) => setEdit({ ...edit, display_name: e.target.value })} /></label>
            <label className="adminLabel">E-Mail<input className="adminInput" value={edit.email || ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} type="email" /></label>
            <label className="adminLabel">Neues Passwort optional<input className="adminInput" value={edit.password || ''} onChange={(e) => setEdit({ ...edit, password: e.target.value })} type="password" /></label>
            <label className="adminLabel">Status<select className="adminInput" value={edit.status || 'active'} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="active">active</option><option value="pending">pending</option><option value="blocked">blocked</option></select></label>
          </div>
          <div className="adminActions mobileStickyActions">
            <button className="adminBtn" onClick={saveEdit} disabled={busy}><Save size={14} /> Speichern</button>
          </div>
        </section>
      )}
    </main>
  )
}
