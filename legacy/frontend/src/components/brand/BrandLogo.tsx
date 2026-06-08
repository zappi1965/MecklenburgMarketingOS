type BrandLogoVariant = 'sidebar' | 'topbar' | 'mark' | 'full'

export default function BrandLogo({
  href,
  variant = 'sidebar',
  subline,
  className = ''
}: {
  href?: string
  variant?: BrandLogoVariant
  subline?: string
  className?: string
}) {
  const isMarkOnly = variant === 'mark'
  const isFull = variant === 'full'
  const markSrc = '/brand/mecklenburg-marketing-logo-mark.png'
  const fullSrc = '/brand/mecklenburg-marketing-logo-full.png'

  const content = (
    <span className={`brandLogo brandLogo--${variant} ${className}`.trim()}>
      {isFull ? (
        <img
          src={fullSrc}
          alt="Mecklenburg Marketing"
          className="brandLogoFull"
          loading="eager"
        />
      ) : (
        <>
          <span className="brandLogoMarkWrap" aria-hidden="true">
            <img
              src={markSrc}
              alt=""
              className="brandLogoMark"
              loading="eager"
            />
          </span>
          {!isMarkOnly && (
            <span className="brandLogoTextWrap">
              <span className="brandLogoText">Mecklenburg Marketing</span>
              {subline && <span className="brandLogoSubline">{subline}</span>}
            </span>
          )}
        </>
      )}
    </span>
  )

  if (!href) return content

  return (
    <a href={href} className={`brandLogoLink brandLogoLink--${variant}`}>
      {content}
    </a>
  )
}
