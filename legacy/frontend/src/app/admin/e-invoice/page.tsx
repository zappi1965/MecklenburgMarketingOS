'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { FileCode2, Download, Eye, RefreshCw } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { storeClient } from '@/lib/storeClient'
import { eInvoiceClient } from '@/lib/deToolsClients'

type Invoice = { id: string; invoice_number?: string; total?: number; amount?: number; status?: string; issued_at?: string; created_at?: string }

function money(n?: number) { return n == null ? '—' : `${Number(n).toFixed(2)} €` }

export default function EInvoicePage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ id: string; xml: string } | null>(null)

  async function load(cid: string, adminMode = false) {
    setLoading(true); setError('')
    try {
      const query:any = { limit: 100, order_by: 'created_at', order_dir: 'desc' }
      if (cid) query.customer_id = cid
      const r = await storeClient.list<Invoice>('invoices', query)
      setInvoices((r as any).data || [])
    } catch (e: any) { setError(e?.message || 'Rechnungen konnten nicht geladen werden.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); setLoading(false); return }
      const admin = ['admin','super_admin'].includes(String(profile.role || '').toLowerCase())
      setAuthorized(true)
      setIsAdmin(admin)
      const cid = profile.customer_id || ''
      setCustomerId(cid)
      await load(cid, admin)
    })()
  }, [])

  async function showPreview(id: string) {
    setBusy(id + ':preview'); setError(''); setPreview(null)
    try {
      const r = await eInvoiceClient.preview(id)
      setPreview({ id, xml: r.xml })
    } catch (e: any) { setError(e?.message || 'Vorschau fehlgeschlagen.') }
    finally { setBusy('') }
  }

  async function dl(id: string, kind: 'xml' | 'zugferd') {
    setBusy(id + ':' + kind); setError('')
    try {
      if (kind === 'xml') await eInvoiceClient.downloadXml(id)
      else await eInvoiceClient.downloadZugferd(id)
    } catch (e: any) { setError(e?.message || 'Download fehlgeschlagen.') }
    finally { setBusy('') }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><FileCode2 size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> E-Rechnung (XRechnung / ZUGFeRD)</h1>
        <p>Erzeuge gesetzeskonforme E-Rechnungen (UBL 2.1) fuer den B2B-Versand. Pflicht im deutschen B2B-Geschaeft.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {authorized && !customerId && !isAdmin && <section className="adminCard"><p className="adminMuted">Dein Konto ist mit keinem Customer verknuepft.</p></section>}
      {authorized && !customerId && isAdmin && <section className="adminCard"><p className="adminMuted">Admin-Modus: Es werden alle Rechnungen angezeigt. Ein Customer-Link ist für diesen Admin-Zugang nicht nötig.</p></section>}
      {error && <div className="adminAlert">{error}</div>}

      {authorized && (customerId || isAdmin) && (
        <>
          <section className="adminCard">
            <div className="adminActions">
              <h2 style={{ margin: 0 }}>Rechnungen ({invoices.length})</h2>
              <span className="adminTabSpacer" />
              <button type="button" className="adminBtn small" onClick={() => load(customerId, isAdmin)} disabled={loading}><RefreshCw size={14} /> Neu laden</button>
            </div>
            {loading && <div className="adminMuted">Lade …</div>}
            {!loading && invoices.length === 0 && <div className="adminMuted">Keine Rechnungen vorhanden.</div>}
            {!loading && invoices.length > 0 && (
              <table className="adminTable adminDesktopTable">
                <thead><tr><th>Nummer</th><th>Betrag</th><th>Status</th><th>Datum</th><th>E-Rechnung</th></tr></thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.invoice_number || inv.id.slice(0, 8)}</td>
                      <td>{money(inv.total ?? inv.amount)}</td>
                      <td>{inv.status || '—'}</td>
                      <td>{(inv.issued_at || inv.created_at || '').slice(0, 10) || '—'}</td>
                      <td>
                        <div className="adminActions" style={{ gap: 4 }}>
                          <button type="button" className="adminBtn small" onClick={() => showPreview(inv.id)} disabled={!!busy}><Eye size={12} /> XML</button>
                          <button type="button" className="adminBtn small" onClick={() => dl(inv.id, 'xml')} disabled={!!busy}><Download size={12} /> XRechnung</button>
                          <button type="button" className="adminBtn small" onClick={() => dl(inv.id, 'zugferd')} disabled={!!busy}><Download size={12} /> ZUGFeRD</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && invoices.length > 0 && (
              <div className="adminMobileCardList">
                {invoices.map((inv) => (
                  <article className="adminMobileDataCard" key={`mobile-${inv.id}`}>
                    <div><span>Nummer</span><strong>{inv.invoice_number || inv.id.slice(0, 8)}</strong></div>
                    <div><span>Betrag</span><strong>{money(inv.total ?? inv.amount)}</strong></div>
                    <div><span>Status</span><strong>{inv.status || '—'}</strong></div>
                    <p>{(inv.issued_at || inv.created_at || '').slice(0, 10) || 'Kein Datum'}</p>
                    <div className="adminMobileCardActions">
                      <button type="button" className="adminBtn small" onClick={() => showPreview(inv.id)} disabled={!!busy}><Eye size={12} /> XML</button>
                      <button type="button" className="adminBtn small" onClick={() => dl(inv.id, 'xml')} disabled={!!busy}><Download size={12} /> XRechnung</button>
                      <button type="button" className="adminBtn small" onClick={() => dl(inv.id, 'zugferd')} disabled={!!busy}><Download size={12} /> ZUGFeRD</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {preview && (
            <section className="adminCard">
              <h2>XML-Vorschau — {preview.id.slice(0, 8)}</h2>
              <textarea className="adminInput" readOnly rows={16} value={preview.xml} style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </section>
          )}
        </>
      )}
    </main>
  )
}
