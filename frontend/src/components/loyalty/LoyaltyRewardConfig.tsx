
'use client'

import { useEffect, useState } from 'react'
import { v20GrowthClient } from '@/lib/v20GrowthClient'

const rewardTypes = [
  { key:'discount', label:'Rabatt', unit:'%' },
  { key:'free_product', label:'Gratisprodukt', unit:'Stück' },
  { key:'voucher', label:'Gutschein', unit:'EUR' },
  { key:'free_drink', label:'Freigetränk', unit:'Stück' },
  { key:'birthday_bonus', label:'Geburtstagsreward', unit:'Punkte' },
  { key:'vip_tier', label:'VIP-Vorteil', unit:'Level' },
  { key:'custom', label:'Individuell', unit:'' }
]

export default function LoyaltyRewardConfig({
  customerId,
  programId,
  qrCampaignId
}: {
  customerId: string
  programId: string
  qrCampaignId?: string
}) {
  const [rewards, setRewards] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({
    reward_type:'discount',
    name:'',
    description:'',
    required_points:100,
    reward_value:10,
    reward_unit:'%',
    max_redemptions_per_member:1,
    max_total_redemptions:'',
    min_scans_required:0,
    min_reviews_required:0,
    campaign_scope:'program',
    redemption_mode:'voucher_code',
    staff_confirmation_required:true,
    staff_code_required:true,
    active:true,
    terms:'',
    allowed_weekdays:[]
  })

  async function load() {
    if (!programId) return
    const [rw, tpl] = await Promise.all([
      v20GrowthClient.rewardsForProgram(programId),
      v20GrowthClient.rewardRuleTemplates()
    ])
    setRewards(rw.rewards || [])
    setTemplates(tpl.templates || [])
  }

  useEffect(() => { load().catch(()=>null) }, [programId])

  function setType(type: string) {
    const selected = rewardTypes.find(t => t.key === type)
    setForm((f:any) => ({
      ...f,
      reward_type:type,
      reward_unit:selected?.unit || ''
    }))
  }

  function toggleWeekday(day: number) {
    setForm((f:any) => {
      const current = Array.isArray(f.allowed_weekdays) ? f.allowed_weekdays : []
      return {
        ...f,
        allowed_weekdays: current.includes(day) ? current.filter((d:number)=>d!==day) : [...current, day]
      }
    })
  }

  async function saveReward() {
    setSaving(true)
    try {
      await v20GrowthClient.createReward({
        customer_id: customerId,
        loyalty_program_id: programId,
        qr_campaign_id: form.campaign_scope === 'campaign' ? qrCampaignId : null,
        ...form,
        max_total_redemptions: form.max_total_redemptions || null
      })
      setForm((f:any)=>({ ...f, name:'', description:'' }))
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="loyaltyRewardConfig">
      <div className="rewardHeader">
        <div>
          <h2>Rewards / Belohnungen</h2>
          <p>Lege fest, wofür Endkunden ihre Punkte einlösen können.</p>
        </div>
      </div>

      <div className="rewardGrid">
        <div className="rewardPanel">
          <h3>Reward erstellen</h3>

          <label>Reward-Typ</label>
          <select value={form.reward_type} onChange={e=>setType(e.target.value)}>
            {rewardTypes.map(type => <option key={type.key} value={type.key}>{type.label}</option>)}
          </select>

          <label>Name</label>
          <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="z. B. Gratis Kaffee" />

          <label>Beschreibung</label>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Was erhält der Endkunde?" />

          <div className="twoCols">
            <div>
              <label>Benötigte Punkte</label>
              <input type="number" value={form.required_points} onChange={e=>setForm({...form,required_points:Number(e.target.value)})} />
            </div>
            <div>
              <label>Wert</label>
              <input type="number" value={form.reward_value} onChange={e=>setForm({...form,reward_value:Number(e.target.value)})} />
            </div>
          </div>

          <label>Einlösart</label>
          <select value={form.redemption_mode} onChange={e=>setForm({...form,redemption_mode:e.target.value})}>
            <option value="voucher_code">Einmaliger Voucher-Code</option>
            <option value="staff_confirm">Mitarbeiter bestätigt Einlösung</option>
            <option value="qr_voucher">QR-Voucher erzeugen</option>
            <option value="manual">Manuelle Prüfung</option>
          </select>

          <label className="check">
            <input type="checkbox" checked={form.staff_confirmation_required} onChange={e=>setForm({...form,staff_confirmation_required:e.target.checked})} />
            Mitarbeiterbestätigung erforderlich
          </label>

          <label className="check">
            <input type="checkbox" checked={form.staff_code_required} onChange={e=>setForm({...form,staff_code_required:e.target.checked})} />
            Mitarbeiter-Code zur Bestätigung verlangen
          </label>
        </div>

        <div className="rewardPanel">
          <h3>Reward-Regeln</h3>

          <div className="twoCols">
            <div>
              <label>Max. pro Endkunde</label>
              <input type="number" value={form.max_redemptions_per_member} onChange={e=>setForm({...form,max_redemptions_per_member:Number(e.target.value)})} />
            </div>
            <div>
              <label>Gesamtlimit optional</label>
              <input type="number" value={form.max_total_redemptions} onChange={e=>setForm({...form,max_total_redemptions:e.target.value})} placeholder="unbegrenzt" />
            </div>
          </div>

          <div className="twoCols">
            <div>
              <label>Mindest-Scans</label>
              <input type="number" value={form.min_scans_required} onChange={e=>setForm({...form,min_scans_required:Number(e.target.value)})} />
            </div>
            <div>
              <label>Mindest-Bewertungen</label>
              <input type="number" value={form.min_reviews_required} onChange={e=>setForm({...form,min_reviews_required:Number(e.target.value)})} />
            </div>
          </div>

          <label>Gültigkeit</label>
          <div className="twoCols">
            <input type="datetime-local" onChange={e=>setForm({...form,valid_from:e.target.value || null})} />
            <input type="datetime-local" onChange={e=>setForm({...form,valid_until:e.target.value || null})} />
          </div>

          <label>Nur an bestimmten Tagen</label>
          <div className="weekdayRow">
            {['So','Mo','Di','Mi','Do','Fr','Sa'].map((d,i)=>(
              <button key={d} type="button" className={form.allowed_weekdays.includes(i) ? 'active' : ''} onClick={()=>toggleWeekday(i)}>{d}</button>
            ))}
          </div>

          <label>Gültigkeit für Kampagne</label>
          <select value={form.campaign_scope} onChange={e=>setForm({...form,campaign_scope:e.target.value})}>
            <option value="program">Gesamtes Loyalty-Programm</option>
            <option value="campaign">Nur diese QR-Kampagne</option>
          </select>

          <label>Teilnahmebedingungen</label>
          <textarea value={form.terms} onChange={e=>setForm({...form,terms:e.target.value})} placeholder="z. B. nicht kombinierbar mit anderen Aktionen" />

          <button className="primaryRewardBtn" onClick={saveReward} disabled={saving || !form.name}>
            {saving ? 'Speichere...' : 'Reward speichern'}
          </button>
        </div>
      </div>

      <div className="rewardPanel rewardList">
        <h3>Aktive Rewards</h3>
        {rewards.length === 0 && <p>Noch keine Rewards angelegt.</p>}
        {rewards.map(reward => (
          <div className="rewardItem" key={reward.id}>
            <div>
              <strong>{reward.name}</strong>
              <span>{reward.required_points} Punkte · {reward.reward_type} · {reward.active ? 'Aktiv' : 'Inaktiv'}</span>
            </div>
            <small>{reward.description}</small>
          </div>
        ))}
      </div>

      {templates.length > 0 && (
        <div className="rewardPanel">
          <h3>Regel-Vorlagen</h3>
          <div className="templateGrid">
            {templates.map(tpl => (
              <div className="templateCard" key={tpl.key}>
                <strong>{tpl.label}</strong>
                <span>{tpl.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
