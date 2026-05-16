
const express = require('express')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
function safeName(name='avatar'){return String(name).replace(/[^\w.\-]/g,'_').slice(0,120)}
function avatarRoutes(supabaseAdmin) {
  const router = express.Router()
  router.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
      const displayName = req.body.display_name
      if (!displayName) throw new Error('display_name fehlt')
      if (!req.file) throw new Error('Datei fehlt')
      const storagePath = `${displayName}/${Date.now()}_${safeName(req.file.originalname || 'avatar.png')}`
      const { error: uploadError } = await supabaseAdmin.storage.from('avatars').upload(storagePath, req.file.buffer, { contentType: req.file.mimetype || 'image/png', upsert: true })
      if (uploadError) throw uploadError
      const { data: pub } = supabaseAdmin.storage.from('avatars').getPublicUrl(storagePath)
      const avatarUrl = pub.publicUrl
      await supabaseAdmin.from('admin_profiles').update({ avatar_url: avatarUrl }).eq('display_name', displayName).catch(()=>null)
      res.json({ ok: true, data: { display_name: displayName, avatar_url: avatarUrl, storage_path: storagePath } })
    } catch (e) { next(e) }
  })
  router.get('/profiles', async (_, res, next) => {
    try { const { data, error } = await supabaseAdmin.from('admin_profiles').select('*').order('display_name'); if (error) throw error; res.json({ ok: true, data: data || [] }) } catch (e) { next(e) }
  })
  return router
}
module.exports = avatarRoutes
