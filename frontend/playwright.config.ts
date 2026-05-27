import { defineConfig, devices } from '@playwright/test'

// Playwright-Konfiguration fuer die Smoke-Suite.
// Startet einen Next.js-Dev-Server vor den Tests und beendet ihn danach.
// Dummy-ENV reicht aus: die getesteten Seiten (Landing, Slug-Public,
// /privacy/me ohne Login) brauchen keine echte Supabase-Verbindung.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3010',
    headless: true,
    actionTimeout: 7_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'de-DE'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-iphone', use: { ...devices['iPhone 13'] } }
  ],
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: 'yarn dev --port 3010',
        port: 3010,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: 'https://invalid.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon-key',
          NEXT_PUBLIC_API_BASE: 'http://localhost:4000'
        }
      }
})
