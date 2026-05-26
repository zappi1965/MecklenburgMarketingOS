const test = require('node:test')
const assert = require('node:assert/strict')
const { _escapeHtml, _clampInt, renderHtml } = require('../src/services/reviewWidgetService')

test('escapeHtml: maskiert &, <, >, "', () => {
  assert.equal(_escapeHtml('a & b < c > d "e"'), 'a &amp; b &lt; c &gt; d &quot;e&quot;')
})

test('clampInt: Wert im Bereich bleibt', () => {
  assert.equal(_clampInt(5, 1, 10, 0), 5)
})

test('clampInt: zu klein -> min, zu gross -> max', () => {
  assert.equal(_clampInt(0, 1, 10, 5), 1)
  assert.equal(_clampInt(99, 1, 10, 5), 10)
})

test('clampInt: NaN -> fallback', () => {
  assert.equal(_clampInt('abc', 1, 10, 7), 7)
})

test('renderHtml: leere Liste -> "Noch keine Bewertungen"', () => {
  const html = renderHtml({ widget: { theme: {} }, reviews: [] })
  assert.match(html, /Noch keine Bewertungen/)
})

test('renderHtml: rendert Sterne und Text', () => {
  const html = renderHtml({
    widget: { theme: { primary: '#d4af37' } },
    reviews: [{ rating: 4, feedback_text: 'War super!', reviewer_name: 'Anna', created_at: '2026-05-26' }]
  })
  assert.match(html, /★★★★☆/)
  assert.match(html, /War super!/)
  assert.match(html, /Anna/)
})

test('renderHtml: HTML wird XSS-sicher escaped', () => {
  const html = renderHtml({
    widget: { theme: {} },
    reviews: [{ rating: 5, feedback_text: '<script>alert(1)</script>', reviewer_name: '"hacker"', created_at: '2026-05-26' }]
  })
  assert.ok(!html.includes('<script>alert'), 'kein rohes script-Tag')
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /&quot;hacker&quot;/)
})

test('renderHtml: noindex-meta gesetzt', () => {
  const html = renderHtml({ widget: { theme: {} }, reviews: [] })
  assert.match(html, /<meta name="robots" content="noindex">/)
})
