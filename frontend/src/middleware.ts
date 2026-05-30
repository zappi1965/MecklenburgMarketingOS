import { NextRequest, NextResponse } from 'next/server'

/**
 * MMOS Auth Routing Fix
 *
 * Supabase browser sessions are stored client-side. The middleware cannot reliably
 * see those sessions as cookies. A server-side redirect based only on cookies
 * caused valid users to be sent back to /auth when opening /admin tools.
 *
 * Protected pages are therefore allowed to render and are guarded client-side by:
 * - AdminOnly / RoleGate
 * - CustomerOrAdminOnly / ToolAccessGate
 *
 * Result:
 * - Admin tools open without a forced re-login.
 * - Unauthenticated users still see the client-side login-required panel.
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
