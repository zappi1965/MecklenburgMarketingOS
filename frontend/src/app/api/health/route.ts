import { NextResponse } from 'next/server'
import { getGotenbergUrl, getOptionalEnv } from '../../../lib/mmos/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseUrl = getOptionalEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'])
  const serviceRoleKey = getOptionalEnv(['SUPABASE_SERVICE_ROLE_KEY'])
  const resendApiKey = getOptionalEnv(['RESEND_API_KEY'])
  const mailFrom = getOptionalEnv(['MAIL_FROM'])
  const gotenbergUrl = getGotenbergUrl()

  return NextResponse.json({
    ok: true,
    service: 'MecklenburgMarketingOS',
    version: 'v061-live-fullbuild',
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
    checks: {
      supabaseConfigured: Boolean(supabaseUrl && serviceRoleKey),
      mailConfigured: Boolean(resendApiKey && mailFrom),
      gotenbergConfigured: Boolean(gotenbergUrl)
    },
    timestamp: new Date().toISOString()
  })
}
