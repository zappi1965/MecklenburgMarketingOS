'use client'

import { useEffect, useRef, useState } from 'react'
import { getCurrentSession } from '@/lib/authClient'
import { getConsent, onConsentChange, requireConsent, type ConsentCategory } from '@/lib/consent'

const CONSENT_CATEGORY = (process.env.NEXT_PUBLIC_ERROR_REPORTING_CONSENT_CATEGORY || 'analytics') as ConsentCategory
const FORCE_ESSENTIAL = process.env.NEXT_PUBLIC_ERROR_REPORTING_ESSENTIAL === 'true'

function errorReportingAllowed() {
  if (FORCE_ESSENTIAL) return true
  return requireConsent(CONSENT_CATEGORY)
}

function safePathname() {
  try { return window.location.pathname } catch { return '' }
}

function safeOrigin() {
  try { return window.location.origin } catch { return '' }
}

async function sendClientError(payload: any) {
  if (!errorReportingAllowed()) return

  try {
    const session = await getCurrentSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

    const reportBody = JSON.stringify({
      ...payload,
      pathname: safePathname(),
      // bewusst nicht die komplette URL inkl. Query-Parametern senden
      origin: safeOrigin(),
      user_agent: navigator.userAgent,
      consent_category: FORCE_ESSENTIAL ? 'essential' : CONSENT_CATEGORY,
      created_at: new Date().toISOString()
    })
    async function sendErrorEndpoint(path: string) {
      return fetch(path, { method: 'POST', headers, body: reportBody, keepalive: true })
    }
    const r = await sendErrorEndpoint('/api/production/client-error')
    if (r.status === 401 || r.status === 404) await sendErrorEndpoint('/api/client-error')
  } catch (_) {}
}

export default function ClientErrorReporter() {
  const [enabled, setEnabled] = useState(false)
  const cleanupRef = useRef<null | (() => void)>(null)

  useEffect(() => {
    function refresh() {
      const consent = getConsent()
      setEnabled(FORCE_ESSENTIAL || Boolean(consent[CONSENT_CATEGORY]))
    }

    refresh()
    const off = onConsentChange(refresh)
    return () => off()
  }, [])

  useEffect(() => {
    if (!enabled) {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      return
    }

    function onError(event: ErrorEvent) {
      void sendClientError({
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack ? String(event.error.stack).slice(0, 3000) : null,
        type: 'window_error'
      })
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const reason: any = event.reason
      void sendClientError({
        message: reason?.message || String(reason || 'Unhandled rejection'),
        stack: reason?.stack ? String(reason.stack).slice(0, 3000) : null,
        type: 'unhandled_rejection'
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    cleanupRef.current = () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }

    return cleanupRef.current
  }, [enabled])

  return null
}
