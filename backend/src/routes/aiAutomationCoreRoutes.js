
const express = require('express')
const { AiAutomationCoreService } = require('../services/aiAutomationCoreService')

function aiAutomationCoreRoutes(supabase) {
  const router = express.Router()
  const service = new AiAutomationCoreService(supabase)

  router.post('/health/:customer_id/calculate', async (req,res,next)=>{ try { res.json({ ok:true, health: await service.calculateHealth(req.params.customer_id) }) } catch(e){ next(e) } })
  router.get('/health/:customer_id', async (req,res,next)=>{ try { const {data,error}=await supabase.from('customer_health_snapshots').select('*').eq('customer_id',req.params.customer_id).maybeSingle(); if(error) throw error; res.json({ok:true,health:data}) } catch(e){ next(e) } })

  router.post('/assistant/:customer_id/generate', async (req,res,next)=>{ try { res.json({ ok:true, messages: await service.generateAssistant(req.params.customer_id) }) } catch(e){ next(e) } })
  router.get('/assistant/:customer_id', async (req,res,next)=>{ try { const {data,error}=await supabase.from('ai_business_assistant_messages').select('*').eq('customer_id',req.params.customer_id).order('created_at',{ascending:false}).limit(100); if(error) throw error; res.json({ok:true,messages:data||[]}) } catch(e){ next(e) } })
  router.patch('/assistant/messages/:id', async (req,res,next)=>{ try { const body=req.body||{}; const {data,error}=await supabase.from('ai_business_assistant_messages').update({status:body.status||'resolved',resolved_at:body.status==='resolved'?new Date().toISOString():null}).eq('id',req.params.id).select('*').single(); if(error) throw error; res.json({ok:true,message:data}) } catch(e){ next(e) } })

  router.post('/automations/run/:customer_id', async (req,res,next)=>{ try { res.json({ ok:true, runs: await service.runAutomations({ customer_id:req.params.customer_id, trigger_key:req.body?.trigger_key || null }) }) } catch(e){ next(e) } })
  router.get('/automations/rules', async (req,res,next)=>{ try { const {data,error}=await supabase.from('smart_automation_rules').select('*').order('created_at',{ascending:false}); if(error) throw error; res.json({ok:true,rules:data||[]}) } catch(e){ next(e) } })
  router.post('/automations/rules', async (req,res,next)=>{ try { const {data,error}=await supabase.from('smart_automation_rules').insert(req.body||{}).select('*').single(); if(error) throw error; res.json({ok:true,rule:data}) } catch(e){ next(e) } })
  router.patch('/automations/rules/:id', async (req,res,next)=>{ try { const {data,error}=await supabase.from('smart_automation_rules').update({...req.body,updated_at:new Date().toISOString()}).eq('id',req.params.id).select('*').single(); if(error) throw error; res.json({ok:true,rule:data}) } catch(e){ next(e) } })
  router.get('/automations/runs/:customer_id', async (req,res,next)=>{ try { const {data,error}=await supabase.from('smart_automation_runs').select('*').eq('customer_id',req.params.customer_id).order('created_at',{ascending:false}).limit(100); if(error) throw error; res.json({ok:true,runs:data||[]}) } catch(e){ next(e) } })

  router.post('/marketing/campaigns', async (req,res,next)=>{ try { res.json({ ok:true, campaign: await service.createMarketingCampaign(req.body||{}) }) } catch(e){ next(e) } })
  router.get('/marketing/campaigns/:customer_id', async (req,res,next)=>{ try { const {data,error}=await supabase.from('marketing_automation_campaigns').select('*').eq('customer_id',req.params.customer_id).order('created_at',{ascending:false}); if(error) throw error; res.json({ok:true,campaigns:data||[]}) } catch(e){ next(e) } })
  router.patch('/marketing/campaigns/:id', async (req,res,next)=>{ try { const {data,error}=await supabase.from('marketing_automation_campaigns').update({...req.body,updated_at:new Date().toISOString()}).eq('id',req.params.id).select('*').single(); if(error) throw error; res.json({ok:true,campaign:data}) } catch(e){ next(e) } })

  return router
}
module.exports = aiAutomationCoreRoutes
