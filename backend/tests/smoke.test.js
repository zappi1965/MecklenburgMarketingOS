
// Minimal smoke checks for CI/manual use.
// Run with: node tests/smoke.test.js after backend starts.

const base = process.env.API_BASE || 'http://localhost:4000'

async function main() {
  const health = await fetch(`${base}/api/system/health`).then(r => r.json())
  if (!health.ok) throw new Error('Health failed')

  console.log('Backend smoke test OK')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
