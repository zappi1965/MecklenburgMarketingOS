// Unit-Tests fuer den PII-Redactor.
// Run: node --test tests/redact.test.js

const test = require('node:test')
const assert = require('node:assert/strict')
const { redact, SENSITIVE_KEYS } = require('../src/utils/redact')

test('redact: primitives passieren unveraendert', () => {
  assert.equal(redact(null), null)
  assert.equal(redact(undefined), undefined)
  assert.equal(redact('plain'), 'plain')
  assert.equal(redact(42), 42)
  assert.equal(redact(true), true)
})

test('redact: maskiert top-level password / token / secret', () => {
  const input = { email: 'a@b.de', password: 'hunter2', token: 'jwt.abc' }
  const out = redact(input)
  assert.equal(out.email, 'a@b.de')
  assert.equal(out.password, '[REDACTED]')
  assert.equal(out.token, '[REDACTED]')
})

test('redact: case-insensitive Key-Matching', () => {
  const out = redact({ Password: 'x', AUTHORIZATION: 'Bearer y', Api_Key: 'z' })
  assert.equal(out.Password, '[REDACTED]')
  assert.equal(out.AUTHORIZATION, '[REDACTED]')
  assert.equal(out.Api_Key, '[REDACTED]')
})

test('redact: rekursiv in verschachtelten Objekten', () => {
  const out = redact({
    user: { email: 'a@b.de', password: 'secret' },
    meta: { headers: { authorization: 'Bearer xx', accept: 'json' } }
  })
  assert.equal(out.user.email, 'a@b.de')
  assert.equal(out.user.password, '[REDACTED]')
  assert.equal(out.meta.headers.authorization, '[REDACTED]')
  assert.equal(out.meta.headers.accept, 'json')
})

test('redact: maskiert in Arrays', () => {
  const out = redact([{ password: 'a' }, { staff_code: 'b' }])
  assert.equal(out[0].password, '[REDACTED]')
  assert.equal(out[1].staff_code, '[REDACTED]')
})

test('redact: stoppt bei Tiefenlimit, kein Stack-Overflow', () => {
  const deep = { a: {} }
  let cur = deep.a
  for (let i = 0; i < 50; i++) {
    cur.next = { secret: 'x' }
    cur = cur.next
  }
  const out = redact(deep)
  assert.ok(out, 'rekursive Redaction sollte einen Wert liefern')
})

test('redact: SENSITIVE_KEYS enthaelt die kritischen Felder', () => {
  for (const k of ['password', 'token', 'secret', 'authorization', 'cookie', 'staff_code', 'api_key']) {
    assert.ok(SENSITIVE_KEYS.has(k), `${k} fehlt in SENSITIVE_KEYS`)
  }
})

test('redact: ausgangsobjekt wird nicht mutiert', () => {
  const input = { password: 'hunter2', other: 1 }
  const out = redact(input)
  assert.equal(input.password, 'hunter2')
  assert.notEqual(out, input)
})
