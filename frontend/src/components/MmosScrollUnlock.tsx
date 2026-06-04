'use client'

import { useEffect } from 'react'

/**
 * V103.5 passive scroll rescue.
 * Important: this does NOT lock html/body and does NOT intercept wheel/touch events.
 * It only removes leftover lock classes / inline styles and lets the document scroll normally.
 */
export default function MmosScrollUnlock() {
  useEffect(() => {
    const unlock = () => {
      const html = document.documentElement
      const body = document.body
      if (!html || !body) return

      html.dataset.mmosScrollUnlocked = 'true'
      delete html.dataset.mmosAppShellScroll

      body.classList.remove('adminDrawerLocked')
      body.classList.remove('adminCustomerSheetLocked')
      body.classList.remove('modalOpen')
      body.classList.remove('scrollLocked')

      html.style.setProperty('height', 'auto', 'important')
      html.style.setProperty('min-height', '100%', 'important')
      html.style.setProperty('max-height', 'none', 'important')
      html.style.setProperty('overflow-y', 'auto', 'important')
      html.style.setProperty('overflow-x', 'hidden', 'important')
      html.style.setProperty('position', 'static', 'important')
      html.style.setProperty('touch-action', 'auto', 'important')

      body.style.setProperty('height', 'auto', 'important')
      body.style.setProperty('min-height', '100%', 'important')
      body.style.setProperty('max-height', 'none', 'important')
      body.style.setProperty('overflow-y', 'auto', 'important')
      body.style.setProperty('overflow-x', 'hidden', 'important')
      body.style.setProperty('position', 'static', 'important')
      body.style.setProperty('touch-action', 'auto', 'important')

      const app = document.querySelector('.app.appLike') as HTMLElement | null
      const main = document.querySelector('.main.appMainShell') as HTMLElement | null
      if (app) {
        app.style.setProperty('height', 'auto', 'important')
        app.style.setProperty('min-height', '100vh', 'important')
        app.style.setProperty('max-height', 'none', 'important')
        app.style.setProperty('overflow', 'visible', 'important')
      }
      if (main) {
        main.style.setProperty('height', 'auto', 'important')
        main.style.setProperty('min-height', '100vh', 'important')
        main.style.setProperty('max-height', 'none', 'important')
        main.style.setProperty('overflow-y', 'visible', 'important')
        main.style.setProperty('overflow-x', 'hidden', 'important')
        main.style.setProperty('-webkit-overflow-scrolling', 'touch')
      }
    }

    unlock()
    const timers = [50, 150, 400, 900, 1600, 2500].map((ms) => window.setTimeout(unlock, ms))
    const observer = new MutationObserver(unlock)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true })
    window.addEventListener('resize', unlock)
    window.addEventListener('orientationchange', unlock)
    return () => {
      timers.forEach(window.clearTimeout)
      observer.disconnect()
      window.removeEventListener('resize', unlock)
      window.removeEventListener('orientationchange', unlock)
    }
  }, [])

  return null
}
