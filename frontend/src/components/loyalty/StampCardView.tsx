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
  const cells = Array.from({ length: normalizedSlots }, (_, index) => index < filledSlots)
  const useLogoStamp = normalizedStyle === 'logo' && showLogo !== false && Boolean(logoUrl)
  const fallbackStamp = normalizedStyle === 'star' ? '★' : '✓'

  return (
    <section className="stampCardView" aria-label="Digitale Stempelkarte">
      <div className="stampCardTopline">
        <span>Deine Stempelkarte</span>
        {isComplete && <strong>Prämie freigeschaltet</strong>}
      </div>

      <div className="stampCardHeader">
        <div>
          <h2>{businessName || 'Bonusclub'}</h2>
          <p>Beim nächsten Besuch einfach wieder scannen lassen.</p>
        </div>
      </div>

      <div className={`stampCardGrid slots-${normalizedSlots}`}>
        {cells.map((filled, index) => (
          <div className={filled ? 'stampSlot stampSlotFilled' : 'stampSlot'} key={`${normalizedSlots}-${index}`} aria-label={filled ? `Stempel ${index + 1} gesammelt` : `Stempel ${index + 1} offen`}>
            {filled ? (
              useLogoStamp ? (
                <img src={logoUrl || ''} alt={`${businessName || 'Kunden'} Logo-Stempel`} loading="lazy" />
              ) : (
                <span aria-hidden="true">{fallbackStamp}</span>
              )
            ) : (
              <span className="stampEmptyDot" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      <div className="stampCardProgressText">
        <strong>{filledSlots} von {normalizedSlots} Stempeln gesammelt</strong>
        <span>{rewardText || 'Volle Karte = Prämie sichern'}</span>
      </div>
    </section>
  )
}
