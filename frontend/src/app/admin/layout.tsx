import type { ReactNode } from 'react'
import AdminShell from '@/components/AdminShell'
import { AdminOnly } from '@/components/security/RoleGate'

export const metadata = {
  robots: { index: false, follow: false }
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminOnly><AdminShell>{children}</AdminShell></AdminOnly>
}
