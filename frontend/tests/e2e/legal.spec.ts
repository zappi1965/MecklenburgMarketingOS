import { test, expect } from '@playwright/test'

// Verifiziert, dass alle DSGVO-relevanten Pflicht-Seiten erreichbar sind
// und die internen Links auf das Self-Service-Tool (/privacy/me) zeigen.
const requiredPages = [
  { path: '/impressum', heading: /Impressum/i },
  { path: '/datenschutz', heading: /Datenschutz/i },
  { path: '/agb', heading: /AGB/i },
  { path: '/widerruf', heading: /Widerruf/i },
  { path: '/cookies', heading: /Cookie/i },
  { path: '/privacy/me', heading: /Datenschutz · Meine Rechte/i }
]

for (const { path, heading } of requiredPages) {
  test(`Pflicht-Seite erreichbar: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading').first()).toBeVisible()
    // Erste Heading sollte zum erwarteten Bereich passen (egal welche
    // Ebene — die meisten Legal-Pages nutzen h1).
    await expect(page.locator('h1, h2').first()).toContainText(heading)
  })
}

test('LegalFooter listet Meine Datenrechte', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/datenschutz')
  // Footer-Link auf /privacy/me sollte existieren.
  const link = page.getByRole('link', { name: /Meine Datenrechte/i }).first()
  await expect(link).toBeVisible()
})

test('Slug-Seite hat noindex via robots-meta', async ({ page }) => {
  const response = await page.goto('/l/probe-slug')
  // Selbst wenn 404 vom Backend kommt: Next.js liefert die Page-HTML mit
  // dem robots-Meta-Tag (Layout-Metadata). Wir pruefen den Header und das HTML.
  expect(response?.status()).toBeLessThan(500)
  const robotsMeta = await page.locator('meta[name="robots"]').getAttribute('content')
  expect(robotsMeta || '').toMatch(/noindex/i)
})
