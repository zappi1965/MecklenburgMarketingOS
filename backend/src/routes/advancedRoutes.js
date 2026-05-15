
const express = require('express')

function advancedRoutes({ exportService, emailService, workflowRuleEngine }) {
  const router = express.Router()

  router.get('/export/:table', async (req, res, next) => {
    try {
      const csv = await exportService.exportTable(req.params.table, req.query.customer_id || null)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.table}.csv"`)
      res.send(csv)
    } catch (e) { next(e) }
  })

  router.post('/email/send', async (req, res, next) => {
    try {
      const data = await emailService.send(req.body)
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })

  router.post('/workflow/evaluate', async (req, res, next) => {
    try {
      const data = await workflowRuleEngine.evaluate(req.body)
      res.json({ ok: true, data })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = advancedRoutes
