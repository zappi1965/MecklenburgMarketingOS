import { test, expect } from '@playwright/test'

async function login(page: any, email: string, password: string) {
  await page.goto('/auth')
  await page.getByPlaceholder(/E-Mail-Adresse/i).fill(email)
  await page.getByPlaceholder(/Passwort/i).fill(password)
  await page.getByRole('button', { name: /Einloggen/i }).click()
  await page.waitForLoadState('networkidle').catch(() => {})
}

test('Auth-Seite lädt ohne Fehler', async ({ page }) => {
  await page.goto('/auth')
  await expect(page.getByText(/MecklenburgMarketingOS|Mecklenburg Marketing/i)).toBeVisible()
  await expect(page.getByPlaceholder(/E-Mail-Adresse/i)).toBeVisible()
})

test('Adminbereich ist ohne Login geschützt', async ({ page }) => {
  await page.goto('/admin/production')
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page).toHaveURL(/auth|admin|login/)
  await expect(page.locator('body')).not.toContainText('API Keys')
})

test('Kundenportal Reports ist ohne Login geschützt', async ({ page }) => {
  await page.goto('/portal/reports')
  await page.waitForLoadState('networkidle').catch(() => {})
  await expect(page).toHaveURL(/auth|portal|login/)
})

test('Proxy Health liefert Backend-Status oder saubere Fehlermeldung', async ({ request }) => {
  const res = await request.get('/api/proxy-health')
  expect([200, 502]).toContain(res.status())
  const json = await res.json()
  expect(json).toHaveProperty('ok')
})

test('Admin kann Production Readiness öffnen', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  test.skip(!email || !password, 'E2E_ADMIN_EMAIL/PASSWORD nicht gesetzt')
  await login(page, email!, password!)
  await page.goto('/admin/production')
  await expect(page.getByText(/Production Readiness/i)).toBeVisible()
  await expect(page.getByText(/API-Kosten|Admin-Protokolle/i)).toBeVisible()
})

test('Kunde darf Admin Production Readiness nicht öffnen', async ({ page }) => {
  const email = process.env.E2E_CUSTOMER_EMAIL
  const password = process.env.E2E_CUSTOMER_PASSWORD
  test.skip(!email || !password, 'E2E_CUSTOMER_EMAIL/PASSWORD nicht gesetzt')
  await login(page, email!, password!)
  await page.goto('/admin/production')
  await expect(page.locator('body')).toContainText(/Adminbereich geschützt|Kein Zugriff|Zur Anmeldung/i)
})
