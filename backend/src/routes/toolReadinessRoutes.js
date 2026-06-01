const express = require('express')
const { toolReadinessOverview, toolReadinessMarkdown } = require('../services/toolReadinessService')

function toolReadinessRoutes() {
  const router = express.Router()

  router.get('/overview', async (_req, res, next) => {
    try { res.json(toolReadinessOverview()) } catch (e) { next(e) }
  })

  router.get('/export.md', async (_req, res, next) => {
    try {
      res.setHeader('content-type', 'text/markdown; charset=utf-8')
      res.setHeader('content-disposition', 'attachment; filename="mmos-tool-produktionsreife.md"')
      res.send(toolReadinessMarkdown())
    } catch (e) { next(e) }
  })

  return router
}

module.exports = toolReadinessRoutes
