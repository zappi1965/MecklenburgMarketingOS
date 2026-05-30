import { test, expect } from '@playwright/test'

test('admin all-tools knowledge quiz page renders', async ({ page }) => {
  await page.goto('/admin/training')
  await expect(page.getByRole('heading', { name: /MMOS All-Tools Wissenstest/i })).toBeVisible()
  await expect(page.getByText(/CRM, Pipeline/i)).toBeVisible()
  await expect(page.getByText(/Finanzen & Abrechnung/i)).toBeVisible()
})
