'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

export default function QrScanStartPage() {
  const params = useParams<{ slug: string }>()
  const slug = String(params?.slug || '')
  const [message, setMessage] = useState('QR-Scan wird vorbereitet...')

  useEffect(() => {
    let alive = true
    async function run() {
      if (!slug) return
      try {
        const res: any = await v33FunctionalClient.publicScanStart(slug)
        if (!alive) return
        if (res?.scan_token && typeof window !== 'undefined') {
          try { sessionStorage.setItem(`mmos_qr_scan_token:${slug}`, String(res.scan_token)) } catch {}
        }
        const next = res?.redirect_path || `/l/${encodeURIComponent(slug)}${res?.scan_token ? `?scan_token=${encodeURIComponent(String(res.scan_token))}` : ''}`
        window.location.replace(next)
      } catch (error: any) {
        if (!alive) return
        setMessage(error?.message || 'QR-Scan konnte nicht gestartet werden.')
      }
    }
    void run()
    return () => { alive = false }
  }, [slug])

  return (
    <main className="publicScanStartPage">
      <div className="publicScanStartCard">
        <div className="spinner" aria-hidden="true" />
        <h1>QR-Scan</h1>
        <p>{message}</p>
        {message !== 'QR-Scan wird vorbereitet...' && (
          <a className="btn" href={`/l/${encodeURIComponent(slug)}`}>Zur Kampagnenseite</a>
        )}
      </div>
    </main>
  )
}
