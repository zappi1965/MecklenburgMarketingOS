'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { CalendarClock, Scissors, Users, Clock, Settings, Plus, Trash2, RefreshCw, ExternalLink } from 'lucide-react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { storeClient } from '@/lib/storeClient'

type Tab = 'services' | 'resources' | 'hours' | 'settings'

const TABS: Array<{ key: Tab; label: string; icon: any }> = [
  { key: 'services', label: 'Leistungen', icon: Scissors },
  { key: 'resources', label: 'Mitarbeiter', icon: Users },
  { key: 'hours', label: 'Oeffnungszeiten', icon: Clock },
  { key: 'settings', label: 'Einstellungen', icon: Settings }
]

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

type Service = { id: string; name: string; duration_minutes: number; buffer_after_minutes: number; price_eur: number; active: boolean; category?: string | null; sort_order?: number }
type Resource = { id: string; name: string; role?: string | null; resource_type: string; active: boolean }
type Hours = { id: string; weekday: number; open_time: string; close_time: string; resource_id?: string | null }
type Settings = { id?: string; customer_id?: string; slot_granularity_minutes: number; min_lead_time_hours: number; max_advance_days: number; confirmation_mode: string; booking_slug?: string | null; active: boolean }

export default function BookingAdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [tab, setTab] = useState<Tab>('services')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const [services, setServices] = useState<Service[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [hours, setHours] = useState<Hours[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)

  // Form-State
  const [svcName, setSvcName] = useState('')
  const [svcDuration, setSvcDuration] = useState(30)
  const [svcBuffer, setSvcBuffer] = useState(0)
  const [svcPrice, setSvcPrice] = useState(0)

  const [resName, setResName] = useState('')
  const [resRole, setResRole] = useState('')
  const [resType, setResType] = useState('staff')

  const [hrWeekday, setHrWeekday] = useState(1)
  const [hrOpen, setHrOpen] = useState('09:00')
  const [hrClose, setHrClose] = useState('18:00')

  async function loadAll(cid: string) {
    if (!cid) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [svc, res, hrs, st] = await Promise.all([
        storeClient.list<Service>('booking_services', { customer_id: cid, limit: 200, order_by: 'sort_order' }).catch(() => ({ data: [] as Service[] })),
        storeClient.list<Resource>('booking_resources', { customer_id: cid, limit: 200 }).catch(() => ({ data: [] as Resource[] })),
        storeClient.list<Hours>('booking_business_hours', { customer_id: cid, limit: 200, order_by: 'weekday' }).catch(() => ({ data: [] as Hours[] })),
        storeClient.list<Settings>('booking_settings', { customer_id: cid, limit: 1 }).catch(() => ({ data: [] as Settings[] }))
      ])
      setServices((svc as any).data || [])
      setResources((res as any).data || [])
      setHours((hrs as any).data || [])
      setSettings(((st as any).data || [])[0] || null)
    } catch (e: any) { setError(e?.message || 'Konnte Buchungs-Daten nicht laden.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    (async () => {
      const profile = await getCurrentUserProfile()
      if (!profile) { setAuthorized(false); setLoading(false); return }
      setAuthorized(true)
      const cid = profile.customer_id || ''
      setCustomerId(cid)
      await loadAll(cid)
    })()
  }, [])

  function flash(msg: string) { setInfo(msg); setTimeout(() => setInfo(''), 4000) }

  async function addService() {
    if (!svcName.trim() || !customerId) return
    setBusy(true); setError('')
    try {
      await storeClient.create('booking_services', {
        customer_id: customerId, name: svcName.trim(),
        duration_minutes: Number(svcDuration) || 30,
        buffer_after_minutes: Number(svcBuffer) || 0,
        price_eur: Number(svcPrice) || 0, active: true
      })
      setSvcName(''); setSvcDuration(30); setSvcBuffer(0); setSvcPrice(0)
      flash('Leistung angelegt.')
      await loadAll(customerId)
    } catch (e: any) { setError(e?.message || 'Anlegen fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function addResource() {
    if (!resName.trim() || !customerId) return
    setBusy(true); setError('')
    try {
      await storeClient.create('booking_resources', {
        customer_id: customerId, name: resName.trim(),
        role: resRole.trim() || null, resource_type: resType, active: true
      })
      setResName(''); setResRole('')
      flash('Mitarbeiter/Ressource angelegt.')
      await loadAll(customerId)
    } catch (e: any) { setError(e?.message || 'Anlegen fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function addHours() {
    if (!customerId) return
    setBusy(true); setError('')
    try {
      await storeClient.create('booking_business_hours', {
        customer_id: customerId, weekday: Number(hrWeekday),
        open_time: hrOpen, close_time: hrClose
      })
      flash('Oeffnungszeit hinzugefuegt.')
      await loadAll(customerId)
    } catch (e: any) { setError(e?.message || 'Anlegen fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function removeRow(table: string, id: string) {
    setBusy(true); setError('')
    try { await storeClient.remove(table, id); await loadAll(customerId) }
    catch (e: any) { setError(e?.message || 'Loeschen fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  async function saveSettings(next: Settings) {
    if (!customerId) return
    setBusy(true); setError('')
    try {
      if (next.id) {
        await storeClient.update('booking_settings', next.id, {
          slot_granularity_minutes: Number(next.slot_granularity_minutes),
          min_lead_time_hours: Number(next.min_lead_time_hours),
          max_advance_days: Number(next.max_advance_days),
          confirmation_mode: next.confirmation_mode,
          booking_slug: next.booking_slug?.trim() || null,
          active: next.active
        })
      } else {
        await storeClient.create('booking_settings', { ...next, customer_id: customerId })
      }
      flash('Einstellungen gespeichert.')
      await loadAll(customerId)
    } catch (e: any) { setError(e?.message || 'Speichern fehlgeschlagen.') }
    finally { setBusy(false) }
  }

  const effectiveSettings: Settings = settings || {
    slot_granularity_minutes: 15, min_lead_time_hours: 2, max_advance_days: 60,
    confirmation_mode: 'auto', booking_slug: '', active: true
  }

  return (
    <main className="adminPage">
      <header className="adminHeader">
        <h1><CalendarClock size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Online-Terminbuchung</h1>
        <p>Leistungen, Mitarbeiter und Zeiten pflegen — Endkunden buchen selbst ueber das oeffentliche Widget. Schliesst die Luecke zu Shore / Treatwell.</p>
      </header>

      {authorized === false && <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>}
      {error && <div className="adminAlert">{error}</div>}
      {info && <div className="adminAlertInfo">{info}</div>}

      {authorized && !customerId && (
        <section className="adminCard"><p className="adminMuted">Dein Konto ist mit keinem Customer verknuepft. Buchung kann erst eingerichtet werden, wenn ein Customer zugeordnet ist.</p></section>
      )}

      {authorized && customerId && (
        <>
          <nav className="adminTabs" aria-label="Buchungs-Bereiche">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.key} type="button" className={tab === t.key ? 'adminTab active' : 'adminTab'}
                  aria-current={tab === t.key ? 'page' : undefined} onClick={() => setTab(t.key)}>
                  <Icon size={14} /> {t.label}
                </button>
              )
            })}
            <span className="adminTabSpacer" />
            {effectiveSettings.booking_slug && (
              <a className="adminBtn small" href={`/book/${effectiveSettings.booking_slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Widget oeffnen
              </a>
            )}
            <button type="button" className="adminBtn small" onClick={() => loadAll(customerId)} disabled={busy}>
              <RefreshCw size={14} /> Neu laden
            </button>
          </nav>

          {tab === 'services' && (
            <>
              <section className="adminCard">
                <h2>Neue Leistung</h2>
                <div className="adminGrid2">
                  <label className="adminLabel">Name<input className="adminInput" value={svcName} onChange={(e) => setSvcName(e.target.value)} placeholder="z.B. Herrenhaarschnitt" /></label>
                  <label className="adminLabel">Dauer (Min.)<input className="adminInput" type="number" min={5} step={5} value={svcDuration} onChange={(e) => setSvcDuration(Number(e.target.value))} /></label>
                  <label className="adminLabel">Puffer danach (Min.)<input className="adminInput" type="number" min={0} step={5} value={svcBuffer} onChange={(e) => setSvcBuffer(Number(e.target.value))} /></label>
                  <label className="adminLabel">Preis (EUR)<input className="adminInput" type="number" min={0} step={0.5} value={svcPrice} onChange={(e) => setSvcPrice(Number(e.target.value))} /></label>
                </div>
                <button type="button" className="adminBtn" onClick={addService} disabled={busy || !svcName.trim()}><Plus size={14} /> Leistung anlegen</button>
              </section>
              <section className="adminCard">
                <h2>Leistungen ({services.length})</h2>
                {loading && <div className="adminMuted">Lade …</div>}
                {!loading && services.length === 0 && <div className="adminMuted">Noch keine Leistungen angelegt.</div>}
                {!loading && services.length > 0 && (
                  <table className="adminTable">
                    <thead><tr><th>Name</th><th>Dauer</th><th>Puffer</th><th>Preis</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {services.map((s) => (
                        <tr key={s.id}>
                          <td>{s.name}</td>
                          <td>{s.duration_minutes} Min.</td>
                          <td>{s.buffer_after_minutes} Min.</td>
                          <td>{Number(s.price_eur).toFixed(2)} €</td>
                          <td><span className={`adminBadge ${s.active ? 'on' : 'off'}`}>{s.active ? 'aktiv' : 'inaktiv'}</span></td>
                          <td><button type="button" className="adminBtn small" onClick={() => removeRow('booking_services', s.id)} disabled={busy}><Trash2 size={12} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}

          {tab === 'resources' && (
            <>
              <section className="adminCard">
                <h2>Neuer Mitarbeiter / Ressource</h2>
                <div className="adminGrid2">
                  <label className="adminLabel">Name<input className="adminInput" value={resName} onChange={(e) => setResName(e.target.value)} placeholder="z.B. Anna M." /></label>
                  <label className="adminLabel">Rolle / Bezeichnung<input className="adminInput" value={resRole} onChange={(e) => setResRole(e.target.value)} placeholder="z.B. Stylistin" /></label>
                  <label className="adminLabel">Typ
                    <select className="adminInput" value={resType} onChange={(e) => setResType(e.target.value)}>
                      <option value="staff">Mitarbeiter</option>
                      <option value="room">Raum</option>
                      <option value="equipment">Geraet</option>
                    </select>
                  </label>
                </div>
                <button type="button" className="adminBtn" onClick={addResource} disabled={busy || !resName.trim()}><Plus size={14} /> Anlegen</button>
                <p className="adminMuted">Hinweis: Ist mindestens eine Ressource fuer eine Leistung hinterlegt, werden Slots ressourcen-genau geprueft. Ohne Zuordnung gelten die allgemeinen Oeffnungszeiten.</p>
              </section>
              <section className="adminCard">
                <h2>Mitarbeiter & Ressourcen ({resources.length})</h2>
                {!loading && resources.length === 0 && <div className="adminMuted">Noch keine Ressourcen angelegt.</div>}
                {resources.length > 0 && (
                  <table className="adminTable">
                    <thead><tr><th>Name</th><th>Rolle</th><th>Typ</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {resources.map((r) => (
                        <tr key={r.id}>
                          <td>{r.name}</td>
                          <td>{r.role || '—'}</td>
                          <td>{r.resource_type}</td>
                          <td><span className={`adminBadge ${r.active ? 'on' : 'off'}`}>{r.active ? 'aktiv' : 'inaktiv'}</span></td>
                          <td><button type="button" className="adminBtn small" onClick={() => removeRow('booking_resources', r.id)} disabled={busy}><Trash2 size={12} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}

          {tab === 'hours' && (
            <>
              <section className="adminCard">
                <h2>Oeffnungszeit hinzufuegen</h2>
                <div className="adminGrid2">
                  <label className="adminLabel">Wochentag
                    <select className="adminInput" value={hrWeekday} onChange={(e) => setHrWeekday(Number(e.target.value))}>
                      {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </label>
                  <label className="adminLabel">Von<input className="adminInput" type="time" value={hrOpen} onChange={(e) => setHrOpen(e.target.value)} /></label>
                  <label className="adminLabel">Bis<input className="adminInput" type="time" value={hrClose} onChange={(e) => setHrClose(e.target.value)} /></label>
                </div>
                <button type="button" className="adminBtn" onClick={addHours} disabled={busy}><Plus size={14} /> Hinzufuegen</button>
                <p className="adminMuted">Mehrere Bloecke pro Tag moeglich (z.B. mit Mittagspause: 09:00–12:00 und 14:00–18:00).</p>
              </section>
              <section className="adminCard">
                <h2>Zeiten ({hours.length})</h2>
                {!loading && hours.length === 0 && <div className="adminMuted">Noch keine Oeffnungszeiten — ohne Zeiten werden keine Slots angeboten.</div>}
                {hours.length > 0 && (
                  <table className="adminTable">
                    <thead><tr><th>Tag</th><th>Von</th><th>Bis</th><th></th></tr></thead>
                    <tbody>
                      {hours.map((h) => (
                        <tr key={h.id}>
                          <td>{WEEKDAYS[h.weekday] || h.weekday}</td>
                          <td>{h.open_time}</td>
                          <td>{h.close_time}</td>
                          <td><button type="button" className="adminBtn small" onClick={() => removeRow('booking_business_hours', h.id)} disabled={busy}><Trash2 size={12} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}

          {tab === 'settings' && (
            <section className="adminCard">
              <h2>Buchungs-Einstellungen</h2>
              <div className="adminGrid2">
                <label className="adminLabel">Slot-Raster (Min.)
                  <select className="adminInput" value={effectiveSettings.slot_granularity_minutes}
                    onChange={(e) => setSettings({ ...effectiveSettings, slot_granularity_minutes: Number(e.target.value) })}>
                    {[5, 10, 15, 20, 30, 60].map((g) => <option key={g} value={g}>{g} Min.</option>)}
                  </select>
                </label>
                <label className="adminLabel">Vorlaufzeit (Std.)<input className="adminInput" type="number" min={0} value={effectiveSettings.min_lead_time_hours}
                  onChange={(e) => setSettings({ ...effectiveSettings, min_lead_time_hours: Number(e.target.value) })} /></label>
                <label className="adminLabel">Max. Vorausbuchung (Tage)<input className="adminInput" type="number" min={1} value={effectiveSettings.max_advance_days}
                  onChange={(e) => setSettings({ ...effectiveSettings, max_advance_days: Number(e.target.value) })} /></label>
                <label className="adminLabel">Bestaetigung
                  <select className="adminInput" value={effectiveSettings.confirmation_mode}
                    onChange={(e) => setSettings({ ...effectiveSettings, confirmation_mode: e.target.value })}>
                    <option value="auto">Automatisch bestaetigen</option>
                    <option value="manual">Manuell freigeben</option>
                  </select>
                </label>
                <label className="adminLabel">Buchungs-Slug (URL)<input className="adminInput" value={effectiveSettings.booking_slug || ''}
                  onChange={(e) => setSettings({ ...effectiveSettings, booking_slug: e.target.value })} placeholder="z.B. salon-anna" /></label>
              </div>
              {effectiveSettings.booking_slug && (
                <p className="adminMuted">Oeffentliche Buchungs-URL: <code>/book/{effectiveSettings.booking_slug}</code></p>
              )}
              <button type="button" className="adminBtn" onClick={() => saveSettings(effectiveSettings)} disabled={busy}>Speichern</button>
            </section>
          )}
        </>
      )}
    </main>
  )
}
