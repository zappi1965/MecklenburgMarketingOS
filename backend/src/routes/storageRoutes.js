
const express = require('express')
const multer = require('multer')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
})

function storageRoutes(storageService) {
  const router = express.Router()

  router.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
      const data = await storageService.upload({
        customer_id: req.body.customer_id,
        file_type: req.body.file_type || 'documents',
        ref_table: req.body.ref_table || null,
        ref_id: req.body.ref_id || null,
        file: req.file
      })

      res.json({ ok: true, data })
    } catch (error) {
      next(error)
    }
  })

  router.get('/customer/:customer_id', async (req, res, next) => {
    try {
      const data = await storageService.list(req.params.customer_id)
      res.json({ ok: true, data })
    } catch (error) {
      next(error)
    }
  })

  router.get('/versions/:file_id', async (req, res, next) => {
    try {
      const data = await storageService.versions(req.params.file_id)
      res.json({ ok: true, data })
    } catch (error) {
      next(error)
    }
  })

  router.post('/signed-url', async (req, res, next) => {
    try {
      const data = await storageService.signedUrl(req.body)
      res.json({ ok: true, data })
    } catch (error) {
      next(error)
    }
  })

  return router
}

module.exports = storageRoutes
