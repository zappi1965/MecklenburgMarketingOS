import { test, expect } from '@playwright/test'

// Smoke-Test fuer die Admin-Workflow-Seite. Ohne echte Supabase-Session
// muss die Seite die "Admin-Zugriff erforderlich"-Notice rendern,
// nicht crashen.

test('/admin/automations rendert ohne Crash und zeigt Auth-Hinweis', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/admin/automations')

  // Page-Heading muss erscheinen.
  await expect(page.getByRole('heading', { name: /Workflows/i }).first()).toBeVisible()

  // Ohne Login wird die Notice angezeigt.
  await expect(page.getByText(/Admin-Zugriff erforderlich/i)).toBeVisible({ timeout: 10_000 })
})
