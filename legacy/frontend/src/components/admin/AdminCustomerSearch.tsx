'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, Search, X } from 'lucide-react'
import { storeClient } from '@/lib/storeClient'
import { getCurrentUserProfile } from '@/lib/authClient'
import { getAdminSelectedCustomerId, setAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

type Customer = { id: string; name?: string; email?: string; status?: string; package_name?: string; requested_package?: string; city?: string }

function customerLabel(c?: Customer | null) {
  if (!c) return 'Kundenkontext wählen'
  return c.name || c.email || c.id
}

function customerMeta(c?: Customer | null) {
  if (!c) return 'Globaler Backoffice-Kontext'
  return [c.package_name || c.requested_package, c.status, c.city].filter(Boolean).join(' · ') || 'Kundenkontext aktiv'
}

export default function AdminCustomerSearch() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const profile = await getCurrentUserProfile()
        const role = String(profile?.role || '').toLowerCase()
        if (!mounted || !['admin', 'super_admin'].includes(role)) return
        setIsAdmin(true)
        const stored = getAdminSelectedCustomerId()
        if (stored) setSelected(stored)
        const r = await storeClient.list<Customer>('customers', { limit: 300, order_by: 'created_at', order_dir: 'desc' })
        if (!mounted) return
        setCustomers((r as any).data || [])
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Kunden konnten nicht geladen werden.')
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('adminCustomerSheetLocked', sheetOpen)
    return () => document.body.classList.remove('adminCustomerSheetLocked')
  }, [sheetOpen])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers.slice(0, 80)
    return customers
      .filter((c) => [c.name, c.email, c.city, c.status, c.package_name, c.requested_package, c.id].some((v) => String(v || '').toLowerCase().includes(q)))
      .slice(0, 80)
  }, [customers, query])

  if (!isAdmin) return null

  function choose(id: string) {
    setSelected(id)
    setAdminSelectedCustomerId(id)
    setSheetOpen(false)
  }

  function clearCustomer() {
    setSelected('')
    setAdminSelectedCustomerId('')
    setSheetOpen(false)
  }

  const current = customers.find((c) => c.id === selected)
  const recent = customers.slice(0, 8)

  return (
    <div className="adminCustomerSearch">
      <div className="adminCustomerDesktop">
        <Search size={15} />
        <input className="adminInput" placeholder="Kunde suchen…" value={query} onChange={(e) => setQuery(e.target.value)} title="Backoffice-Kundensuche" />
        <select className="adminInput" value={selected} onChange={(e) => choose(e.target.value)} title={current ? `${current.name || current.email} · ${current.status || ''}` : 'Kundenkontext wählen'}>
          <option value="">Kundenkontext wählen</option>
          {filtered.map((c) => (
            <option key={c.id} value={c.id}>{c.name || c.email || c.id} {c.package_name ? `· ${c.package_name}` : ''}</option>
          ))}
        </select>
      </div>

      <button type="button" className="adminCustomerPickerTrigger" onClick={() => setSheetOpen(true)}>
        <Building2 size={16} />
        <span>
          <strong>{customerLabel(current)}</strong>
          <small>{customerMeta(current)}</small>
        </span>
      </button>

      {sheetOpen && (
        <div className="adminCustomerSheetOverlay" onClick={() => setSheetOpen(false)}>
          <section className="adminCustomerSheet" onClick={(e) => e.stopPropagation()} aria-label="Kundenkontext wählen">
            <div className="adminCustomerSheetHandle" />
            <div className="adminCustomerSheetHeader">
              <div>
                <b>Kundenkontext wählen</b>
                <p>Dieser Kunde steuert POS, Umsatz-Prognose, Reviews, Tool-Freigaben und Reports.</p>
              </div>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Schließen"><X size={18} /></button>
            </div>

            <label className="adminCustomerSheetSearch">
              <Search size={15} />
              <input autoFocus placeholder="Name, E-Mail, Ort, Paket suchen …" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>

            {selected && (
              <button type="button" className="adminCustomerCard adminCustomerCardClear" onClick={clearCustomer}>
                <span>Globaler Backoffice-Kontext</span>
                <small>Kundenfilter entfernen</small>
              </button>
            )}

            {!query.trim() && recent.length > 0 && <div className="adminCustomerSheetLabel">Zuletzt / Neueste Kunden</div>}

            <div className="adminCustomerSheetList">
              {filtered.map((c) => {
                const active = c.id === selected
                return (
                  <button type="button" key={c.id} className={active ? 'adminCustomerCard active' : 'adminCustomerCard'} onClick={() => choose(c.id)}>
                    <span>{customerLabel(c)}</span>
                    <small>{customerMeta(c)}</small>
                    <em>{active ? 'Aktiv' : 'Wählen'}</em>
                  </button>
                )
              })}
              {filtered.length === 0 && <div className="adminMuted">Keine Kunden gefunden.</div>}
            </div>
          </section>
        </div>
      )}

      {error && <span className="adminMuted" title={error}>Kundensuche nicht geladen</span>}
    </div>
  )
}
