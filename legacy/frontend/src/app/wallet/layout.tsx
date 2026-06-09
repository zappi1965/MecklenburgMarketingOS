import type { ReactNode } from 'react'

// /wallet/* ist eine Endkunden-Surface (Anna, die ihre Bonusclubs sieht).
// Kein Admin-Shell. noindex weil personenbezogen.
export const metadata = {
  robots: { index: false, follow: false }
}

export default function WalletLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
