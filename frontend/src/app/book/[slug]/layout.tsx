import type { ReactNode } from 'react'

// Buchungs-Widget pro Customer — keine Suchmaschinen-Indexierung.
export const metadata = {
  robots: { index: false, follow: false, nocache: true }
}

export default function BookingWidgetLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
