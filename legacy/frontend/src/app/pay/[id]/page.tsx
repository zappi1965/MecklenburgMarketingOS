'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import LegalFooter from '@/components/legal/LegalFooter'
import { selectTable, updateRow } from '@/lib/v44FunctionalToolsClient'

const eur = (value: any) => new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2
}).format(Number(value || 0))

export default function PaymentPublicPage() {
  const params = useParams<{ id: string }>()
  const id = String(params?.id || '')
  const [payment, setPayment] = useState<any>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      const links = await selectTable('payment_links')
      setPayment(links.find((p: any) => String(p.id) === id) || null)
    }
    void load()
  }, [id])

  async function markRequested() {
    if (payment?.id) {
      await updateRow('payment_links', payment.id, { status: 'Zahlung angefragt' })
      setDone(true)
    }
  }

  return (
    <main className="legalPage">
      <section className="legalCard">
        <a className="legalBack" href="/">← Zur Startseite</a>
        <h1>{payment?.title || 'Zahlungslink'}</h1>
        <p>Betrag: <strong>{eur(payment?.amount)}</strong></p>
        <p>Status: {done ? 'Zahlung angefragt' : (payment?.status || 'Offen')}</p>
        <p className="sub">
          Dieser Link ist eine MMOS-Zahlungsvorbereitung. Die echte Zahlung wird ueber den hinterlegten Anbieter
          wie Stripe, PayPal, SumUp oder manuelle Ueberweisung abgeschlossen.
        </p>
        <button className="btn" onClick={markRequested}>Zahlung anfragen / Status setzen</button>
      </section>
      <LegalFooter />
    </main>
  )
}
