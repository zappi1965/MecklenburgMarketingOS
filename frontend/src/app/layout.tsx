
import './globals.css'

export const viewport = { width: 'device-width', initialScale: 1 }

export const metadata = {
  title: 'MMOS v10 Core',
  description: 'Mecklenburg Marketing OS Core Fullbuild'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="de"><body>{children}</body></html>
}
