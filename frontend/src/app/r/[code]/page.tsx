'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import LegalFooter from '@/components/legal/LegalFooter'
import { insertRow, selectTable, uid } from '@/lib/v44FunctionalToolsClient'

export default function ReferralPublicPage() {
  const params = useParams<{ code: string }>()
  const code = String(params?.code || '')
  const [campaign, setCampaign] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      const campaigns = await selectTable('referral_campaigns')
      setCampaign(campaigns.find((c: any) => String(c.referral_code) === code) || null)
    }
    void load()
  }, [code])

  async function submit() {
    await insertRow('referral_events', {
      id: uid('ref_event'),
      campaign_id: campaign?.id || '',
      customer_id: campaign?.customer_id || '',
      referral_code: code,
      referrer_name: form.referrer_name || '',
      referred_name: form.referred_name || '',
      referred_contact: form.referred_contact || '',
      status: 'Neu'
    })
    setDone(true)
  }

  return (
    <main className="legalPage">
      <section className="legalCard">
        <a className="legalBack" href="/">← Zur Startseite</a>
        <h1>{campaign?.name || 'Empfehlung einreichen'}</h1>
        <p>{campaign?.reward ? `Praemie: ${campaign.reward}` : 'Empfiehl den Betrieb weiter und hinterlasse die Kontaktdaten.'}</p>
        {done ? (
          <p><strong>Danke! Deine Empfehlung wurde gespeichert.</strong></p>
        ) : (
          <div className="grid two">
            <label><span>Dein Name</span><input value={form.referrer_name || ''} onChange={(e) => setForm({ ...form, referrer_name: e.target.value })} /></label>
            <label><span>Empfohlene Person</span><input value={form.referred_name || ''} onChange={(e) => setForm({ ...form, referred_name: e.target.value })} /></label>
            <label><span>Kontakt der empfohlenen Person</span><input value={form.referred_contact || ''} onChange={(e) => setForm({ ...form, referred_contact: e.target.value })} /></label>
            <button className="btn" onClick={submit}>Empfehlung speichern</button>
          </div>
        )}
      </section>
      <LegalFooter />
    </main>
  )
}
