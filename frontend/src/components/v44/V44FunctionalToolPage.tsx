'use client'

import { useEffect, useMemo, useState } from 'react'
import LegalFooter from '@/components/legal/LegalFooter'
import {
  buildPublicUrl,
  customerName,
  insertRow,
  loadV44Context,
  matchesCustomer,
  summarizeStatus,
  updateRow,
  uid,
  currentModeLabel,
  upsertLocalDemoData,
  type V44Context,
  type V44ModuleKey,
  type V44TableName
} from '@/lib/v44FunctionalToolsClient'

type Config = {
  key: V44ModuleKey
  title: string
  subtitle: string
  primaryTable: V44TableName
  secondaryTable?: V44TableName
  existingLabels: Array<{ table: V44TableName; label: string }>
}

const configs: Record<V44ModuleKey, Config> = {
  listing_management: {
    key: 'listing_management',
    title: 'Listings / Branchenbuch-Sync',
    subtitle: 'NAP-Daten, Google, Apple Maps, Bing, Facebook und Branchenbuch-Eintraege kundengenau pruefen und verwalten.',
    primaryTable: 'local_listings',
    existingLabels: [
      { table: 'customers', label: 'Kunden' },
      { table: 'seo_snapshots', label: 'SEO Snapshots' },
      { table: 'integrations', label: 'Integrationen' },
      { table: 'competitor_benchmarks', label: 'Wettbewerber' }
    ]
  },
  booking_utilization: {
    key: 'booking_utilization',
    title: 'Termin- & Auslastungssystem',
    subtitle: 'Freie Slots, Warteliste, Rebooking und vorhandene Termine in einem Modul verknuepfen.',
    primaryTable: 'booking_slots',
    secondaryTable: 'booking_waitlist',
    existingLabels: [
      { table: 'customers', label: 'Kunden' },
      { table: 'appointments', label: 'bestehende Termine' },
      { table: 'tickets', label: 'Tickets' }
    ]
  },
  unified_inbox: {
    key: 'unified_inbox',
    title: 'Nachrichten-Zentrale',
    subtitle: 'Formularanfragen, Tickets, Review-Feedback, Leads und interne Notizen in einer Inbox zusammenfuehren.',
    primaryTable: 'unified_messages',
    existingLabels: [
      { table: 'customers', label: 'Kunden' },
      { table: 'tickets', label: 'Tickets' },
      { table: 'review_feedback', label: 'Review Feedback' },
      { table: 'prospect_leads', label: 'Leads' }
    ]
  },
  payments_vouchers: {
    key: 'payments_vouchers',
    title: 'Zahlungen & Gutscheine',
    subtitle: 'Zahlungslinks, Anzahlungen, Gutscheine und bestehende Rechnungen/Loyalty-Rewards verbinden.',
    primaryTable: 'payment_links',
    secondaryTable: 'voucher_products',
    existingLabels: [
      { table: 'customers', label: 'Kunden' },
      { table: 'invoices', label: 'Rechnungen' },
      { table: 'loyalty_rewards', label: 'Loyalty Rewards' }
    ]
  },
  referral_program: {
    key: 'referral_program',
    title: 'Empfehlungsprogramm',
    subtitle: 'Empfehlungslinks, QR-Kampagnen, Prämien und Loyalty-Daten kundenspezifisch verbinden.',
    primaryTable: 'referral_campaigns',
    secondaryTable: 'referral_events',
    existingLabels: [
      { table: 'customers', label: 'Kunden' },
      { table: 'qr_campaigns', label: 'QR Kampagnen' },
      { table: 'loyalty_rewards', label: 'Rewards' },
      { table: 'loyalty_customers', label: 'Loyalty Kunden' }
    ]
  }
}

function eur(value: any) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0))
}

function fmtDate(value: any) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('de-DE')
  } catch {
    return String(value)
  }
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <div className="card">
      <div className="sub">{label}</div>
      <strong style={{ fontSize: 24 }}>{value}</strong>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', options }: any) {
  if (options) {
    return (
      <label>
        <span>{label}</span>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {options.map((option: any) => (
            <option key={String(option.value)} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    )
  }
  return (
    <label>
      <span>{label}</span>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Table({ rows, columns, empty = 'Keine Datensaetze vorhanden.' }: any) {
  if (!rows.length) return <p className="sub">{empty}</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="adminTable">
        <thead>
          <tr>{columns.map((c: any) => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.id || JSON.stringify(row)}>
              {columns.map((c: any) => <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '-')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function linkedInboxRows(ctx: V44Context, customerId: string) {
  const tickets = (ctx.tickets || []).filter((r) => matchesCustomer(r, customerId)).map((r) => ({
    id: `ticket_${r.id}`,
    source: 'Ticket',
    subject: r.title || r.subject || 'Ticket',
    body: r.message || r.description || r.status || '',
    status: r.status || 'Offen',
    customer_id: r.customer_id,
    created_at: r.created_at
  }))
  const reviews = (ctx.review_feedback || []).filter((r) => matchesCustomer(r, customerId)).map((r) => ({
    id: `review_${r.id}`,
    source: 'Review',
    subject: `${r.rating || r.stars || '?'} Sterne Feedback`,
    body: r.message || r.feedback || r.comment || '',
    status: r.status || 'Neu',
    customer_id: r.customer_id,
    created_at: r.created_at
  }))
  const leads = (ctx.prospect_leads || []).filter((r) => matchesCustomer(r, customerId) || !customerId).map((r) => ({
    id: `lead_${r.id}`,
    source: 'Lead',
    subject: r.name || 'Lead',
    body: [r.branch, r.city, r.reasons?.join?.(', ')].filter(Boolean).join(' · '),
    status: r.status || 'Neu',
    customer_id: r.customer_id,
    created_at: r.created_at
  }))
  return [...tickets, ...reviews, ...leads]
}

export default function V44FunctionalToolPage({ moduleKey }: { moduleKey: V44ModuleKey }) {
  const config = configs[moduleKey]
  const [ctx, setCtx] = useState<V44Context | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [form, setForm] = useState<any>({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function reload() {
    const loaded = await loadV44Context()
    setCtx(loaded)
    if (!selectedCustomer && loaded.customers?.[0]?.id) setSelectedCustomer(loaded.customers[0].id)
  }

  useEffect(() => { void reload() }, [])

  const customers = ctx?.customers || []
  const primaryRows = useMemo(() => (ctx?.[config.primaryTable] || []).filter((r) => matchesCustomer(r, selectedCustomer)), [ctx, config.primaryTable, selectedCustomer])
  const secondaryRows = useMemo(() => config.secondaryTable ? (ctx?.[config.secondaryTable] || []).filter((r) => matchesCustomer(r, selectedCustomer)) : [], [ctx, config.secondaryTable, selectedCustomer])
  const statusSummary = summarizeStatus(primaryRows)
  const customerOptions = [{ value: '', label: 'Alle Kunden' }, ...customers.map((c) => ({ value: c.id, label: c.name || c.email || c.id }))]

  async function createPrimary() {
    if (!ctx) return
    setBusy(true)
    setNotice('')
    try {
      const customer_id = selectedCustomer || form.customer_id || customers[0]?.id || ''
      if (moduleKey === 'listing_management') {
        await insertRow('local_listings', {
          customer_id,
          platform: form.platform || 'Google Business Profile',
          listing_url: form.listing_url || '',
          status: form.status || 'Zu pruefen',
          nap_score: Number(form.nap_score || 80),
          notes: form.notes || ''
        })
      }
      if (moduleKey === 'booking_utilization') {
        if (form.kind === 'waitlist') {
          await insertRow('booking_waitlist', {
            customer_id,
            client_name: form.client_name || 'Neuer Wartelisten-Kunde',
            request: form.request || 'Terminwunsch',
            preferred_at: form.preferred_at || '',
            phone: form.phone || '',
            status: 'Wartet'
          })
        } else {
          await insertRow('booking_slots', {
            customer_id,
            title: form.title || 'Freier Slot',
            service_name: form.service_name || 'Leistung',
            starts_at: form.starts_at || new Date().toISOString(),
            ends_at: form.ends_at || '',
            capacity: Number(form.capacity || 1),
            status: form.status || 'Frei'
          })
        }
      }
      if (moduleKey === 'unified_inbox') {
        await insertRow('unified_messages', {
          customer_id,
          channel: form.channel || 'Manuell',
          subject: form.subject || 'Neue Nachricht',
          body: form.body || '',
          status: form.status || 'Neu',
          assigned_to: form.assigned_to || ''
        })
      }
      if (moduleKey === 'payments_vouchers') {
        if (form.kind === 'voucher') {
          await insertRow('voucher_products', {
            customer_id,
            title: form.title || 'Gutschein',
            amount: Number(form.amount || 25),
            validity_days: Number(form.validity_days || 365),
            status: form.status || 'Aktiv'
          })
        } else {
          const id = uid('pay')
          await insertRow('payment_links', {
            id,
            customer_id,
            title: form.title || 'Zahlungslink',
            amount: Number(form.amount || 50),
            provider: form.provider || 'extern',
            due_at: form.due_at || '',
            status: form.status || 'Offen',
            payment_url: buildPublicUrl(`/pay/${id}`)
          })
        }
      }
      if (moduleKey === 'referral_program') {
        const code = (form.code || uid('ref')).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)
        await insertRow('referral_campaigns', {
          customer_id,
          name: form.name || 'Empfehlungsaktion',
          reward: form.reward || '5 EUR Gutschein',
          status: form.status || 'Aktiv',
          referral_code: code,
          public_url: buildPublicUrl(`/r/${code}`)
        })
      }
      setForm({})
      setNotice('Gespeichert und mit Kunde/Datenkontext verknuepft.')
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function markDone(table: V44TableName, row: any) {
    await updateRow(table, row.id, { status: row.status === 'Erledigt' ? 'Offen' : 'Erledigt' })
    await reload()
  }

  if (!ctx) {
    return (
      <main className="legalPage">
        <section className="legalCard"><p>Lade Modul-Daten ...</p></section>
      </main>
    )
  }

  return (
    <main className="legalPage">
      <section className="legalCard">
        <a className="legalBack" href="/tools">← Zur Tool-Uebersicht</a>
        <p className="eyebrow">V45 Stabilitaet · {currentModeLabel()}</p>
        <h1>{config.title}</h1>
        <p>{config.subtitle}</p>
        <div className="row gap"><button className="btn secondary" onClick={async () => { await upsertLocalDemoData(); await reload(); setNotice('Demo-Daten wurden lokal aufgefuellt.') }}>Demo-Daten auffuellen</button></div>
        <div className="grid three">
          <Metric label="Neue Modul-Datensaetze" value={primaryRows.length} />
          <Metric label="Verknuepfte Kunden" value={customers.length} />
          <Metric label="Statusarten" value={Object.keys(statusSummary).length || 0} />
        </div>
      </section>

      <section className="legalCard">
        <h2>Kundenauswahl</h2>
        <Field
          label="Kunde"
          value={selectedCustomer}
          onChange={setSelectedCustomer}
          options={customerOptions}
        />
      </section>

      <section className="legalCard">
        <h2>Neuen Datensatz anlegen</h2>
        {moduleKey === 'listing_management' && (
          <div className="grid two">
            <Field label="Plattform" value={form.platform} onChange={(v: string) => setForm({ ...form, platform: v })} options={[
              { value: 'Google Business Profile', label: 'Google Business Profile' },
              { value: 'Apple Maps', label: 'Apple Maps' },
              { value: 'Bing Places', label: 'Bing Places' },
              { value: 'Facebook', label: 'Facebook' },
              { value: 'Branchenbuch', label: 'Branchenbuch' }
            ]} />
            <Field label="Status" value={form.status} onChange={(v: string) => setForm({ ...form, status: v })} options={[
              { value: 'Zu pruefen', label: 'Zu pruefen' },
              { value: 'Korrekt', label: 'Korrekt' },
              { value: 'Fehlerhaft', label: 'Fehlerhaft' },
              { value: 'Doppelt', label: 'Doppelt' }
            ]} />
            <Field label="URL" value={form.listing_url} onChange={(v: string) => setForm({ ...form, listing_url: v })} />
            <Field label="NAP Score" type="number" value={form.nap_score} onChange={(v: string) => setForm({ ...form, nap_score: v })} />
            <Field label="Notiz" value={form.notes} onChange={(v: string) => setForm({ ...form, notes: v })} />
          </div>
        )}

        {moduleKey === 'booking_utilization' && (
          <div className="grid two">
            <Field label="Typ" value={form.kind || 'slot'} onChange={(v: string) => setForm({ ...form, kind: v })} options={[
              { value: 'slot', label: 'Freier Slot' },
              { value: 'waitlist', label: 'Warteliste' }
            ]} />
            {form.kind === 'waitlist' ? (
              <>
                <Field label="Name" value={form.client_name} onChange={(v: string) => setForm({ ...form, client_name: v })} />
                <Field label="Wunsch" value={form.request} onChange={(v: string) => setForm({ ...form, request: v })} />
                <Field label="Wunschtermin" type="datetime-local" value={form.preferred_at} onChange={(v: string) => setForm({ ...form, preferred_at: v })} />
                <Field label="Telefon" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} />
              </>
            ) : (
              <>
                <Field label="Titel" value={form.title} onChange={(v: string) => setForm({ ...form, title: v })} />
                <Field label="Leistung" value={form.service_name} onChange={(v: string) => setForm({ ...form, service_name: v })} />
                <Field label="Start" type="datetime-local" value={form.starts_at} onChange={(v: string) => setForm({ ...form, starts_at: v })} />
                <Field label="Ende" type="datetime-local" value={form.ends_at} onChange={(v: string) => setForm({ ...form, ends_at: v })} />
                <Field label="Kapazitaet" type="number" value={form.capacity} onChange={(v: string) => setForm({ ...form, capacity: v })} />
              </>
            )}
          </div>
        )}

        {moduleKey === 'unified_inbox' && (
          <div className="grid two">
            <Field label="Kanal" value={form.channel} onChange={(v: string) => setForm({ ...form, channel: v })} options={[
              { value: 'Manuell', label: 'Manuell' },
              { value: 'Website', label: 'Website' },
              { value: 'Slug', label: 'Slug' },
              { value: 'Google', label: 'Google' },
              { value: 'Instagram/Facebook', label: 'Instagram/Facebook' },
              { value: 'E-Mail', label: 'E-Mail' }
            ]} />
            <Field label="Status" value={form.status} onChange={(v: string) => setForm({ ...form, status: v })} options={[
              { value: 'Neu', label: 'Neu' },
              { value: 'In Bearbeitung', label: 'In Bearbeitung' },
              { value: 'Erledigt', label: 'Erledigt' }
            ]} />
            <Field label="Betreff" value={form.subject} onChange={(v: string) => setForm({ ...form, subject: v })} />
            <Field label="Nachricht" value={form.body} onChange={(v: string) => setForm({ ...form, body: v })} />
          </div>
        )}

        {moduleKey === 'payments_vouchers' && (
          <div className="grid two">
            <Field label="Typ" value={form.kind || 'payment'} onChange={(v: string) => setForm({ ...form, kind: v })} options={[
              { value: 'payment', label: 'Zahlungslink' },
              { value: 'voucher', label: 'Gutscheinprodukt' }
            ]} />
            <Field label="Titel" value={form.title} onChange={(v: string) => setForm({ ...form, title: v })} />
            <Field label="Betrag" type="number" value={form.amount} onChange={(v: string) => setForm({ ...form, amount: v })} />
            {form.kind === 'voucher'
              ? <Field label="Gueltigkeit Tage" type="number" value={form.validity_days} onChange={(v: string) => setForm({ ...form, validity_days: v })} />
              : <Field label="Faellig am" type="date" value={form.due_at} onChange={(v: string) => setForm({ ...form, due_at: v })} />
            }
          </div>
        )}

        {moduleKey === 'referral_program' && (
          <div className="grid two">
            <Field label="Kampagnenname" value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} />
            <Field label="Praemie" value={form.reward} onChange={(v: string) => setForm({ ...form, reward: v })} />
            <Field label="Code optional" value={form.code} onChange={(v: string) => setForm({ ...form, code: v })} />
            <Field label="Status" value={form.status} onChange={(v: string) => setForm({ ...form, status: v })} options={[
              { value: 'Aktiv', label: 'Aktiv' },
              { value: 'Pausiert', label: 'Pausiert' }
            ]} />
          </div>
        )}

        <button className="btn" onClick={createPrimary} disabled={busy}>{busy ? 'Speichere ...' : 'Speichern'}</button>
        {notice && <p className="sub">{notice}</p>}
      </section>

      <section className="legalCard">
        <h2>Aktive Modul-Daten</h2>
        {moduleKey === 'listing_management' && (
          <Table rows={primaryRows} columns={[
            { key: 'platform', label: 'Plattform' },
            { key: 'status', label: 'Status' },
            { key: 'nap_score', label: 'NAP Score' },
            { key: 'listing_url', label: 'URL', render: (r: any) => r.listing_url ? <a href={r.listing_url} target="_blank">oeffnen</a> : '-' },
            { key: 'customer_id', label: 'Kunde', render: (r: any) => customerName(customers, r.customer_id) }
          ]} />
        )}

        {moduleKey === 'booking_utilization' && (
          <>
            <Table rows={primaryRows} columns={[
              { key: 'title', label: 'Slot' },
              { key: 'service_name', label: 'Leistung' },
              { key: 'starts_at', label: 'Start', render: (r: any) => fmtDate(r.starts_at) },
              { key: 'status', label: 'Status' },
              { key: 'customer_id', label: 'Kunde', render: (r: any) => customerName(customers, r.customer_id) }
            ]} />
            <h3>Warteliste</h3>
            <Table rows={secondaryRows} columns={[
              { key: 'client_name', label: 'Name' },
              { key: 'request', label: 'Wunsch' },
              { key: 'preferred_at', label: 'Wunschtermin', render: (r: any) => fmtDate(r.preferred_at) },
              { key: 'status', label: 'Status' }
            ]} />
          </>
        )}

        {moduleKey === 'unified_inbox' && (
          <>
            <Table rows={primaryRows} columns={[
              { key: 'channel', label: 'Kanal' },
              { key: 'subject', label: 'Betreff' },
              { key: 'body', label: 'Nachricht' },
              { key: 'status', label: 'Status' },
              { key: 'customer_id', label: 'Kunde', render: (r: any) => customerName(customers, r.customer_id) },
              { key: 'action', label: 'Aktion', render: (r: any) => <button className="btn secondary" onClick={() => markDone('unified_messages', r)}>Status wechseln</button> }
            ]} />
            <h3>Aus bisherigen Daten automatisch zusammengefuehrt</h3>
            <Table rows={linkedInboxRows(ctx, selectedCustomer)} columns={[
              { key: 'source', label: 'Quelle' },
              { key: 'subject', label: 'Betreff' },
              { key: 'body', label: 'Inhalt' },
              { key: 'status', label: 'Status' }
            ]} />
          </>
        )}

        {moduleKey === 'payments_vouchers' && (
          <>
            <Table rows={primaryRows} columns={[
              { key: 'title', label: 'Titel' },
              { key: 'amount', label: 'Betrag', render: (r: any) => eur(r.amount) },
              { key: 'status', label: 'Status' },
              { key: 'payment_url', label: 'Link', render: (r: any) => r.payment_url ? <a href={r.payment_url} target="_blank">oeffnen</a> : '-' },
              { key: 'customer_id', label: 'Kunde', render: (r: any) => customerName(customers, r.customer_id) }
            ]} />
            <h3>Gutscheinprodukte</h3>
            <Table rows={secondaryRows} columns={[
              { key: 'title', label: 'Gutschein' },
              { key: 'amount', label: 'Wert', render: (r: any) => eur(r.amount) },
              { key: 'validity_days', label: 'Gueltigkeit' },
              { key: 'status', label: 'Status' }
            ]} />
          </>
        )}

        {moduleKey === 'referral_program' && (
          <>
            <Table rows={primaryRows} columns={[
              { key: 'name', label: 'Kampagne' },
              { key: 'reward', label: 'Praemie' },
              { key: 'status', label: 'Status' },
              { key: 'public_url', label: 'Link', render: (r: any) => r.public_url ? <a href={r.public_url} target="_blank">oeffnen</a> : '-' },
              { key: 'customer_id', label: 'Kunde', render: (r: any) => customerName(customers, r.customer_id) }
            ]} />
            <h3>Empfehlungsereignisse</h3>
            <Table rows={secondaryRows} columns={[
              { key: 'referrer_name', label: 'Empfehler' },
              { key: 'referred_name', label: 'Empfohlen' },
              { key: 'status', label: 'Status' },
              { key: 'created_at', label: 'Datum', render: (r: any) => fmtDate(r.created_at) }
            ]} />
          </>
        )}
      </section>

      <section className="legalCard">
        <h2>Verknuepfte bestehende Daten</h2>
        <div className="grid three">
          {config.existingLabels.map((item) => {
            const count = (ctx[item.table] || []).filter((r) => matchesCustomer(r, selectedCustomer)).length
            return <Metric key={item.table} label={item.label} value={count} />
          })}
        </div>
      </section>

      <LegalFooter />
    </main>
  )
}
