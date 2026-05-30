import { NextRequest, NextResponse } from 'next/server'

/**
 * MMOS Front-/Backoffice Auth Fix
 *
 * Supabase browser sessions are not reliably available to middleware.
 * Server redirects based on cookie checks caused valid admins to be sent back
 * to /auth when opening Backoffice tools.
 *
 * Access control remains in the client via RoleGate/AdminOnly/ToolAccessGate.
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
