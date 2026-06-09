import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'MMOS Frontend',
    version: process.env.NEXT_PUBLIC_MMOS_VERSION || 'v103.8-stability-security-cleanup',
    directBackendEnabled: process.env.NEXT_PUBLIC_ENABLE_DIRECT_BACKEND === 'true' || process.env.NEXT_PUBLIC_USE_DIRECT_BACKEND === 'true',
    publicBackendFallbackEnabled: process.env.NEXT_PUBLIC_ENABLE_PUBLIC_BACKEND_FALLBACK === 'true',
    privateBackendFallbackEnabled: process.env.NEXT_PUBLIC_ENABLE_PRIVATE_BACKEND_FALLBACK === 'true',
    scrollRescueEnabled: process.env.NEXT_PUBLIC_SCROLL_RESCUE === 'true',
    timestamp: new Date().toISOString()
  })
}
