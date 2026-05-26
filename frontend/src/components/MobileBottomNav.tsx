'use client'

import { useMemo } from 'react'
import {
  LayoutDashboard, Users, QrCode, Star, Megaphone, Bot, CalendarClock,
  TrendingUp, Target, CreditCard, Wallet, LineChart, Settings,
  type LucideIcon
} from 'lucide-react'
import { getMobileBottomNav, type ToolSection } from '@/lib/toolRegistry'

type Area = 'admin' | 'customer'

type MobileBottomNavProps = {
  area?: Area
  packageKey?: string
  activeKey?: string
  onSelect?: (sectionKey: string) => void
  homeHref?: string
}

// Reusable Bottom-Navigation, gespeist aus der Phase-4 SSoT-Registry
// (getMobileBottomNav). Liefert max. 5 Sektionen sortiert nach
// mobilePriority und respektiert das Paket des aktuellen Kunden.
//
// Verwendung:
//   <MobileBottomNav area="customer" packageKey={profile?.package_name} />
//
// Verhalten:
//   - Wird per CSS nur unter 768px sichtbar (siehe globals.css)
//   - Setzt Safe-Area-Inset-Bottom fuer iPhone-Notch / Home-Indicator
//   - 44 px Touch-Targets gemaess Apple HIG
export default function MobileBottomNav({
  area = 'customer',
  packageKey,
  activeKey,
  onSelect,
  homeHref = '/'
}: MobileBottomNavProps) {
  const sections: ToolSection[] = useMemo(
    () => getMobileBottomNav(packageKey || (area === 'admin' ? 'premium' : 'starter'), area),
    [area, packageKey]
  )

  if (sections.length === 0) return null

  return (
    <nav className="mmosBottomNav" role="navigation" aria-label="Hauptnavigation">
      {sections.map((s) => {
        const active = activeKey ? activeKey === s.key : false
        const firstTool = s.tools[0]
        const href = firstTool?.route || homeHref
        const handleClick = onSelect
          ? (e: React.MouseEvent) => {
              e.preventDefault()
              onSelect(s.key)
            }
          : undefined
        return (
          <a
            key={s.key}
            href={href}
            onClick={handleClick}
            aria-current={active ? 'page' : undefined}
            className={active ? 'mmosBottomNavItem active' : 'mmosBottomNavItem'}
          >
            <span className="mmosBottomNavIcon" aria-hidden="true">
              <IconFor name={s.icon} />
            </span>
            <span className="mmosBottomNavLabel">{s.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

// Lucide-Icon-Map: jeder Icon-Key aus der toolRegistry-SectionMeta wird
// auf eine konkrete Lucide-Komponente abgebildet.
const ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  users: Users,
  'qr-code': QrCode,
  star: Star,
  megaphone: Megaphone,
  bot: Bot,
  'calendar-clock': CalendarClock,
  'trending-up': TrendingUp,
  target: Target,
  'credit-card': CreditCard,
  wallet: Wallet,
  'line-chart': LineChart,
  settings: Settings
}

function IconFor({ name }: { name?: string }) {
  const Icon = (name && ICONS[name]) || LayoutDashboard
  return <Icon size={20} strokeWidth={2} />
}
