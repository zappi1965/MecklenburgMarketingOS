'use client'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { apiKeysClient, type ApiKey } from '@/lib/adminToolsClients'

export const dynamic = 'force-dynamic'

export default function ApiKeysAdminPage() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState<string>('')
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [availableScopes, setAvailableScopes] = useState<string[]>([])
  const [name, setName] = useState('')
  const [chosenScopes, setChosenScopes] = useState<string[]>([])
  const [newKey, setNewKey] = useState<ApiKey | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    if (!customerId) return
    try {
      const r = await apiKeysClient.list(customerId)
      setKeys(r.keys || [])
    } catch (e: any) {
      setError(e?.message || 'Keys konnten nicht geladen werden.')
    }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); setLoading(false); return }
      setAuthorized(true)
      setCustomerId(profile.customer_id || '')
      try {
        const s = await apiKeysClient.scopes()
        setAvailableScopes(s.scopes || [])
      } catch {}
      if (profile.customer_id) {
        const r = await apiKeysClient.list(profile.customer_id)
        setKeys(r.keys || [])
      }
      setLoading(false)
    })()
  }, [])

  async function create() {
    setBusy(true); setError(''); setNewKey(null)
    try {
      const r = await apiKeysClient.create(customerId, name.trim(), chosenScopes)
      setNewKey(r.key)
      setName(''); setChosenScopes([])
      await refresh()
    } catch (e: any) {
      setError(e?.message || 'Erstellung fehlgeschlagen.')
    } finally { setBusy(false) }
  }

  async function revoke(id: string) {
    if (!confirm('Diesen Key wirklich widerrufen? Alle Apps, die ihn verwenden, verlieren sofort Zugriff.')) return
    setBusy(true); setError('')
    try {
      await apiKeysClient.revoke(customerId, id)
      await refresh()
    } catch (e: any) {
      setError(e?.message || 'Widerruf fehlgeschlagen.')
    } finally { setBusy(false) }
  }

  function toggleScope(s: string) {
    setChosenScopes((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1>API-Keys</h1>
        <p>Verwalte API-Keys fuer externe Integrationen (Zapier, n8n, eigene Apps). Keys werden nur EINMALIG beim Anlegen vollstaendig angezeigt.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}

      {newKey?.fullKey && (
        <section className="adminCard adminHighlight">
          <h2>Neuer Key — bitte JETZT kopieren</h2>
          <p>Diese Anzeige erscheint nur EINMAL. Speichere ihn in deinem Passwort-Manager.</p>
          <code className="adminCode">{newKey.fullKey}</code>
          <div className="adminMuted">Scopes: {newKey.scopes.join(', ') || '—'}</div>
        </section>
      )}

      {authorized && (
        <>
          <section className="adminCard">
            <h2>Neuen Key anlegen</h2>
            <label className="adminLabel">
              Name (z.B. "Zapier Integration")
              <input className="adminInput" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="adminLabel">
              <span>Scopes</span>
              <div className="adminChips">
                {availableScopes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={chosenScopes.includes(s) ? 'adminChip on' : 'adminChip'}
                    onClick={() => toggleScope(s)}
                  >{s}</button>
                ))}
              </div>
            </div>
            <button type="button" className="adminBtn" onClick={create} disabled={busy || !name.trim() || chosenScopes.length === 0}>
              {busy ? 'Erzeuge …' : 'Key erzeugen'}
            </button>
          </section>

          <section className="adminCard">
            <h2>Vorhandene Keys ({keys.length})</h2>
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && keys.length === 0 && <div className="adminMuted">Noch keine Keys angelegt.</div>}
            {!loading && keys.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id}>
                      <td>{k.name}</td>
                      <td><code>{k.key_prefix}…</code></td>
                      <td>{k.scopes.join(', ') || '—'}</td>
                      <td>{k.revoked_at ? <span className="adminBadge off">widerrufen</span> : <span className="adminBadge on">aktiv</span>}</td>
                      <td>
                        {!k.revoked_at && (
                          <button type="button" className="adminBtn danger small" onClick={() => revoke(k.id)} disabled={busy}>
                            Widerrufen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  )
}
