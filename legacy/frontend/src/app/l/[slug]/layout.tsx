import type { ReactNode } from 'react'

// Slugs dürfen niemals in Suchmaschinen-Indexen landen, weil sie sprechende
// Namen oder personenbezogene Bestandteile enthalten können.
export const metadata = {
  robots: { index: false, follow: false, nocache: true }
}

export default function PublicSlugLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
