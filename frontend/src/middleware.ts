import { NextResponse } from 'next/server'

// WICHTIG — KEINE harten Login-Redirects hier einbauen!
//
// Die Auth-Session lebt im Supabase-JS-Client ausschließlich im localStorage
// (NICHT in Cookies). Eine cookie-basierte Edge-Middleware kann eine gültige
// Session daher gar nicht sehen und würde bereits angemeldete Nutzer beim
// Navigieren zu /admin/* (z. B. zum KI-Bot unter /admin/ai-assistant) auf
// /auth umleiten → Endlos-Login-Loop.
//
// Das Auth-Gating passiert deshalb bewusst rein clientseitig:
//   - RoleGate / AdminOnly (frontend/src/components/security/RoleGate.tsx)
//   - localStorage-Rolle + Profil-Cache
//   - Backend-Bearer-Token schützt ALLE echten Datenzugriffe
//
// Der Fullbuild-Guard (scripts/v061-fullbuild-check.mjs) erzwingt, dass diese
// Datei keine harten Redirects enthält und sauber NextResponse.next()
// zurückgibt. Bitte nicht wieder ändern.
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/crm/:path*',
    '/automation/:path*',
    '/media/:path*',
    '/value-dashboard/:path*',
    '/growth-command/:path*',
    '/dashboard/:path*',
    '/portal/:path*',
    '/reviews/:path*',
    '/qr-campaigns/:path*',
    '/loyalty/:path*',
    '/tickets/:path*',
    '/invoices/:path*',
    '/analytics/:path*',
    '/booking/:path*',
    '/inbox/:path*',
    '/payments-vouchers/:path*',
    '/referrals/:path*',
    '/settings/:path*'
  ]
}
