import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { outputFolder: 'playwright-report' }], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } }
  ],
  // Lokal / CI-Smoke starten selbst `next start`. Wird eine externe E2E_BASE_URL
  // gesetzt (z.B. Staging im Tenant-Isolation-Workflow), laufen die Tests dagegen
  // und es wird kein lokaler Server gestartet.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'yarn start',
        url: 'http://127.0.0.1:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
})
