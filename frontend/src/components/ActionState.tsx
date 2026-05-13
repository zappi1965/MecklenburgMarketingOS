
'use client'

import { useState } from 'react'

export function useActionState() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function run(fn: () => Promise<any> | any, successMessage = 'Aktion erfolgreich') {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result = await fn()
      setSuccess(successMessage)
      setTimeout(() => setSuccess(''), 2400)
      return result
    } catch (e: any) {
      setError(e.message || 'Aktion fehlgeschlagen')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, success, run }
}

export function ActionBanner({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null

  return (
    <div className={`toast ${error ? 'red' : 'green'}`}>
      {error || success}
    </div>
  )
}
