import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'mmos_consent_v1'
const COOKIE_MAX_AGE = 180 * 24 * 60 * 60 // 180 days in seconds

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const value = cookieStore.get(COOKIE_NAME)?.value ?? null
  return NextResponse.json({ value })
}

export async function POST(req: NextRequest) {
  let body: { categories?: Record<string, boolean> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const categories = body?.categories
  if (!categories || typeof categories !== 'object') {
    return NextResponse.json({ error: 'Missing categories' }, { status: 400 })
  }

  const value = encodeURIComponent(JSON.stringify(categories))

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  })

  return response
}
