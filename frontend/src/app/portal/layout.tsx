import type { ReactNode } from 'react'
import CustomerPortalShell from '@/components/portal/CustomerPortalShell'
export const metadata = { robots: { index: false, follow: false }, title: 'Kundenbereich · Mecklenburg Marketing' }
export default function PortalLayout({ children }: { children: ReactNode }) { return <CustomerPortalShell>{children}</CustomerPortalShell> }
