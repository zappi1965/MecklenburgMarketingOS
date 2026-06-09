'use client'

import { useState } from 'react'

export type StampCardViewProps = {
  businessName: string
  logoUrl?: string | null
  pointsBalance: number
  slots?: number
  rewardText?: string
  stampStyle?: 'logo' | 'check' | 'star'
  showLogo?: boolean
}

const VALID_SLOTS = new Set([6, 8, 10, 12])

function normalizeSlots(value?: number) {
  const numeric = Number(value || 10)
  return VALID_SLOTS.has(numeric) ? numeric : 10
}

function normalizeStampStyle(value?: StampCardViewProps['stampStyle']) {
  return value === 'check' || value === 'star' || value === 'logo' ? value : 'logo'
}

export default function StampCardView({
  businessName,
  logoUrl = null,
  pointsBalance,
  slots = 10,
  rewardText = 'Volle Karte = Prämie sichern',
  stampStyle = 'logo',
  showLogo = true
}: StampCardViewProps) {
  const normalizedSlots = normalizeSlots(slots)
  const normalizedStyle = normalizeStampStyle(stampStyle)
  const filledSlots = Math.max(0, Math.min(normalizedSlots, Math.floor(Number(pointsBalance || 0))))
  const isComplete = filledSlots >= normalizedSlots
  const cells = Array.from({ length: normalizedSlots }, (_, index) => ({
    filled: index < filledSlots,
    index: index + 1
  }))
  const [logoFailed, setLogoFailed] = useState(false)
  const useLogoStamp = normalizedStyle === 'logo' && showLogo !== false && Boolean(logoUrl) && !logoFailed
  const fallbackStamp = normalizedStyle === 'star' ? '★' : '✓'
  const remaining = Math.max(0, normalizedSlots - filledSlots)

  return (
    <section className="stampCardView" aria-label="Digitale Stempelkarte">
      <div className="stampCardTopline">
        <span className="stampCardEyebrow">Deine Stempelkarte</span>
        <span className="stampCardCounter">{filledSlots}/{normalizedSlots}</span>
      </div>

      <div className="stampCardHeader">
        <div>
          <h2>{businessName || 'Bonusclub'}</h2>
          <p>{isComplete ? 'Deine Karte ist voll – du kannst deine Prämie beim nächsten Besuch einlösen.' : remaining === 1 ? 'Noch 1 Stempel bis zur nächsten Prämie.' : `Noch ${remaining} Stempel bis zur nächsten Prämie.`}</p>
        </div>
        {isComplete && <strong className="stampCardBadge">Prämie freigeschaltet</strong>}
      </div>

      <div className={`stampCardGrid slots-${normalizedSlots}`}>
        {cells.map((cell) => (
          <div
            className={cell.filled ? 'stampSlot stampSlotFilled' : 'stampSlot'}
            key={`${normalizedSlots}-${cell.index}`}
            aria-label={cell.filled ? `Stempel ${cell.index} gesammelt` : `Stempel ${cell.index} offen`}
          >
            <div className="stampSlotInner">
              {cell.filled ? (
                useLogoStamp ? (
                  <img src={logoUrl || ''} alt={`${businessName || 'Kunden'} Logo-Stempel`} loading="lazy" onError={() => setLogoFailed(true)} />
                ) : (
                  <span aria-hidden="true">{fallbackStamp}</span>
                )
              ) : (
                <span className="stampEmptyDot" aria-hidden="true" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="stampCardFooter">
        <div className="stampCardProgressText">
          <strong>{filledSlots} von {normalizedSlots} Stempeln gesammelt</strong>
          <span>{rewardText || 'Volle Karte = Prämie sichern'}</span>
        </div>
        <div className="stampCardHint">Beim nächsten Besuch einfach wieder scannen lassen.</div>
      </div>
    </section>
  )
}
