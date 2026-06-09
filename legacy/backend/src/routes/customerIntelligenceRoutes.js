
const express = require('express')
const { CustomerIntelligenceService, monthRange } = require('../services/customerIntelligenceService')

function customerIntelligenceRoutes(supabase) {
  const router = express.Router()
  const service = new CustomerIntelligenceService(supabase)

  router.post('/event', async (req,res,next)=>{ try { res.json({ ok:true, event: await service.event(req.body || {}) }) } catch(e){ next(e) } })
  router.get('/timeline/:customer_id', async (req,res,next)=>{ try { const {data,error}=await supabase.from('customer_timeline_events').select('*').eq('customer_id',req.params.customer_id).order('created_at',{ascending:false}).limit(Number(req.query.limit||100)); if(error) throw error; res.json({ok:true,events:data||[]}) } catch(e){ next(e) } })
  router.post('/track-tool', async (req,res,next)=>{ try { res.json({ ok:true, usage: await service.trackTool(req.body || {}) }) } catch(e){ next(e) } })
  router.get('/tool-usage/:customer_id', async (req,res,next)=>{ try { const {data,error}=await supabase.from('customer_tool_usage').select('*').eq('customer_id',req.params.customer_id).order('usage_count',{ascending:false}); if(error) throw error; res.json({ok:true,usage:data||[]}) } catch(e){ next(e) } })
  router.post('/calculate/:customer_id', async (req,res,next)=>{ try { res.json({ ok:true, intelligence: await service.calculateAndStore(req.params.customer_id) }) } catch(e){ next(e) } })
  router.get('/score/:customer_id', async (req,res,next)=>{ try { const {data,error}=await supabase.from('customer_intelligence_scores').select('*').eq('customer_id',req.params.customer_id).maybeSingle(); if(error) throw error; res.json({ok:true,intelligence:data}) } catch(e){ next(e) } })
  router.post('/booking/:appointment_id/create-invoice', async (req,res,next)=>{ try { res.json({ ok:true, invoice: await service.createInvoiceFromAppointment({ appointment_id:req.params.appointment_id, customer_id:req.body?.customer_id }) }) } catch(e){ next(e) } })
  router.post('/reviews/:review_feedback_id/create-warning', async (req,res,next)=>{ try { res.json({ ok:true, result: await service.reviewWarning({ review_feedback_id:req.params.review_feedback_id }) }) } catch(e){ next(e) } })
  router.post('/qr/:qr_campaign_id/create-upsell-lead', async (req,res,next)=>{ try { res.json({ ok:true, result: await service.qrUpsellLead({ qr_campaign_id:req.params.qr_campaign_id }) }) } catch(e){ next(e) } })
  router.post('/monthly-snapshot/:customer_id', async (req,res,next)=>{ try { const range=req.body?.period_start&&req.body?.period_end?{start:req.body.period_start,end:req.body.period_end}:monthRange(); const snapshot=await service.monthlySnapshot({customer_id:req.params.customer_id,period_start:range.start,period_end:range.end,create_pdf:req.body?.create_pdf===true}); res.json({ok:true,snapshot}) } catch(e){ next(e) } })
  router.get('/monthly-snapshots/:customer_id', async (req,res,next)=>{ try { const {data,error}=await supabase.from('customer_monthly_report_snapshots').select('*').eq('customer_id',req.params.customer_id).order('period_start',{ascending:false}).limit(24); if(error) throw error; res.json({ok:true,snapshots:data||[]}) } catch(e){ next(e) } })
  return router
}
module.exports = customerIntelligenceRoutes
