
const express = require('express')
const { RevenueDynamicBillingService } = require('../services/revenueDynamicBillingService')

function revenueDynamicBillingRoutes(supabase) {
  const router = express.Router()
  const service = new RevenueDynamicBillingService(supabase)

  router.post('/forecast/:customer_id', async (req,res,next)=>{
    try { res.json({ ok:true, forecast: await service.createForecast({ customer_id:req.params.customer_id, ...(req.body || {}) }) }) } catch(e){ next(e) }
  })

  router.get('/forecasts/:customer_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('revenue_forecasts').select('*').eq('customer_id', req.params.customer_id).order('period_start',{ascending:false}).limit(24)
      if (error) throw error
      res.json({ ok:true, forecasts:data || [] })
    } catch(e){ next(e) }
  })

  router.post('/usage/:customer_id', async (req,res,next)=>{
    try { res.json({ ok:true, usage: await service.calculateUsage({ customer_id:req.params.customer_id, ...(req.body || {}) }) }) } catch(e){ next(e) }
  })

  router.get('/usage/:customer_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('dynamic_billing_usage').select('*').eq('customer_id', req.params.customer_id).order('period_start',{ascending:false}).limit(24)
      if (error) throw error
      res.json({ ok:true, usage:data || [] })
    } catch(e){ next(e) }
  })

  router.post('/recommend-package/:customer_id', async (req,res,next)=>{
    try { res.json({ ok:true, recommendation: await service.recommendPackage(req.params.customer_id) }) } catch(e){ next(e) }
  })

  router.get('/recommendations/:customer_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('package_recommendations').select('*').eq('customer_id', req.params.customer_id).order('created_at',{ascending:false}).limit(50)
      if (error) throw error
      res.json({ ok:true, recommendations:data || [] })
    } catch(e){ next(e) }
  })

  router.post('/revenue-share/rules', async (req,res,next)=>{
    try { res.json({ ok:true, rule: await service.createShareRule(req.body || {}) }) } catch(e){ next(e) }
  })

  router.get('/revenue-share/rules', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('revenue_share_rules').select('*').order('created_at',{ascending:false})
      if (error) throw error
      res.json({ ok:true, rules:data || [] })
    } catch(e){ next(e) }
  })

  router.post('/revenue-share/calculate/:customer_id', async (req,res,next)=>{
    try { res.json({ ok:true, event: await service.calculateRevenueShare({ customer_id:req.params.customer_id, ...(req.body || {}) }) }) } catch(e){ next(e) }
  })

  router.get('/revenue-share/events/:customer_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('revenue_share_events').select('*').eq('customer_id', req.params.customer_id).order('created_at',{ascending:false}).limit(100)
      if (error) throw error
      res.json({ ok:true, events:data || [] })
    } catch(e){ next(e) }
  })

  return router
}

module.exports = revenueDynamicBillingRoutes
