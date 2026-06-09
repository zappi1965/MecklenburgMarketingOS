import { NextResponse } from 'next/server'
import { analyzeGoogleMiniAudit } from '@/lib/mini-audit/googleDataAnalyzer'
import { buildMiniAuditPptx, miniAuditFileName } from '@/lib/mini-audit/pptxBuilder'
import type { GooglePlacePublicData, MiniAuditResult } from '@/lib/mini-audit/types'

export const runtime = 'nodejs'

type GenerateBody = {
  googleData?: GooglePlacePublicData
  audit?: MiniAuditResult
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateBody
    const audit = body.audit || (body.googleData ? analyzeGoogleMiniAudit(body.googleData) : null)

    if (!audit) {
      return NextResponse.json({ ok: false, error: 'Keine Google-Daten für die Mini-Audit-Erstellung übergeben.' }, { status: 400 })
    }

    if (audit.auditMode !== 'mini_google_only') {
      return NextResponse.json({ ok: false, error: 'Dieser Export erlaubt nur Mini-Audits auf Basis öffentlicher Google-Daten.' }, { status: 400 })
    }

    const pptx = buildMiniAuditPptx(audit)
    const fileName = miniAuditFileName(audit.clientName)

    return new NextResponse(new Uint8Array(pptx), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'PPTX-Erstellung fehlgeschlagen.' }, { status: 500 })
  }
}
