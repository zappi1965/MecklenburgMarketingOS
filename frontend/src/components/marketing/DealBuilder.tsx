'use client'

import { useEffect, useState } from 'react'
import ToolAccessGate from '@/components/security/ToolAccessGate'
import { resolveCustomerScope, customerOptionLabel, type CustomerOption } from '@/lib/adminCustomerScope'
import { dealClient, DealCampaign } from '@/lib/dealClient'
import { publicQrImage, absolutePublicUrl, buildShareLinks, copyToClipboard } from '@/lib/shareQr'

const EMPTY: Partial<DealCampaign> = { title: '', subtitle: '', body: '', discount_label: '', cta_label: 'Jetzt sichern', cta_url: '', expires_at: '' }

type DealBuilderProps = { preferredCustomerId?: string | null; embedded?: boolean }

export default function DealBuilder({ preferredCustomerId = null, embedded = false }: DealBuilderProps) {
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [deals, setDeals] = useState<DealCampaign[]>([])
  const [form, setForm] = useState<Partial<DealCampaign>>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function loadForCustomer(cid: string) {
    setCustomerId(cid)
    try {
      const res = await dealClient.list(cid)
      setDeals(res.deals || [])
    } catch (e: any) {
      setMsg(e?.message || 'Laden fehlgeschlagen.')
    }
  }

  async function load(preferred?: string | null) {
    const scope = await resolveCustomerScope(preferred || preferredCustomerId || customerId)
    setIsAdmin(scope.isAdmin)
    setCustomers(scope.customers)
    if (!scope.customerId) { setMsg('Kein Kunde ausgewählt oder zugeordnet.'); return }
    await loadForCustomer(scope.customerId)
  }
  useEffect(() => { void load(preferredCustomerId) }, [preferredCustomerId])

  async function save() {
    if (!customerId) return
    setMsg(null)
    try {
      if (editing) await dealClient.update(customerId, editing, form)
      else await dealClient.create(customerId, form)
      setForm(EMPTY); setEditing(null)
      await loadForCustomer(customerId)
      setMsg('Gespeichert.')
    } catch (e: any) { setMsg(e?.message || 'Speichern fehlgeschlagen.') }
  }

  async function toggle(d: DealCampaign) {
    if (!customerId) return
    await dealClient.setStatus(customerId, d.id, d.status === 'active' ? 'draft' : 'active')
    await loadForCustomer(customerId)
  }

  function publicUrl(d: DealCampaign) {
    return absolutePublicUrl(`/deal/${d.slug}`)
  }

  return (
    <ToolAccessGate toolKey="deal_of_week">
      <div className={embedded ? "" : "adminPage"}>
        {!embedded ? (
          <header className="adminHeader">
            <h1>Aktionen & Angebote</h1>
            <p>Zeitlich begrenzte Angebotsseiten als Ergänzung zu QR-Kampagnen: konkrete Wochenangebote, Rabatte oder Produktaktionen. Bonusaktionen wie doppelte Punkte bleiben weiterhin in der QR-Zielseite.</p>
          </header>
        ) : (
          <section className="adminCard" style={{ marginBottom: 16 }}>
            <h2>Aktionen & Angebote</h2>
            <p style={{ opacity: 0.78, margin: 0 }}>Hier geht es um konkrete kaufbare Angebote, z. B. „Cappuccino + Croissant“. Bonusmechaniken wie doppelte Punkte oder Extra-Stempel stellst du weiter in der QR-Zielseite ein.</p>
          </section>
        )}

        {isAdmin && !embedded ? (
          <section className="adminCard" style={{ display: 'grid', gap: 8, maxWidth: 620, marginBottom: 16 }}>
            <label><span>Kunde</span><select className="input" value={customerId || ''} onChange={(e) => { setForm(EMPTY); setEditing(null); void load(e.target.value) }}>{customers.map((c) => <option key={c.id} value={c.id}>{customerOptionLabel(c)}</option>)}</select></label>
            <p style={{ opacity: 0.7, margin: 0 }}>Aktionen & Angebote werden nur für den ausgewählten Kunden geladen und gespeichert.</p>
          </section>
        ) : null}

        <section className="adminCard" style={{ display: 'grid', gap: 10, maxWidth: 620 }}>
          <h2>{editing ? 'Angebot bearbeiten' : 'Neues Angebot / Wochenaktion'}</h2>
          <label><span>Titel</span><input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label><span>Untertitel</span><input className="input" value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></label>
          <label><span>Aktionslabel (z. B. „Wochenangebot", „-20%" oder „Happy Hour")</span><input className="input" value={form.discount_label || ''} onChange={(e) => setForm({ ...form, discount_label: e.target.value })} /></label>
          <label><span>Beschreibung</span><textarea className="input" value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
          <label><span>Bild-URL</span><input className="input" value={form.image_url || ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></label>
          <label><span>Button-Text</span><input className="input" value={form.cta_label || ''} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></label>
          <label><span>Button-Ziel (URL)</span><input className="input" value={form.cta_url || ''} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} /></label>
          <label><span>Gültig bis</span><input className="input" type="datetime-local" value={(form.expires_at || '').slice(0, 16)} onChange={(e) => setForm({ ...form, expires_at: e.target.value ? new Date(e.target.value).toISOString() : '' })} /></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={save}>{editing ? 'Aktualisieren' : 'Anlegen'}</button>
            {editing ? <button className="btn ghost" onClick={() => { setForm(EMPTY); setEditing(null) }}>Abbrechen</button> : null}
          </div>
          {msg ? <p style={{ opacity: 0.8 }}>{msg}</p> : null}
        </section>

        <section className="adminCard" style={{ marginTop: 16 }}>
          <h2>Aktive Angebote & Aktionsseiten</h2>
          {deals.map((d) => {
            const url = publicUrl(d)
            const share = buildShareLinks({ url, title: d.title, text: d.discount_label || '' })
            return (
              <div key={d.id} className="adminCard" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{d.title}</strong> <span style={{ opacity: 0.6 }}>({d.effective_status || d.status})</span>
                    <div style={{ fontSize: 13, opacity: 0.7 }}>{url}</div>
                    {d.expires_at ? <div style={{ fontSize: 13 }}>Gültig bis {new Date(d.expires_at).toLocaleString('de-DE')}</div> : null}
                  </div>
                  <img src={publicQrImage(url, 160)} alt="QR" width={120} height={120} style={{ borderRadius: 8 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  <button className="btn" onClick={() => toggle(d)}>{d.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}</button>
                  <button className="btn ghost" onClick={() => { setForm(d); setEditing(d.id) }}>Bearbeiten</button>
                  <button className="btn ghost" onClick={() => copyToClipboard(url)}>Link kopieren</button>
                  <a className="btn ghost" href={share.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
                  <a className="btn ghost" href={publicQrImage(url, 900)} target="_blank" rel="noreferrer">Schaufenster-QR</a>
                </div>
              </div>
            )
          })}
          {deals.length === 0 ? <p>Noch keine Angebote oder Aktionsseiten.</p> : null}
        </section>
      </div>
    </ToolAccessGate>
  )
}
