
import { test, expect } from '@playwright/test'

test('production health endpoint returns API ready status', async ({ request }) => {
  const base = process.env.API_BASE
  test.skip(!base, 'API_BASE not set')
  const res = await request.get(`${base}/api/hardening/health`)
  expect(res.ok()).toBeTruthy()
  const json = await res.json()
  expect(json.ok).toBeTruthy()
})
