
const express = require('express')
const { AdvancedLoyaltyService } = require('../services/advancedLoyaltyService')

function advancedLoyaltyRoutes(supabase) {
  const router = express.Router()
  const service = new AdvancedLoyaltyService(supabase)

  router.post('/program/:program_id/defaults', async (req,res,next)=>{
    try {
      const { data:program, error } = await supabase.from('loyalty_programs').select('*').eq('id', req.params.program_id).single()
      if (error) throw error
      res.json({ ok:true, result: await service.ensureDefaults({ customer_id: program.customer_id, loyalty_program_id: program.id }) })
    } catch(e){ next(e) }
  })

  router.post('/program/:program_id/rebuild', async (req,res,next)=>{
    try { res.json({ ok:true, result: await service.rebuildStats(req.params.program_id) }) } catch(e){ next(e) }
  })

  router.get('/program/:program_id/overview', async (req,res,next)=>{
    try { res.json({ ok:true, overview: await service.getProgramContext(req.params.program_id) }) } catch(e){ next(e) }
  })

  router.get('/segments/:program_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_segments').select('*').eq('loyalty_program_id', req.params.program_id).order('created_at',{ascending:true})
      if (error) throw error
      res.json({ ok:true, segments:data || [] })
    } catch(e){ next(e) }
  })

  router.post('/segments', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_segments').insert(req.body || {}).select('*').single()
      if (error) throw error
      res.json({ ok:true, segment:data })
    } catch(e){ next(e) }
  })

  router.patch('/segments/:id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_segments').update({ ...req.body, updated_at:new Date().toISOString() }).eq('id', req.params.id).select('*').single()
      if (error) throw error
      res.json({ ok:true, segment:data })
    } catch(e){ next(e) }
  })

  router.get('/tiers/:program_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_tiers').select('*').eq('loyalty_program_id', req.params.program_id).order('sort_order',{ascending:true})
      if (error) throw error
      res.json({ ok:true, tiers:data || [] })
    } catch(e){ next(e) }
  })

  router.post('/tiers', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_tiers').insert(req.body || {}).select('*').single()
      if (error) throw error
      res.json({ ok:true, tier:data })
    } catch(e){ next(e) }
  })

  router.patch('/tiers/:id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_tiers').update(req.body || {}).eq('id', req.params.id).select('*').single()
      if (error) throw error
      res.json({ ok:true, tier:data })
    } catch(e){ next(e) }
  })

  router.get('/point-rules/:program_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_point_rules').select('*').eq('loyalty_program_id', req.params.program_id).order('priority',{ascending:true})
      if (error) throw error
      res.json({ ok:true, rules:data || [] })
    } catch(e){ next(e) }
  })

  router.post('/point-rules', async (req,res,next)=>{
    try { res.json({ ok:true, rule: await service.createPointRule(req.body || {}) }) } catch(e){ next(e) }
  })

  router.post('/calculate-points', async (req,res,next)=>{
    try { res.json({ ok:true, result: await service.calculatePoints(req.body || {}) }) } catch(e){ next(e) }
  })

  router.get('/smart-actions/:program_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_smart_actions').select('*').eq('loyalty_program_id', req.params.program_id).order('created_at',{ascending:false})
      if (error) throw error
      res.json({ ok:true, actions:data || [] })
    } catch(e){ next(e) }
  })

  router.post('/smart-actions', async (req,res,next)=>{
    try { res.json({ ok:true, action: await service.createSmartAction(req.body || {}) }) } catch(e){ next(e) }
  })

  router.post('/segments/:segment_id/create-marketing-campaign', async (req,res,next)=>{
    try {
      res.json({ ok:true, campaign: await service.createMarketingFromSegment({
        loyalty_program_id: req.body.loyalty_program_id,
        segment_id: req.params.segment_id,
        campaign_type: req.body.campaign_type || 'reactivation',
        reward_id: req.body.reward_id || null
      }) })
    } catch(e){ next(e) }
  })

  return router
}
module.exports = advancedLoyaltyRoutes
