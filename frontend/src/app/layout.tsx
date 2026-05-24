
import './globals.css'
import type { ReactNode } from 'react'
import LegalFooter from '@/components/legal/LegalFooter'
import FieldHelpEnhancer from '@/components/FieldHelpEnhancer'

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover', themeColor: '#070b12' }

export const metadata = {
  title: 'Mecklenburg Marketing OS',
  description: 'Das lokale Marketing-Betriebssystem für Google Business, SEO, Reviews, QR-Kampagnen und Kundenbindung.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'MMOS', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  icons: { icon: '/icons/mmos-icon.svg', apple: '/icons/mmos-icon.svg' }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="de"><body><FieldHelpEnhancer />{children}<LegalFooter /></body></html>
}
