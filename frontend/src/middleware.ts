
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = [
  '/admin',
  '/crm',
  '/automation',
  '/media',
  '/value-dashboard',
  '/growth-command'
]

const PUBLIC_PREFIXES = [
  '/auth',
  '/api/public',
  '/api/proxy-health',
  '/impressum',
  '/datenschutz',
  '/cookies',
  '/agb',
  '/widerruf',
  '/privacy',
  '/hub',
  '/r',
  '/pay',
  '/l'
]

function hasSessionCookie(req: NextRequest) {
  return req.cookies.getAll().some((cookie) =>
    cookie.name.startsWith('sb-') ||
    cookie.name.includes('supabase') ||
    cookie.name === 'mmos_session'
  )
}

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  const guardEnabled = process.env.NEXT_PUBLIC_REQUIRE_ROUTE_GUARD === 'true'

  if (!guardEnabled || isPublic(pathname) || !isProtected(pathname)) {
    return NextResponse.next()
  }

  const demoAllowed = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true' && searchParams.has('demo')
  if (demoAllowed || hasSessionCookie(req)) {
    return NextResponse.next()
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/auth'
  loginUrl.searchParams.set('next', `${pathname}${req.nextUrl.search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/crm/:path*',
    '/automation/:path*',
    '/media/:path*',
    '/value-dashboard/:path*',
    '/value-dashboard',
    '/growth-command/:path*',
    '/growth-command'
  ]
}
