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
  Search,
  ClipboardList,
  Ticket,
  Link2,
  Undo2,
  AtSign,
  Megaphone,
  Contact,
  CreditCard,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Gates the item behind an active tenant tool; core items omit it. */
  tool?: string;
}

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/loyalty", label: "Loyalty", icon: Stamp, tool: "loyalty" },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star, tool: "reviews" },
  { href: "/dashboard/booking", label: "Booking", icon: CalendarClock, tool: "booking" },
  { href: "/dashboard/pos", label: "Kasse", icon: ScanLine, tool: "loyalty" },
  { href: "/dashboard/newsletter", label: "Newsletter", icon: Mail, tool: "newsletter" },
  { href: "/dashboard/retention", label: "Rückholaktionen", icon: Undo2, tool: "retention" },
  { href: "/dashboard/referral", label: "Empfehlungen", icon: Gift, tool: "referral" },
  { href: "/dashboard/seo", label: "SEO", icon: Search, tool: "seo" },
  { href: "/dashboard/surveys", label: "Umfragen", icon: ClipboardList, tool: "surveys" },
  { href: "/dashboard/giftcards", label: "Gutscheine", icon: Ticket, tool: "giftcards" },
  { href: "/dashboard/links", label: "Links", icon: Link2, tool: "links" },
  { href: "/dashboard/bio", label: "Link-in-Bio", icon: AtSign, tool: "bio" },
  { href: "/dashboard/social", label: "Social-Planer", icon: Megaphone, tool: "social" },
  { href: "/dashboard/crm", label: "CRM & Leads", icon: Contact, tool: "crm" },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings },
];

export function DashboardNav({ activeTools }: { activeTools: string[] }) {
  const pathname = usePathname();
  const activeSet = new Set(activeTools);
  const items = ITEMS.filter((i) => !i.tool || activeSet.has(i.tool));
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5">
      {items.map(({ href, label, icon: Icon, exact }) => {
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
