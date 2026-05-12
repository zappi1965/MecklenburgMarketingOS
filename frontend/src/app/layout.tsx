
import './globals.css'

export const metadata = {
  title: 'MMOS v10 Enterprise MVP',
  description: 'Mecklenburg Marketing OS'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="de"><body>{children}</body></html>
}
