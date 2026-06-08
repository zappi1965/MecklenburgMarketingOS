'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { Shield, RefreshCw, Save } from 'lucide-react'
import { storeClient } from '@/lib/storeClient'
import { getAdminSelectedCustomerId, onAdminCustomerSelected } from '@/lib/adminCustomerSelection'
import { customerToolModules } from '@/lib/customerToolModules'
import { customerPortalClient } from '@/lib/customerPortalClient'

type AccessRow = { id?: string; customer_id: string; tool_key: string; enabled?: boolean; visible_to_customer?: boolean; package_name?: string }

const normalize = (v:any) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

export default function ToolAccessV2Page() {
  const [customerId, setCustomerId] = useState('')
  const [rows, setRows] = useState<AccessRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const tools = useMemo(() => customerToolModules.map((m:any) => ({ key: normalize(m.key || m.shortTitle), label: m.shortTitle || m.title || m.key, packageMin: m.packageMin || '—', category: m.category || 'Tool' })), [])
  const enabled = useMemo(() => new Set(rows.filter((r) => r.enabled !== false).map((r) => r.tool_key)), [rows])

  async function load(cid = customerId) {
    if (!cid) return
    setBusy(true); setError(''); setInfo('')
    try {
      const r = await storeClient.list<AccessRow>('customer_tool_access', { customer_id: cid, limit: 500 })
      setRows((r as any).data || [])
    } catch (e:any) { setError(e?.message || 'Toolfreigaben konnten nicht geladen werden.') }
    finally { setBusy(false) }
  }

  useEffect(() => {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    if (cid) void load(cid)
    const off = onAdminCustomerSelected((id) => { setCustomerId(id); if (id) void load(id); else setRows([]) })
    return off
  }, [])

  async function toggle(toolKey: string) {
    if (!customerId) { setError('Bitte oben in der Backoffice-Kundensuche einen Kunden wählen.'); return }
    setBusy(true); setError(''); setInfo('')
    try {
      const existing = rows.find((r) => r.tool_key === toolKey)
      if (existing?.id) await storeClient.update('customer_tool_access', existing.id, { enabled: !enabled.has(toolKey), visible_to_customer: !enabled.has(toolKey) })
      else await storeClient.create('customer_tool_access', { customer_id: customerId, tool_key: toolKey, enabled: true, visible_to_customer: true, source: 'manual_admin' })
      await load(customerId)
      setInfo('Freigabe gespeichert.')
    } catch (e:any) { setError(e?.message || 'Speichern fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function syncPackage() {
    if (!customerId) { setError('Bitte oben in der Backoffice-Kundensuche einen Kunden wählen.'); return }
    setBusy(true); setError(''); setInfo('')
    try {
      await customerPortalClient.syncPackageAccess({ customer_id: customerId, actor_name: 'Backoffice' })
      await load(customerId)
      setInfo('Paketfreigaben synchronisiert.')
    } catch (e:any) { setError(e?.message || 'Synchronisierung fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><Shield size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Tool-Freigaben Pro</h1>
        <p>Freischaltungen pro Kunde. Wähle den Kunden oben in der Backoffice-Kundensuche.</p>
      </header>
      {!customerId && <div className="adminNotice">Bitte oben einen Kunden auswählen.</div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}
      <section className="adminCard">
        <div className="adminActions">
          <button className="adminBtn" onClick={() => load()} disabled={busy || !customerId}><RefreshCw size={14}/> Neu laden</button>
          <button className="adminBtn secondary" onClick={syncPackage} disabled={busy || !customerId}><Save size={14}/> Paketfreigaben synchronisieren</button>
        </div>
        <table className="adminTable adminDesktopTable">
          <thead><tr><th>Aktiv</th><th>Tool</th><th>Kategorie</th><th>Ab Paket</th></tr></thead>
          <tbody>
            {tools.map((t) => <tr key={t.key}><td><input type="checkbox" checked={enabled.has(t.key)} onChange={() => toggle(t.key)} disabled={busy || !customerId}/></td><td><b>{t.label}</b><br/><span className="adminMuted">{t.key}</span></td><td>{t.category}</td><td>{t.packageMin}</td></tr>)}
          </tbody>
        </table>
        <div className="adminMobileCardList">
          {tools.map((t) => (
            <article className="adminMobileDataCard" key={`mobile-${t.key}`}>
              <div><span>Tool</span><strong>{t.label}</strong></div>
              <div><span>Kategorie</span><strong>{t.category}</strong></div>
              <div><span>Ab Paket</span><strong>{t.packageMin}</strong></div>
              <p className="adminMuted">{t.key}</p>
              <label className="adminMobileToggle">
                <input type="checkbox" checked={enabled.has(t.key)} onChange={() => toggle(t.key)} disabled={busy || !customerId}/>
                <span>{enabled.has(t.key) ? 'Aktiv freigegeben' : 'Nicht freigegeben'}</span>
              </label>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
