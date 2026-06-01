'use client'

import { useEffect, useState } from 'react'
import { qrCampaignGrowthClient } from '@/lib/qrCampaignGrowthClient'
import { getAdminSelectedCustomerId } from '@/lib/adminCustomerSelection'

function Card({ title, children, action }: any) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2></div>{action}</div>{children}</section>
}
function Badge({ ok, children }: any) {
  return <span className={ok ? 'badge green' : 'badge red'}>{children || (ok ? 'OK' : 'Prüfen')}</span>
}
function IssueList({ rows }: any) {
  const items = Array.isArray(rows) ? rows : []
  if (!items.length) return <p className="sub">Keine Hinweise.</p>
  return <div className="stack">{items.slice(0, 12).map((x:any,i:number) => <div className="item" key={i}><div><b>{x.issue || x.recommendation || x.title || 'Hinweis'}</b><div className="sub">{x.hint || x.priority || x.qr_campaign_id || JSON.stringify(x).slice(0, 160)}</div></div><Badge ok={x.severity !== 'critical'}>{x.severity || x.priority || 'info'}</Badge></div>)}</div>
}

export default function QrCampaignGrowthPage() {
  const [customerId, setCustomerId] = useState('')
  const [overview, setOverview] = useState<any>(null)
  const [templates, setTemplates] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any>(null)
  const [selectedQr, setSelectedQr] = useState('')
  const [title, setTitle] = useState('')
  const [campaignType, setCampaignType] = useState('loyalty')
  const [placements, setPlacements] = useState<Record<string, boolean>>({ table_tent: true, receipt: true, counter: true })
  const [msg, setMsg] = useState('')

  async function load() {
    const cid = getAdminSelectedCustomerId()
    setCustomerId(cid)
    setTemplates(await qrCampaignGrowthClient.templates().catch((e:any) => ({ ok:false, error:e.message, placements: [], campaign_types: [] })))
    if (!cid) { setMsg('Bitte oben Kundenkontext wählen.'); return }
    const [ov, rec] = await Promise.all([
      qrCampaignGrowthClient.overview(cid).catch((e:any) => ({ ok:false, error:e.message, placements: [], totals: {} })),
      qrCampaignGrowthClient.recommendations(cid).catch((e:any) => ({ ok:false, error:e.message, recommendations: [] }))
    ])
    setOverview(ov)
    setRecommendations(rec)
    setSelectedQr((ov.placements || [])[0]?.id || '')
    setMsg('QR Growth Center geladen.')
  }

  async function createPlacements() {
    if (!customerId) return setMsg('Bitte Kundenkontext wählen.')
    setMsg('Placement-Varianten werden erstellt...')
    const selected = Object.entries(placements).filter(([,v]) => v).map(([k]) => k)
    const result = await qrCampaignGrowthClient.createPlacements(customerId, {
      parent_qr_campaign_id: selectedQr || null,
      campaign_type: campaignType,
      placements: selected,
      title: title || null
    }).catch((e:any) => ({ ok:false, error:e.message }))
    setMsg(result.ok ? `${(result.created || []).length} Placement-Varianten erstellt.` : result.error || 'Fehler')
    await load()
  }

  async function createPrintPackage(qrId: string) {
    if (!customerId || !qrId) return
    setMsg('Druckpaket wird erstellt...')
    const result = await qrCampaignGrowthClient.createPrintPackage(customerId, qrId, {
      formats: ['table_tent','a5_flyer','receipt_note','social_story'],
      brand: { cta: 'Jetzt scannen & Vorteil sichern' }
    }).catch((e:any) => ({ ok:false, error:e.message }))
    setMsg(result.ok ? 'Druckpaket als Entwurf erstellt.' : result.error || 'Fehler')
  }

  useEffect(() => { void load() }, [])

  const placementTemplates = templates?.placements || []
  const campaignTypes = templates?.campaign_types || []
  const rows = overview?.placements || []

  return (
    <>
      <div className="pageHeader">
        <div>
          <p className="eyebrow">QR Growth</p>
          <h1>QR-Kampagnen Growth Center</h1>
          <p className="muted">Placement Tracking, Funnel-Auswertung, Auto-Fix Empfehlungen und Druckpakete für lokale Betriebe.</p>
        </div>
        <button className="btn secondary" onClick={load}>Neu laden</button>
      </div>

      <Card title="Kundenkontext & Gesamtwerte" action={<Badge ok={Boolean(customerId)}>{overview?.totals?.conversion_rate || 0}% CR</Badge>}>
        <p className="sub">{customerId || 'Kein Kunde gewählt'} · {msg}</p>
        <pre className="codeBox">{JSON.stringify(overview?.totals || {}, null, 2)}</pre>
      </Card>

      <div className="grid2">
        <Card title="Placement-Varianten erstellen">
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titel optional, z. B. Café Milo Bewertung"/>
          <select className="input" value={campaignType} onChange={e=>setCampaignType(e.target.value)}>
            {campaignTypes.map((t:any) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select className="input" value={selectedQr} onChange={e=>setSelectedQr(e.target.value)}>
            <option value="">Ohne Parent-Kampagne</option>
            {rows.map((r:any) => <option key={r.id} value={r.id}>{r.title || r.slug}</option>)}
          </select>
          <div className="stack">
            {placementTemplates.map((p:any) => <label className="checkline" key={p.key}><input type="checkbox" checked={!!placements[p.key]} onChange={e=>setPlacements({...placements,[p.key]:e.target.checked})}/>{p.label} · {p.cta}</label>)}
          </div>
          <button className="btn" onClick={createPlacements}>Varianten erstellen</button>
        </Card>

        <Card title="Auto-Fix Empfehlungen" action={<Badge ok={(recommendations?.recommendations || []).every((x:any)=>x.priority!=='high')}>{(recommendations?.recommendations || []).length}</Badge>}>
          <IssueList rows={recommendations?.recommendations || []}/>
        </Card>

        <Card title="QR Placement Performance">
          {(rows || []).map((r:any) => <div className="item" key={r.id}>
            <div><b>{r.title}</b><div className="sub">{r.placement_label} · {r.campaign_type} · {r.target_url}</div></div>
            <div className="right"><Badge ok={r.conversion_rate >= 5}>{r.conversion_rate}%</Badge><button className="btn secondary" onClick={() => createPrintPackage(r.id)}>Druckpaket</button></div>
          </div>)}
        </Card>

        <Card title="QR Kampagnen-Ampel / Issues" action={<Badge ok={!overview?.issues?.length}>{overview?.issues?.length || 0}</Badge>}>
          <IssueList rows={overview?.issues || []}/>
        </Card>
      </div>
    </>
  )
}
