'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import documentMediaClient, { type MediaDocument } from '@/lib/documentMediaClient'
import ToolAccessGate from '@/components/security/ToolAccessGate'

function dateLabel(row: MediaDocument) {
  return String(row.created_at || row.updated_at || '').slice(0, 10) || '—'
}

function formatSize(size?: number) {
  if (!size) return '—'
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

export default function PortalReportsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [docs, setDocs] = useState<MediaDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const p = await getCurrentUserProfile()
      setProfile(p)
      const customerId = p?.customer_id
      if (!customerId) {
        setDocs([])
        setError('Kein Kunde mit diesem Zugang verknuepft.')
        return
      }
      const result = await documentMediaClient.listCustomerDocuments(customerId)
      setDocs(result.documents || [])
    } catch (e: any) {
      setError(e?.message || 'Dokumente konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  async function openDocument(doc: MediaDocument) {
    try {
      const customerId = profile?.customer_id || doc.customer_id
      if (!customerId) throw new Error('customer_id fehlt.')
      if (doc.url) {
        window.open(doc.url, '_blank', 'noopener,noreferrer')
        return
      }
      const resolved = await documentMediaClient.resolveDownload(customerId, doc.source, doc.id)
      if (resolved.url) window.open(resolved.url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      setError(e?.message || 'Download-Link konnte nicht erstellt werden.')
    }
  }

  useEffect(() => { void load() }, [])

  const customerLabel = useMemo(() => profile?.customer_name || profile?.display_name || profile?.email || 'Ihr Kundenbereich', [profile])

  return (
    <ToolAccessGate toolKey="media_center">
      <main className="adminPage">
        <header className="adminHeader">
          <h1><FileText size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Reports & PDFs</h1>
          <p>Hier sehen Sie freigegebene Reports, Angebote, Verträge und Dokumente für {customerLabel}.</p>
        </header>

        {error && <div className="adminAlert">{error}</div>}

        <section className="adminCard">
          <div className="adminActions">
            <h2 style={{ margin: 0 }}>Freigegebene Dokumente ({docs.length})</h2>
            <span className="adminTabSpacer" />
            <button type="button" className="adminBtn small" onClick={load} disabled={loading}>
              <RefreshCw size={14} /> {loading ? 'Lade …' : 'Neu laden'}
            </button>
          </div>

          {docs.length === 0 && !loading && <p className="adminMuted">Noch keine freigegebenen Dokumente vorhanden.</p>}

          {docs.length > 0 && (
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Titel</th>
                  <th>Typ</th>
                  <th>Status</th>
                  <th>Datum</th>
                  <th>Größe</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, index) => (
                  <tr key={doc.id || `${doc.source}-${index}`}>
                    <td>{doc.title || 'Dokument'}</td>
                    <td>{doc.type || doc.source || 'PDF'}</td>
                    <td>{doc.status || 'freigegeben'}</td>
                    <td>{dateLabel(doc)}</td>
                    <td>{formatSize(doc.size_bytes)}</td>
                    <td>
                      <button className="adminBtn small" type="button" onClick={() => openDocument(doc)}>
                        <Download size={14} /> Öffnen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </ToolAccessGate>
  )
}
