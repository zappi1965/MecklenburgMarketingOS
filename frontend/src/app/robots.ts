import type { MetadataRoute } from 'next'

// Öffentliche Marketing-Seiten dürfen indexiert werden; interne Bereiche nicht.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_APP_URL || ''
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/site/', '/deal/', '/l/', '/r/', '/q/', '/hub/'],
        disallow: ['/admin/', '/portal/', '/api/', '/auth', '/counter/', '/qr-display/']
      }
    ],
    sitemap: base ? `${base.replace(/\/+$/, '')}/sitemap.xml` : undefined
  }
}
