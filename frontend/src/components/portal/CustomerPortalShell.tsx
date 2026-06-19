'use client'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BarChart3, FileText, QrCode, Star, User, LogOut, Gift, Megaphone, ShieldCheck, Receipt, Settings, Users } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUserProfile, supabaseAuth } from '@/lib/authClient'
import { CustomerOrAdminOnly } from '@/components/security/RoleGate'
import { customerVisibleToolsForPackage } from '@/lib/toolRegistry'
import BrandLogo from '@/components/brand/BrandLogo'

const BASE_NAV = [
  { href: '/portal/dashboard', label: 'Dashboard', icon: BarChart3, toolKeys: ['dashboard', 'customer_portal_pro', 'portal_home'] },
  { href: '/portal/reports', label: 'Reports & PDFs', icon: FileText, toolKeys: ['portal_reports', 'monthly_report_pdf_delivery', 'dashboard_reporting', 'media_center', 'branche_benchmark'] },
  { href: '/portal/qr-campaigns', label: 'QR-Kampagnen', icon: QrCode, toolKeys: ['qr_campaigns', 'qr_slug_loyalty_campaigns', 'public_landing_page'] },
  { href: '/portal/loyalty', label: 'Loyalty', icon: Gift, toolKeys: ['loyalty', 'loyalty_growth_center', 'loyalty_rewards', 'retention_intelligence_suite', 'referral_program'] },
  { href: '/portal/reviews', label: 'Reviews', icon: Star, toolKeys: ['reviews', 'reviews_reputation', 'review_intelligence', 'feedback_action_board', 'service_recovery_tool'] },
  { href: '/portal/campaigns', label: 'Kampagnen', icon: Megaphone, toolKeys: ['segment_campaigns', 'marketing_automation', 'churn_prevention_center', 'ai_social_posts', 'deal_of_week', 'mini_website'] },
  { href: '/portal/consents', label: 'Einwilligungen', icon: ShieldCheck, toolKeys: ['portal_consents', 'consent_center_double_optin', 'public_consent_center'] },
  { href: '/portal/billing', label: 'Paket & Billing', icon: Receipt, toolKeys: ['e_invoice', 'accounting_export', 'pos_integration', 'sumup_revenue_connection', 'invoices'] },
  { href: '/portal/settings', label: 'Einstellungen', icon: Settings, toolKeys: ['branding', 'online_booking', 'profile'] },
  { href: '/portal/team', label: 'Team', icon: Users, toolKeys: ['profile', 'customer_portal_pro'] },
  { href: '/portal/profile', label: 'Profil', icon: User, toolKeys: ['profile'] }
]

export default function CustomerPortalShell({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    setCurrentPath(window.location.pathname)
    getCurrentUserProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  const allowedToolKeys = useMemo(() => new Set(
    customerVisibleToolsForPackage(profile?.package_name || profile?.package || profile?.tier || 'starter')
      .map((tool) => tool.key)
  ), [profile])

  async function logout() {
    try { await supabaseAuth.auth.signOut() } catch {}
    if (typeof window !== 'undefined') window.location.href = '/auth'
  }

  return (
    <CustomerOrAdminOnly>
      <div className="adminShell">
        <aside className="adminSidebar">
          <div className="adminSidebarHeader">
            <BrandLogo href="/portal/dashboard" variant="sidebar" subline="Kundenbereich" />
          </div>
          <nav className="adminNav" aria-label="Kunden-Navigation">
            <div className="adminNavSection">
              <div className="adminNavSectionLabel">Frontoffice / Kundenbereich</div>
              {BASE_NAV.filter((item) => item.href === '/portal/profile' || item.toolKeys.some((key) => allowedToolKeys.has(key))).map((item) => {
                const Icon = item.icon
                const active = currentPath === item.href || currentPath.startsWith(item.href + '/')
                return (
                  <Link key={item.href} href={item.href} className={active ? 'adminNavItem active' : 'adminNavItem'} aria-current={active ? 'page' : undefined}>
                    <Icon size={16} strokeWidth={2} />
                    <span>{item.label}</span>
                  </Link>
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
