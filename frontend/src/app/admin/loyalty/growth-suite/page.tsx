'use client'

import { useEffect, useState } from 'react'
import { loyaltyGrowthSuiteClient } from '@/lib/loyaltyGrowthSuiteClient'
import { getAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}
function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children || (ok ? 'OK' : 'Prüfen')}</span>
}
function List({ rows }: any) {
  const items = Array.isArray(rows) ? rows : []
  if (!items.length) return <p className="sub">Keine Einträge.</p>
  return <div className="stack">{items.slice(0, 12).map((x:any,i:number) => <div className="item" key={i}><div><b>{x.label || x.title || x.recommendation || x.key}</b><div className="sub">{x.description || x.recommendation || x.category || x.status || JSON.stringify(x).slice(0, 160)}</div></div><Badge ok={x.priority !== 'high'}>{x.priority || x.category || 'ok'}</Badge></div>)}</div>
}

export default function LoyaltyGrowthSuitePage() {
  const [customerId, setCustomerId] = useState('')
  const [overview, setOverview] = useState<any>(null)
  const [ideas, setIdeas] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [roi, setRoi] = useState<any>(null)
  const [campaignType, setCampaignType] = useState('birthday_bonus')
  const [title, setTitle] = useState('')
  const [msg, setMsg] = useState('')

  async function load() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    const ideaRes = await loyaltyGrowthSuiteClient.ideas().catch((e:any) => ({ ok:false, error:e.message, ideas: [] }))
    setIdeas(ideaRes)
    if (!cid) { setMsg('Bitte Kundenkontext wählen.'); return }
    const [ov, rec, roiRes] = await Promise.all([
      loyaltyGrowthSuiteClient.overview(cid).catch((e:any) => ({ ok:false, error:e.message, metrics: {} })),
      loyaltyGrowthSuiteClient.recommendations(cid).catch((e:any) => ({ ok:false, error:e.message, recommended: [] })),
      loyaltyGrowthSuiteClient.roi(cid, { avg_order_value: 15, gross_margin: 0.6 }).catch((e:any) => ({ ok:false, error:e.message }))
    ])
    setOverview(ov)
    setRecommendations(rec)
    setRoi(roiRes)
    setMsg('Loyalty Growth Suite geladen.')
  }

  async function createCampaign() {
    if (!customerId) return setMsg('Bitte Kundenkontext wählen.')
    setMsg('Kampagne wird erstellt...')
    const result = await loyaltyGrowthSuiteClient.createCampaign(customerId, {
      type: campaignType,
      title: title || undefined,
      target_segment: campaignType === 'winback_inactive' ? 'inactive_members' : 'all_members',
      offer: campaignType === 'birthday_bonus' ? 'Geburtstagsbonus' : '',
      points_bonus: campaignType === 'happy_hour_booster' ? 20 : 0
    }).catch((e:any) => ({ ok:false, error:e.message }))
    setMsg(result.ok ? 'Kampagne als Entwurf erstellt.' : result.error || 'Fehler')
    await load()
  }

  async function quick(action: string) {
    if (!customerId) return setMsg('Bitte Kundenkontext wählen.')
    setMsg(`${action} wird erstellt...`)
    const calls:any = {
      booster: () => loyaltyGrowthSuiteClient.createBooster(customerId),
      vip: () => loyaltyGrowthSuiteClient.createVipLevels(customerId),
      coupon: () => loyaltyGrowthSuiteClient.createCoupon(customerId, { title: 'Willkommenscoupon', value: '10%' }),
      referral: () => loyaltyGrowthSuiteClient.createReferral(customerId)
    }
    const result = await calls[action]().catch((e:any) => ({ ok:false, error:e.message }))
    setMsg(result.ok ? `${action} erstellt.` : result.error || 'Fehler')
    await load()
  }

  useEffect(() => { void load() }, [])

  const campaignIdeas = ideas?.ideas || []

  return (
    <>
      <div className="pageHeader">
        <div>
          <p className="eyebrow">Loyalty Growth</p>
          <h1>Loyalty Growth Suite</h1>
          <p className="muted">Neue Loyalty-Tools ohne QR-Zwang: Kampagnenkalender, VIP-Level, Coupon Wallet, Winback, Booster, Referral und ROI.</p>
        </div>
        <button className="btn secondary" onClick={load}>Neu laden</button>
      </div>

      <Card title="Kundenkontext & Kennzahlen" action={<Badge ok={Boolean(customerId)}>{customerId ? 'Kunde gewählt' : 'fehlt'}</Badge>}>
        <p className="sub">{customerId || 'Kein Kunde gewählt'} · {msg}</p>
        <pre className="codeBox">{JSON.stringify(overview?.metrics || {}, null, 2)}</pre>
      </Card>

      <div className="grid2">
        <Card title="Kampagne erstellen">
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titel optional"/>
          <select className="input" value={campaignType} onChange={e=>setCampaignType(e.target.value)}>
            {campaignIdeas.map((idea:any) => <option key={idea.key} value={idea.key}>{idea.label}</option>)}
          </select>
          <button className="btn" onClick={createCampaign}>Kampagne als Entwurf erstellen</button>
          <div className="actionRow">
            <button className="btn secondary" onClick={() => quick('booster')}>Happy Hour Booster</button>
            <button className="btn secondary" onClick={() => quick('vip')}>VIP-Level</button>
            <button className="btn secondary" onClick={() => quick('coupon')}>Coupon</button>
            <button className="btn secondary" onClick={() => quick('referral')}>Referral</button>
          </div>
        </Card>

        <Card title="Empfohlene nächste Loyalty-Tools" action={<Badge ok={(recommendations?.recommended || []).every((x:any)=>x.priority!=='high')}>{(recommendations?.recommended || []).length}</Badge>}>
          <List rows={recommendations?.recommended || []}/>
        </Card>

        <Card title="Loyalty ROI Rechner" action={<Badge ok={roi?.ok}>ROI</Badge>}>
          <pre className="codeBox">{JSON.stringify(roi?.estimated || {}, null, 2)}</pre>
          <p className="sub">{roi?.recommendation}</p>
        </Card>

        <Card title="Aktive Kampagnen / Coupons / Booster">
          <List rows={[...(overview?.campaigns || []), ...(overview?.coupons || []), ...(overview?.boosters || []), ...(overview?.referrals || [])]}/>
        </Card>

        <Card title="Neue Tool-Ideen" action={<Badge ok={true}>{campaignIdeas.length}</Badge>}>
          <List rows={campaignIdeas}/>
        </Card>

        <Card title="VIP-Level Vorlage">
          <pre className="codeBox">{JSON.stringify(ideas?.vip_levels || [], null, 2)}</pre>
        </Card>
      </div>
    </>
  )
}
