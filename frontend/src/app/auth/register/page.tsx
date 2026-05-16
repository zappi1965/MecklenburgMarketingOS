
'use client'

import { useEffect } from 'react'

export default function RegisterRedirect() {
  useEffect(()=>{ window.location.href = '/auth' },[])
  return <main className="authShell"><section className="authCard"><h1>Weiterleitung...</h1></section></main>
}
