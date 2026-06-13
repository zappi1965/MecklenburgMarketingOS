// Gemeinsame Helfer für öffentliche Marketing-Seiten (Referral, Deals, Mini-Website).
// QR-Bilder laufen über den vorhandenen /api/qr-Proxy ans Backend.

export function publicQrImage(value: string, size = 512): string {
  const params = new URLSearchParams({ value, size: String(size) })
  return `/api/qr?${params.toString()}`
}

export function absolutePublicUrl(path: string): string {
  if (typeof window === 'undefined') return path
  if (/^https?:\/\//i.test(path)) return path
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`
}

export type ShareLinks = {
  whatsapp: string
  email: string
  native?: () => Promise<void>
}

export function buildShareLinks({ url, title = '', text = '' }: { url: string; title?: string; text?: string }): ShareLinks {
  const absolute = absolutePublicUrl(url)
  const message = `${text ? text + ' ' : ''}${absolute}`.trim()
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`,
    native:
      typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function'
        ? async () => {
            try {
              await (navigator as any).share({ title, text, url: absolute })
            } catch (_) {
              /* user cancelled */
            }
          }
        : undefined
  }
}

export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch (_) {
    /* fall through */
  }
  return false
}
