
import { test, expect } from '@playwright/test'

test('landing page loads', async ({ page }) => {
  await page.goto(process.env.E2E_BASE_URL || 'http://localhost:3000')
  await expect(page.getByText('MecklenburgMarketingOS')).toBeVisible()
})

test('admin demo opens', async ({ page }) => {
  await page.goto(process.env.E2E_BASE_URL || 'http://localhost:3000')
  await page.getByText('Admin Login').click()
  await expect(page.getByText('Dashboard')).toBeVisible()
})

test('customer demo opens', async ({ page }) => {
  await page.goto(process.env.E2E_BASE_URL || 'http://localhost:3000')
  await page.getByText('Kunden Login').click()
  await expect(page.getByText('Kundenportal')).toBeVisible()
})
