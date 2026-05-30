import Image from 'next/image'

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
  const content = (
    <span className={`brandLogo brandLogo--${variant} ${className}`.trim()}>
      <span className="brandLogoMarkWrap" aria-hidden="true">
        <Image
          src="/brand/mecklenburg-marketing-logo-mark.png"
          alt=""
          width={180}
          height={120}
          priority={variant === 'sidebar' || variant === 'topbar'}
          className="brandLogoMark"
        />
      </span>
      {!isMarkOnly && (
        <span className="brandLogoTextWrap">
          {isFull ? (
            <Image
              src="/brand/mecklenburg-marketing-logo-full.png"
              alt="Mecklenburg Marketing"
              width={720}
              height={260}
              priority
              className="brandLogoFull"
            />
          ) : (
            <>
              <span className="brandLogoText">Mecklenburg Marketing</span>
              {subline && <span className="brandLogoSubline">{subline}</span>}
            </>
          )}
        </span>
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
