'use client'

export const dynamic = 'force-dynamic'

import { BROWSER_BACKEND_BASE } from '@/lib/backendUrl'
import { AdminAiAssistant } from '@/components/admin/AdminAiAssistant'

// Auth durch AdminOnly in admin/layout.tsx — kein zweiter Backend-Call nötig.
export default function AiAssistantPage() {
  return <AdminAiAssistant apiBase={BROWSER_BACKEND_BASE} />
}
