const express = require('express')
const svc = require('../services/storeService')

function storeRoutes() {
  const router = express.Router()

  // Liste der erlaubten Tabellen + Scope-Info — fuer Frontend-Tools, die
  // wissen wollen, was schreibbar ist.
  router.get('/_meta', (req, res) => {
    res.json({ ok: true, tables: svc.ALLOWLIST, count: svc.TABLES.length })
  })

  router.get('/:table', async (req, res, next) => {
    try {
      const data = await svc.listRows({
        table: req.params.table,
        query: req.query || {},
        user: req.user,
        userRole: req.userRole
      })
      res.json({ ok: true, data, count: data.length })
    } catch (e) {
      if (e.status && e.status < 500) return res.status(e.status).json({ ok: false, code: e.code, error: e.message })
      next(e)
    }
  })

  router.get('/:table/:id', async (req, res, next) => {
    try {
      const data = await svc.getRow({ table: req.params.table, id: req.params.id, user: req.user, userRole: req.userRole })
      res.json({ ok: true, data })
    } catch (e) {
      if (e.status && e.status < 500) return res.status(e.status).json({ ok: false, code: e.code, error: e.message })
      next(e)
    }
  })

  router.post('/:table', async (req, res, next) => {
    try {
      const data = await svc.createRow({ table: req.params.table, row: req.body || {}, user: req.user, userRole: req.userRole })
      res.json({ ok: true, data })
    } catch (e) {
      if (e.status && e.status < 500) return res.status(e.status).json({ ok: false, code: e.code, error: e.message })
      next(e)
    }
  })

  router.patch('/:table/:id', async (req, res, next) => {
    try {
      const data = await svc.updateRow({ table: req.params.table, id: req.params.id, row: req.body || {}, user: req.user, userRole: req.userRole })
      res.json({ ok: true, data })
    } catch (e) {
      if (e.status && e.status < 500) return res.status(e.status).json({ ok: false, code: e.code, error: e.message })
      next(e)
    }
  })

  router.delete('/:table/:id', async (req, res, next) => {
    try {
      const data = await svc.deleteRow({ table: req.params.table, id: req.params.id, user: req.user, userRole: req.userRole })
      res.json({ ok: true, ...data })
    } catch (e) {
      if (e.status && e.status < 500) return res.status(e.status).json({ ok: false, code: e.code, error: e.message })
      next(e)
    }
  })

  return router
}

module.exports = storeRoutes
