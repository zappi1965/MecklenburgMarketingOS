import { test, expect } from '@playwright/test'

// Hermetischer CI-Smoke: läuft pro Pull Request gegen den frisch gebauten
// `next start` OHNE Backend und OHNE Login. Verifiziert nur, dass der Build
// ausliefert und die clientseitigen Auth-Guards greifen. Reiche Auth-/
// Tenant-Flows laufen im Staging-Workflow (e2e-tenant-isolation.yml).

test('Startseite liefert gerenderten Inhalt (kein 5xx)', async ({ page }) => {
  const res = await page.goto('/')
  expect(res, 'keine Navigations-Response').toBeTruthy()
  expect(res!.status()).toBeLessThan(400)
  await expect(page.locator('body')).not.toBeEmpty()
})

test('Anonym: Kundenportal-Reports ist geschützt', async ({ page }) => {
  await page.goto('/portal/reports')
  await expect(
    page.getByRole('heading', { name: /Anmeldung erforderlich/i })
  ).toBeVisible({ timeout: 10000 })
})

test('Anonym: Admin-Production zeigt keine sensiblen Inhalte', async ({ page }) => {
  await page.goto('/admin/production')
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page).toHaveURL(/auth|admin|login/)
  await expect(page.locator('body')).not.toContainText('API Keys')
})

test('Öffentliche Deal-Seite rendert ohne 5xx (unbekannter Slug)', async ({ page }) => {
  const res = await page.goto('/deal/ci-smoke-unknown')
  expect(res!.status()).toBeLessThan(500)
  await expect(page.locator('body')).not.toBeEmpty()
})

test('Öffentliche Mini-Website rendert ohne 5xx (unbekannter Slug)', async ({ page }) => {
  const res = await page.goto('/site/ci-smoke-unknown')
  expect(res!.status()).toBeLessThan(500)
  await expect(page.locator('body')).not.toBeEmpty()
})
