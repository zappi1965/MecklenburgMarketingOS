
'use client'

import { useEffect, useState } from 'react'
import { v20GrowthClient } from '@/lib/v20GrowthClient'

export default function LoyaltyStaffCodeConfig({
  customerId,
  programId,
  qrCampaignId
}: {
  customerId: string
  programId: string
  qrCampaignId?: string
}) {
  const [codes, setCodes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    label:'Kasse / Tresen',
    code:'',
    max_uses:'',
    active:true,
    scope:'program',
    valid_from:'',
    valid_until:''
  })

  async function load() {
    if (!programId) return
    const result = await v20GrowthClient.staffCodesForProgram(programId)
    setCodes(result.staff_codes || [])
  }

  useEffect(() => { load().catch(()=>null) }, [programId])

  async function saveCode() {
    setSaving(true)
    try {
      await v20GrowthClient.createStaffCode({
        customer_id: customerId,
        loyalty_program_id: programId,
        qr_campaign_id: form.scope === 'campaign' ? qrCampaignId : null,
        label: form.label,
        code: form.code,
        max_uses: form.max_uses || null,
        active: form.active,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        created_by: 'Kunde'
      })
      setForm({...form, code:''})
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleCode(code:any) {
    await v20GrowthClient.updateStaffCode(code.id, { active: !code.active })
    await load()
  }

  return (
    <section className="loyaltyStaffCodeConfig">
      <div className="staffCodeHeader">
        <div>
          <h2>Mitarbeiter-Bestätigungscodes</h2>
          <p>Lege Codes fest, mit denen Mitarbeiter Reward-Einlösungen vor Ort bestätigen können.</p>
        </div>
      </div>

      <div className="staffCodeGrid">
        <div className="staffCodePanel">
          <h3>Neuen Code anlegen</h3>

          <label>Bezeichnung</label>
          <input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} placeholder="z. B. Kasse, Bar, Empfang" />

          <label>Bestätigungscode</label>
          <input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="z. B. 4821" type="password" />

          <label>Gültigkeit</label>
          <select value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})}>
            <option value="program">Gesamtes Loyalty-Programm</option>
            <option value="campaign">Nur aktuelle QR-Kampagne</option>
          </select>

          <label>Maximale Nutzungen optional</label>
          <input value={form.max_uses} onChange={e=>setForm({...form,max_uses:e.target.value})} type="number" placeholder="unbegrenzt" />

          <div className="twoCols">
            <div>
              <label>Gültig ab</label>
              <input type="datetime-local" value={form.valid_from} onChange={e=>setForm({...form,valid_from:e.target.value})} />
            </div>
            <div>
              <label>Gültig bis</label>
              <input type="datetime-local" value={form.valid_until} onChange={e=>setForm({...form,valid_until:e.target.value})} />
            </div>
          </div>

          <label className="check">
            <input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} />
            Code ist aktiv
          </label>

          <button className="primaryStaffCodeBtn" onClick={saveCode} disabled={saving || !form.code || !form.label}>
            {saving ? 'Speichere...' : 'Code speichern'}
          </button>
        </div>

        <div className="staffCodePanel">
          <h3>Aktive Codes</h3>
          {codes.length === 0 && <p>Noch keine Mitarbeiter-Codes angelegt.</p>}

          {codes.map(code => (
            <div className="staffCodeItem" key={code.id}>
              <div>
                <strong>{code.label}</strong>
                <span>{code.code_hint || 'Code gespeichert'} · {code.active ? 'Aktiv' : 'Inaktiv'}</span>
                <small>{code.used_count || 0}{code.max_uses ? ` / ${code.max_uses}` : ''} Nutzungen</small>
              </div>
              <button onClick={()=>toggleCode(code)}>{code.active ? 'Deaktivieren' : 'Aktivieren'}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
