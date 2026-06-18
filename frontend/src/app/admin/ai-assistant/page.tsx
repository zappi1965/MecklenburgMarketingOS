'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getCurrentUserProfile } from '@/lib/authClient'
import { BROWSER_BACKEND_BASE } from '@/lib/backendUrl'
import { AdminAiAssistant } from '@/components/admin/AdminAiAssistant'

export default function AiAssistantPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    getCurrentUserProfile().then((profile) => {
      if (!profile) { setAuthorized(false); return }
      setAuthorized(true)
      setUserName(profile.name || profile.email || 'Admin')
    })
  }, [])

  if (authorized === null) return null
  if (authorized === false) {
    return (
      <main className="adminPage">
        <div className="adminNotice"><b>Anmeldung erforderlich.</b></div>
      </main>
    )
  }

  return (
    <AdminAiAssistant
      apiBase={BROWSER_BACKEND_BASE}
      userName={userName}
    />
  )
}
