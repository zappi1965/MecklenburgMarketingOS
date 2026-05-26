import { test, expect } from '@playwright/test'

// Verifiziert das Consent-Banner-Verhalten (Phase 3):
//   - Banner erscheint beim ersten Besuch
//   - "Nur essenziell" speichert die Wahl und schliesst das Banner
//   - Nach dem Reload erscheint das Banner nicht erneut

test('Consent-Banner: erscheint beim ersten Besuch und merkt sich die Wahl', async ({ page, context }) => {
  // Sauberer Storage-State.
  await context.clearCookies()

  await page.goto('/')

  const banner = page.getByRole('dialog', { name: /Cookie- und Datenschutz-Einstellungen/i })
  await expect(banner).toBeVisible()

  await page.getByRole('button', { name: 'Nur essenziell' }).click()
  await expect(banner).toBeHidden()

  // Reload — Banner darf nicht wiederkommen.
  await page.reload()
  await expect(page.getByRole('dialog', { name: /Cookie/i })).toHaveCount(0)
})

test('Consent-Banner: alle akzeptieren schliesst das Banner', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/')
  const banner = page.getByRole('dialog', { name: /Cookie/i })
  await expect(banner).toBeVisible()
  await page.getByRole('button', { name: 'Alle akzeptieren' }).click()
  await expect(banner).toBeHidden()
})
