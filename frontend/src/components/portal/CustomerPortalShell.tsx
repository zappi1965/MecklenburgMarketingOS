'use client'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BarChart3, FileText, QrCode, Receipt, Star, Ticket, User, LogOut } from 'lucide-react'
import { getCurrentUserProfile, supabaseAuth } from '@/lib/authClient'
import { CustomerOrAdminOnly } from '@/components/security/RoleGate'
import { customerVisibleToolsForPackage } from '@/lib/toolRegistry'
import BrandLogo from '@/components/brand/BrandLogo'

const BASE_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3, toolKey: 'dashboard' },
  { href: '/portal/reports', label: 'Reports & PDFs', icon: FileText, toolKey: 'media_center' },
  { href: '/reviews', label: 'Bewertungen', icon: Star, toolKey: 'reviews' },
  { href: '/qr-campaigns', label: 'QR-Kampagnen', icon: QrCode, toolKey: 'qr_campaigns' },
  { href: '/tickets', label: 'Support', icon: Ticket, toolKey: 'tickets' },
  { href: '/invoices', label: 'Rechnungen', icon: Receipt, toolKey: 'invoices' },
  { href: '/portal/profile', label: 'Profil', icon: User, toolKey: 'profile' }
]

export default function CustomerPortalShell({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    setCurrentPath(window.location.pathname)
    getCurrentUserProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  const allowedToolKeys = useMemo(() => new Set(customerVisibleToolsForPackage(profile?.package_name || profile?.package || profile?.tier || 'starter').map((tool) => tool.key)), [profile])

  async function logout() {
    try { await supabaseAuth.auth.signOut() } catch {}
    if (typeof window !== 'undefined') window.location.href = '/auth'
  }

  return (
    <CustomerOrAdminOnly>
      <div className="adminShell">
        <aside className="adminSidebar">
          <div className="adminSidebarHeader">
            <BrandLogo href="/dashboard" variant="sidebar" subline="Kundenbereich" />
          </div>
          <nav className="adminNav" aria-label="Kunden-Navigation">
            <div className="adminNavSection">
              <div className="adminNavSectionLabel">Ihr Bereich</div>
              {BASE_NAV.filter((item) => item.toolKey === 'profile' || allowedToolKeys.has(item.toolKey)).map((item) => {
                const Icon = item.icon
                const active = currentPath === item.href || currentPath.startsWith(item.href + '/')
                return (
                  <a key={item.href} href={item.href} className={active ? 'adminNavItem active' : 'adminNavItem'} aria-current={active ? 'page' : undefined}>
                    <Icon size={16} strokeWidth={2} />
                    <span>{item.label}</span>
                  </a>
                )
              })}
            </div>
          </nav>
          <div className="adminSidebarFooter">
            <button type="button" className="adminLogout" onClick={logout}><LogOut size={14} /> Logout</button>
          </div>
        </aside>
        <main className="adminContent">{children}</main>
      </div>
    </CustomerOrAdminOnly>
  )
}
