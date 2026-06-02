import { NextRequest, NextResponse } from 'next/server'

/**
 * MMOS V061 Middleware
 *
 * Wichtig:
 * Supabase Browser-Sessions sind in Middleware nicht zuverlässig genug,
 * um harte Redirects für Admin-/Backoffice-Bereiche zu erzwingen.
 *
 * Daher bleibt die Middleware bewusst soft.
 * Zugriffsschutz erfolgt client- und datenbankseitig über:
 * - RoleGate
 * - AdminOnly
 * - ToolAccessGate
 * - Supabase RLS / Service Role APIs
 */
export function middleware(_req: NextRequest) {
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
