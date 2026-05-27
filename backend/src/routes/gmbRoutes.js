const express = require('express')
const requireCustomerAccess = require('../middleware/requireCustomerAccess')
const gmb = require('../services/gmbService')

function gmbRoutes() {
  const router = express.Router()

  router.get('/posts/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const r = await gmb.listForCustomer({ customer_id: req.params.customer_id, status: req.query?.status })
      res.json({ ok: true, posts: r })
    } catch (e) { next(e) }
  })

  router.post('/posts/:customer_id', requireCustomerAccess(), async (req, res, next) => {
    try {
      const r = await gmb.createPost({
        customer_id: req.params.customer_id,
        post_type: req.body?.post_type,
        summary: req.body?.summary,
        cta_label: req.body?.cta_label,
        cta_url: req.body?.cta_url,
        image_url: req.body?.image_url,
        start_time: req.body?.start_time,
        end_time: req.body?.end_time,
        scheduled_at: req.body?.scheduled_at,
        created_by: req.user?.id
      })
      res.json({ ok: true, post: r })
    } catch (e) { next(e) }
  })

  router.post('/posts/:customer_id/:id/publish', requireCustomerAccess(), async (req, res, next) => {
    try {
      const r = await gmb.publishPost({ id: req.params.id })
      res.json({ ok: true, post: r })
    } catch (e) { next(e) }
  })

  router.delete('/posts/:customer_id/:id', requireCustomerAccess(), async (req, res, next) => {
    try {
      await gmb.deletePost({ id: req.params.id })
      res.json({ ok: true })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = gmbRoutes
