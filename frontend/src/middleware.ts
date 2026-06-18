import { NextRequest, NextResponse } from 'next/server'

const AUTH_COOKIE_NAMES = ['sb-access-token', 'sb-refresh-token']

function hasAuthCookie(req: NextRequest): boolean {
  return AUTH_COOKIE_NAMES.some((name) => req.cookies.has(name)) ||
    req.cookies.getAll().some(({ name }) => name.startsWith('sb-') && name.endsWith('-auth-token'))
}

export function middleware(req: NextRequest) {
  if (!hasAuthCookie(req)) {
    const loginUrl = new URL('/auth', req.url)
    loginUrl.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
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
