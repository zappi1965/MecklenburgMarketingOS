import { test, expect } from '@playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD
const customerEmail = process.env.E2E_CUSTOMER_EMAIL
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD

async function login(page: any, email?: string, password?: string) {
  test.skip(!email || !password, 'E2E credentials missing')
  await page.goto('/auth')
  await page.getByPlaceholder(/E-Mail/i).fill(email!)
  await page.getByPlaceholder(/Passwort/i).fill(password!)
  await page.getByRole('button', { name: /Einloggen/i }).click()
}

test('customer cannot open production admin page', async ({ page }) => {
  await login(page, customerEmail, customerPassword)
  await page.goto('/admin/production')
  await expect(page.getByText(/Adminbereich geschützt|Kein Zugriff|Nur Admin/i)).toBeVisible({ timeout: 10000 })
})

test('admin can open security core health', async ({ page }) => {
  await login(page, adminEmail, adminPassword)
  await page.goto('/admin/production')
  await expect(page.getByText(/Production|Systemstatus|Admin/i)).toBeVisible({ timeout: 10000 })
})

test('anonymous user cannot open customer reports', async ({ page }) => {
  await page.goto('/portal/reports')
  await expect(page.getByText(/Anmeldung erforderlich|Login|Zur Anmeldung/i)).toBeVisible({ timeout: 10000 })
})
