'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { v33FunctionalClient } from '@/lib/v33FunctionalClient'

function qrImageUrl(value: string, size = 900) {
  const params = new URLSearchParams({ value, size: String(size) })
  return `/api/qr?${params.toString()}`
}

function absoluteUrl(path: string) {
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

async function downloadPng(url: string, slug: string) {
  try {
    const res = await fetch(qrImageUrl(url, 900), { cache: 'no-store' })
    if (!res.ok) throw new Error('download failed')
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `qr-${slug || 'scan'}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch {
    window.open(qrImageUrl(url, 900), '_blank')
  }
}

function printSheet(title: string, scanUrl: string, qr: string) {
  const w = window.open('', '_blank')
  if (!w) return
  const esc = (v: string) => String(v || '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] || ch))
  w.document.open()
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title><style>body{font-family:Inter,Arial,sans-serif;background:#f7f4ec;margin:0}.sheet{width:794px;min-height:1123px;background:#fff;margin:0 auto;padding:64px;box-sizing:border-box}h1{font-size:44px;margin:32px 0 12px}.badge{display:inline-block;border:1px solid #d4af37;border-radius:999px;padding:8px 14px;background:#fff8df;color:#7c5d12;font-weight:800}.qr{display:flex;align-items:center;justify-content:center;margin:44px auto 28px;width:430px;height:430px;border:1px solid #e5e7eb;border-radius:32px;box-shadow:0 24px 80px rgba(17,24,39,.12)}.qr img{width:360px;height:360px}.url{word-break:break-all;background:#f3f4f6;border-radius:16px;padding:16px;color:#111827}.noPrint{margin-top:32px}@media print{body{background:#fff}.sheet{width:100%;box-shadow:none}.noPrint{display:none}}</style></head><body><main class="sheet"><span class="badge">MecklenburgMarketing</span><h1>${esc(title)}</h1><p>Scanne den QR-Code und sammle Punkte oder öffne die Aktion direkt.</p><div class="qr"><img src="${esc(qr)}" alt="QR Code"/></div><div class="url">${esc(scanUrl)}</div><p class="noPrint"><button onclick="window.print()" style="padding:12px 18px;border-radius:999px;border:0;background:#111827;color:white;font-weight:800">Drucken / PDF speichern</button></p></main></body></html>`)
  w.document.close()
}

export default function QrDisplayPage() {
  const params = useParams<{ slug: string }>()
  const initialSlug = String(params?.slug || '')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [copied, setCopied] = useState(false)

  async function load() {
    if (!initialSlug) return
    try {
      const res = await v33FunctionalClient.publicCurrentQr(initialSlug)
      setData(res)
      setError('')
      setUpdatedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (e: any) {
      setError(e?.message || 'QR-Code konnte nicht geladen werden.')
    }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { void load() }, 4000)
    return () => window.clearInterval(timer)
  }, [initialSlug])

  const currentSlug = String(data?.current_slug || initialSlug)
  const scanPath = data?.scan_path || `/q/${currentSlug}`
  const landingPath = data?.landing_path || `/l/${currentSlug}`
  const scanUrl = useMemo(() => absoluteUrl(scanPath), [scanPath])
  const landingUrl = useMemo(() => absoluteUrl(landingPath), [landingPath])
  const qr = qrImageUrl(scanUrl, 900)
  const title = data?.qr_campaign?.title || 'Scanne & Punkte sammeln'
  const rotated = Boolean(data?.rotated || currentSlug !== initialSlug)
  const rotationEnabled = Boolean(data?.qr_campaign?.rotate_qr_after_scan)
  const kpis = data?.daily_kpis || {}

  async function copy() {
    try {
      await navigator.clipboard.writeText(scanUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  return (
    <main className="qrDisplayPage">
      <section className="qrDisplayShell">
        <div className="qrDisplayHeader">
          <div>
            <span className="qrDisplayBadge">Live QR-Anzeige</span>
            <h1>{title}</h1>
            <p>
              Diese Ansicht kann auf einem Tablet/Monitor offen bleiben. Wenn die Kampagne nach jedem Scan rotiert,
              wird hier automatisch der neue QR-Code angezeigt.
            </p>
          </div>
          <div className={rotated ? 'qrDisplayStatus rotated' : 'qrDisplayStatus'}>
            <b>{rotated ? 'QR erneuert' : 'Aktueller QR'}</b>
            <span>{updatedAt ? `Aktualisiert ${updatedAt}` : 'lädt...'}</span>
          </div>
        </div>

        {error ? (
          <div className="qrDisplayError">{error}</div>
        ) : (
          <div className="qrDisplayGrid">
            <div className="qrDisplayCodeCard">
              <img src={qr} alt="Aktueller QR-Code" />
            </div>
            <div className="qrDisplayInfoCard">
              <span className="qrDisplayMiniLabel">Aktiver Slug</span>
              <strong>{currentSlug}</strong>
              <p>{rotationEnabled ? 'Rotation ist aktiv. Nach einem erfolgreichen Scan wechselt diese Anzeige automatisch auf den nächsten QR-Code.' : 'Rotation ist aktuell nicht aktiv. Dieser QR-Code bleibt bestehen.'}</p>
              <div className="qrDisplayUrl">{scanUrl}</div>
              <div className="qrDisplayActions">
                <button onClick={copy}>{copied ? 'Kopiert' : 'Link kopieren'}</button>
                <button onClick={() => downloadPng(scanUrl, currentSlug)}>PNG herunterladen</button>
                <button onClick={() => printSheet(title, scanUrl, qr)}>A4-Plakat</button>
                <button onClick={() => printSheet('Scannen & Punkte sammeln', scanUrl, qr)}>Tischaufsteller</button>
                <button onClick={() => printSheet('Bonus sichern', scanUrl, qr)}>Sticker/Flyer</button>
                <button onClick={() => window.open(landingUrl, '_blank')}>Zielseite öffnen</button>
              </div>
              <div className="qrDisplayChain">
                <b>Heute im Laden</b>
                <span>{Number(kpis.scans || 0)} Scans</span>
                <span>{Number(kpis.points || 0)} Punkte</span>
                <span>{Number(kpis.redemptions || 0)} Einlösungen</span>
              </div>
              {Array.isArray(data?.chain) && data.chain.length > 1 && (
                <div className="qrDisplayChain">
                  <b>Rotationskette</b>
                  {data.chain.map((x: any, index: number) => <span key={`${x.slug}-${index}`}>{x.slug}</span>)}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
