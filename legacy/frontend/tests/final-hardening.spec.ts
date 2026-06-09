import { test, expect } from '@playwright/test'

test('final hardening page is routable', async ({ page }) => {
  await page.goto('/admin/production/final-hardening')
  await expect(page.locator('body')).toContainText(/Final Production Hardening|Login|auth|Nicht authentifiziert/i)
})

test('customer readiness page is routable', async ({ page }) => {
  await page.goto('/admin/production/customer-readiness')
  await expect(page.locator('body')).toContainText(/Customer Readiness|Login|auth|Nicht authentifiziert/i)
})
