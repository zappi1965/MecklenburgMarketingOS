'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { CreditCard, RefreshCw } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { getAdminSelectedCustomerId, onAdminCustomerSelected } from '@/lib/adminCustomerSelection'
import { posClient, type PosTransaction } from '@/lib/deToolsClients'

function money(n?: number, cur = 'EUR') { return n == null ? '—' : `${Number(n).toFixed(2)} ${cur}` }

function statusBadge(s?: string) {
  const v = String(s || '').toLowerCase()
  if (['paid', 'success', 'successful', 'completed'].includes(v)) return 'on'
  if (['failed', 'declined', 'error', 'refunded'].includes(v)) return 'off'
  return ''
}

export default function PosPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [tx, setTx] = useState<PosTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(cid: string) {
    setLoading(true); setError('')
    try {
      const r = await posClient.listTransactions(cid)
      setTx(r.transactions || [])
    } catch (e: any) { setError(e?.message || 'Transaktionen konnten nicht geladen werden.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const profile = await getCurrentUserProfile()
      if (!mounted) return
      if (!profile) { setAuthorized(false); setLoading(false); return }
      const role = String(profile.role || '').toLowerCase()
      const admin = role === 'admin' || role === 'super_admin'
      setIsAdmin(admin)
      setAuthorized(true)
      const cid = profile.customer_id || (admin ? getAdminSelectedCustomerId() : '') || ''
      setCustomerId(cid)
      if (cid) await load(cid); else setLoading(false)
    })()
    const off = onAdminCustomerSelected((cid) => {
      setCustomerId(cid)
      if (cid) void load(cid)
    })
    return () => { mounted = false; off() }
  }, [])

  const total = tx.filter((t) => statusBadge(t.status) === 'on').reduce((s, t) => s + (Number(t.amount) || 0), 0)

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><CreditCard size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Kassen-Anbindung (POS)</h1>
        <p>Eingehende Kassen-/Kartenzahlungen (z.B. SumUp) als Live-Transaktionsliste. Webhook-Endpunkt: <code>/api/pos/webhook/&lt;provider&gt;</code>.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {authorized && !customerId && <section className="adminCard"><p className="adminMuted">{isAdmin ? 'Bitte oben in der Backoffice-Kundensuche einen Kunden wählen.' : 'Dein Konto ist mit keinem Customer verknuepft.'}</p></section>}
      {error && <div className="adminAlert">{error}</div>}

      {authorized && customerId && (
        <>
          <section className="adminCard">
            <div className="adminActions">
              <h2 style={{ margin: 0 }}>Transaktionen ({tx.length})</h2>
              <span className="adminTabSpacer" />
              <button type="button" className="adminBtn small" onClick={() => load(customerId)} disabled={loading}><RefreshCw size={14} /> Neu laden</button>
            </div>
            {!loading && tx.length > 0 && <p className="adminMuted">Summe erfolgreicher Zahlungen: <strong>{money(total)}</strong></p>}
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && tx.length === 0 && <div className="adminMuted">Noch keine POS-Transaktionen. Verbinde einen Anbieter ueber den Webhook.</div>}
            {!loading && tx.length > 0 && (
              <table className="adminTable">
                <thead><tr><th>Zeit</th><th>Anbieter</th><th>Referenz</th><th>Betrag</th><th>Status</th></tr></thead>
                <tbody>
                  {tx.map((t) => (
                    <tr key={t.id}>
                      <td>{t.transaction_time ? new Date(t.transaction_time).toLocaleString('de-DE') : '—'}</td>
                      <td>{t.provider || '—'}</td>
                      <td>{t.reference || t.id.slice(0, 8)}</td>
                      <td>{money(t.amount, t.currency || 'EUR')}</td>
                      <td><span className={`adminBadge ${statusBadge(t.status)}`}>{t.status || '—'}</span></td>
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
