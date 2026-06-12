// Minimaler, chainbarer In-Memory-Supabase-Stub für Service-Integrationstests.
// Unterstützt die in den Marketing-Services genutzten Operationen.

let idCounter = 1

function matchFilters(row, filters) {
  return filters.every((f) => {
    if (f.type === 'eq') return row[f.col] === f.val
    if (f.type === 'is') return (row[f.col] ?? null) === f.val
    if (f.type === 'in') return f.val.includes(row[f.col])
    if (f.type === 'contains') {
      const cell = row[f.col] || {}
      return Object.entries(f.val).every(([k, v]) => cell[k] === v)
    }
    return true
  })
}

function createStub(initial = {}) {
  const db = {}
  for (const [k, v] of Object.entries(initial)) db[k] = v.map((r) => ({ ...r }))

  function from(table) {
    db[table] = db[table] || []
    const q = {
      _op: 'select',
      _filters: [],
      _payload: null,
      _limit: null,
      _single: false,
      select() { return this },
      eq(col, val) { this._filters.push({ type: 'eq', col, val }); return this },
      is(col, val) { this._filters.push({ type: 'is', col, val }); return this },
      in(col, val) { this._filters.push({ type: 'in', col, val }); return this },
      contains(col, val) { this._filters.push({ type: 'contains', col, val }); return this },
      order() { return this },
      limit(n) { this._limit = n; return this },
      insert(payload) { this._op = 'insert'; this._payload = payload; return this },
      update(payload) { this._op = 'update'; this._payload = payload; return this },
      upsert(payload) { this._op = 'upsert'; this._payload = payload; return this },
      delete() { this._op = 'delete'; return this },
      maybeSingle() { this._single = true; return this._run() },
      single() { this._single = true; return this._run() },
      then(resolve, reject) { return this._run().then(resolve, reject) },
      _run() {
        try {
          const rows = db[table]
          if (this._op === 'insert') {
            const items = Array.isArray(this._payload) ? this._payload : [this._payload]
            const inserted = items.map((it) => ({ id: `id_${idCounter++}`, ...it }))
            db[table].push(...inserted)
            const data = this._single ? inserted[0] : inserted
            return Promise.resolve({ data, error: null })
          }
          if (this._op === 'update') {
            const targets = rows.filter((r) => matchFilters(r, this._filters))
            targets.forEach((r) => Object.assign(r, this._payload))
            const data = this._single ? (targets[0] || null) : targets
            return Promise.resolve({ data, error: null })
          }
          if (this._op === 'upsert') {
            const items = Array.isArray(this._payload) ? this._payload : [this._payload]
            const inserted = items.map((it) => ({ id: `id_${idCounter++}`, ...it }))
            db[table].push(...inserted)
            return Promise.resolve({ data: this._single ? inserted[0] : inserted, error: null })
          }
          if (this._op === 'delete') {
            db[table] = rows.filter((r) => !matchFilters(r, this._filters))
            return Promise.resolve({ data: null, error: null })
          }
          // select
          let result = rows.filter((r) => matchFilters(r, this._filters))
          if (this._limit != null) result = result.slice(0, this._limit)
          const data = this._single ? (result[0] || null) : result
          return Promise.resolve({ data, error: null })
        } catch (error) {
          return Promise.resolve({ data: null, error })
        }
      }
    }
    return q
  }

  return { from, _db: db }
}

module.exports = { createStub }
