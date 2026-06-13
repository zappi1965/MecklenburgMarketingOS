import './globals.css'
import '@/styles/brand.css'
import type { ReactNode } from 'react'
import LegalFooter from '@/components/legal/LegalFooter'
import FieldHelpEnhancer from '@/components/FieldHelpEnhancer'
import ConsentBanner from '@/components/ConsentBanner'
import ClientErrorReporter from '@/components/ClientErrorReporter'
import MmosScrollUnlock from '@/components/MmosScrollUnlock'

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, viewportFit: 'cover', themeColor: '#070b12' }

export const metadata = {
  applicationName: 'MMOS',
  title: 'MecklenburgMarketing — Mehr lokale Kunden durch Google, Bewertungen & Wiederbesuche',
  description: 'Kostenlose Analyse für lokale Betriebe in MV: Google-Sichtbarkeit, Bewertungen, Fotos und Wiederbesuch-Potenziale verständlich prüfen lassen.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'MMOS', statusBarStyle: 'black-translucent' },
  other: { 'mobile-web-app-capable': 'yes', 'apple-mobile-web-app-capable': 'yes', 'apple-mobile-web-app-status-bar-style': 'black-translucent' },
  formatDetection: { telephone: false },
  icons: { icon: '/icons/mmos-icon.svg', apple: '/icons/mmos-icon.svg' }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="de"><body><MmosScrollUnlock /><ClientErrorReporter /><FieldHelpEnhancer />{children}<LegalFooter /><ConsentBanner /></body></html>
}
