'use client'

import { useEffect } from 'react'

/**
 * V103.2 Scroll Rescue
 *
 * V103 contains several mobile/app-shell hardening layers that can accidentally
 * turn the page into a locked 100dvh shell in Chrome/Safari/Firefox. This
 * component deliberately restores normal document scrolling after hydration.
 * It is intentionally small and defensive: no business logic, no API calls.
 */
export default function MmosScrollRescue() {
  useEffect(() => {
    const unlock = () => {
      const html = document.documentElement
      const body = document.body
      if (!html || !body) return

      html.dataset.mmosScrollRescue = 'enabled'

      // Remove classes that can remain active after mobile drawers/sheets.
      body.classList.remove('adminDrawerLocked')
      body.classList.remove('adminCustomerSheetLocked')

      // Inline styles win over old CSS bundles and browser restore quirks.
      html.style.height = 'auto'
      html.style.minHeight = '100%'
      html.style.overflowY = 'auto'
      html.style.overflowX = 'hidden'
      html.style.position = 'static'

      body.style.height = 'auto'
      body.style.minHeight = '100%'
      body.style.overflowY = 'auto'
      body.style.overflowX = 'hidden'
      body.style.position = 'static'
      body.style.touchAction = 'auto'
    }

    unlock()
    const timers = [100, 350, 900, 1600].map((ms) => window.setTimeout(unlock, ms))
    window.addEventListener('resize', unlock)
    window.addEventListener('orientationchange', unlock)

    return () => {
      timers.forEach((id) => window.clearTimeout(id))
      window.removeEventListener('resize', unlock)
      window.removeEventListener('orientationchange', unlock)
    }
  }, [])

  return null
}
