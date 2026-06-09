"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Stamp,
  Star,
  CalendarClock,
  ScanLine,
  Mail,
  Gift,
  CreditCard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/loyalty", label: "Loyalty", icon: Stamp },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/booking", label: "Booking", icon: CalendarClock },
  { href: "/dashboard/pos", label: "Kasse", icon: ScanLine },
  { href: "/dashboard/newsletter", label: "Newsletter", icon: Mail },
  { href: "/dashboard/referral", label: "Empfehlungen", icon: Gift },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
