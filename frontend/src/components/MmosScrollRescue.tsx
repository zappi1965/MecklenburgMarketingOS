'use client'

import { useEffect } from 'react'

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = String(el.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || Boolean(el.closest('[contenteditable="true"]'))
}

function closestScrollable(start: EventTarget | null, stopAt: HTMLElement | null) {
  let el = start as HTMLElement | null
  while (el && el !== stopAt && el !== document.body) {
    const style = window.getComputedStyle(el)
    const overflowY = style.overflowY
    const canScroll = /(auto|scroll)/.test(overflowY) && el.scrollHeight > el.clientHeight + 2
    if (canScroll) return el
    el = el.parentElement
  }
  return null
}

function canScroll(el: HTMLElement, deltaY: number) {
  if (!el) return false
  if (deltaY > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 1
  if (deltaY < 0) return el.scrollTop > 0
  return false
}

/**
 * V103.4 App-Shell Scroll Rescue
 *
 * V103 is built as a dashboard shell: <div class="app appLike"><aside/><main/></div>.
 * Chrome/Safari can stop scrolling when body/html and the shell fight over 100dvh.
 * This component makes the dashboard main area the explicit scroll container and
 * adds a wheel/touch fallback so scrolling still works when the browser does not
 * naturally forward the gesture to <main>.
 */
export default function MmosScrollRescue() {
  useEffect(() => {
    let lastTouchY = 0

    const getMain = () => document.querySelector('.main.appMainShell') as HTMLElement | null
    const getApp = () => document.querySelector('.app.appLike') as HTMLElement | null
    const getSide = () => document.querySelector('.side') as HTMLElement | null

    const apply = () => {
      const html = document.documentElement
      const body = document.body
      const app = getApp()
      const main = getMain()
      const side = getSide()

      if (!html || !body || !app || !main) {
        if (html) delete html.dataset.mmosAppShellScroll
        return
      }

      html.dataset.mmosAppShellScroll = 'active'
      body.classList.remove('adminDrawerLocked')
      body.classList.remove('adminCustomerSheetLocked')

      html.style.height = '100%'
      html.style.overflow = 'hidden'
      body.style.height = '100%'
      body.style.overflow = 'hidden'
      body.style.touchAction = 'auto'
      body.style.position = 'static'

      app.style.height = '100dvh'
      app.style.maxHeight = '100dvh'
      app.style.overflow = 'hidden'
      app.style.width = '100%'

      main.style.minHeight = '0'
      main.style.height = '100dvh'
      main.style.maxHeight = '100dvh'
      main.style.overflowY = 'auto'
      main.style.overflowX = 'hidden'
      main.style.setProperty('-webkit-overflow-scrolling', 'touch')
      main.style.overscrollBehaviorY = 'contain'
      main.style.touchAction = 'pan-y'
      main.setAttribute('data-mmos-scroll-container', 'main')

      if (side) {
        side.style.maxHeight = '100dvh'
        side.style.overflowY = 'auto'
        side.style.overflowX = 'hidden'
        side.style.setProperty('-webkit-overflow-scrolling', 'touch')
      }
    }

    const onWheel = (event: WheelEvent) => {
      const main = getMain()
      if (!main || isEditableTarget(event.target)) return
      const nested = closestScrollable(event.target, main)
      if (nested && canScroll(nested, event.deltaY)) return
      if (!canScroll(main, event.deltaY)) return
      main.scrollTop += event.deltaY
      event.preventDefault()
    }

    const onTouchStart = (event: TouchEvent) => {
      lastTouchY = event.touches?.[0]?.clientY || 0
    }

    const onTouchMove = (event: TouchEvent) => {
      const main = getMain()
      if (!main || isEditableTarget(event.target)) return
      const y = event.touches?.[0]?.clientY || 0
      const deltaY = lastTouchY - y
      lastTouchY = y
      if (!deltaY) return
      const nested = closestScrollable(event.target, main)
      if (nested && canScroll(nested, deltaY)) return
      if (!canScroll(main, deltaY)) return
      main.scrollTop += deltaY
      event.preventDefault()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const main = getMain()
      if (!main || isEditableTarget(event.target)) return
      const key = event.key
      const amount = key === 'PageDown' ? main.clientHeight * 0.88
        : key === 'PageUp' ? -main.clientHeight * 0.88
        : key === 'ArrowDown' ? 56
        : key === 'ArrowUp' ? -56
        : key === ' ' ? main.clientHeight * 0.88
        : 0
      if (!amount || !canScroll(main, amount)) return
      main.scrollTop += amount
      event.preventDefault()
    }

    apply()
    const timers = [50, 150, 400, 900, 1600, 2500].map((ms) => window.setTimeout(apply, ms))
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
    window.addEventListener('keydown', onKeyDown, { capture: true })

    return () => {
      timers.forEach((id) => window.clearTimeout(id))
      observer.disconnect()
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
      window.removeEventListener('wheel', onWheel, true)
      window.removeEventListener('touchstart', onTouchStart, true)
      window.removeEventListener('touchmove', onTouchMove, true)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])

  return null
}
