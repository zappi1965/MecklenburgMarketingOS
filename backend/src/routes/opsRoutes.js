
const express = require('express')
const { invoicePdf, reportPdf, buildQr, calculateProbability, successScore } = require('../services/v19Services')

function opsRoutes(supabase) {
  const router = express.Router()
  async function safe(query){try{return await query}catch{return null}}

  router.post('/packages/grant', async (req,res,next)=>{
    try{
      const {customer_id, package_name, tools=[]}=req.body||{}
      if(!customer_id) return res.status(400).json({ok:false,error:'customer_id fehlt'})
      const {data,error}=await supabase.from('customer_subscriptions').insert({customer_id,package_name:package_name||'Starter',status:'active',started_at:new Date().toISOString()}).select('*').single()
      if(error) throw error
      for(const tool of tools){await safe(supabase.from('customer_tool_access').insert({customer_id,tool_key:tool,enabled:true,granted_by:'Admin'}))}
      await safe(supabase.from('notifications').insert({customer_id,title:'Paket freigeschaltet',message:`${package_name||'Starter'} wurde freigeschaltet.`,type:'package_granted',actor_name:'Admin'}))
      res.json({ok:true,subscription:data})
    }catch(e){next(e)}
  })

  router.post('/tools/grant', async (req,res,next)=>{
    try{
      const {customer_id,tool_key,enabled=true}=req.body||{}
      const {data,error}=await supabase.from('customer_tool_access').upsert({customer_id,tool_key,enabled,granted_by:'Admin'},{onConflict:'customer_id,tool_key'}).select('*').single()
      if(error) throw error
      res.json({ok:true,tool:data})
    }catch(e){next(e)}
  })

  router.post('/invoices/create-pdf', async (req,res,next)=>{
    try{
      const body=req.body||{}
      const pdf_base64=(await invoicePdf(body)).toString('base64')
      const pdf_url=`data:application/pdf;base64,${pdf_base64}`
      let invoice=null
      if(body.id){
        const {data,error}=await supabase.from('invoices').update({pdf_base64,pdf_url}).eq('id',body.id).select('*').single()
        if(error) throw error; invoice=data
      }else if(body.customer_id){
        const {data,error}=await supabase.from('invoices').insert({customer_id:body.customer_id,invoice_number:body.invoice_number||`RE-${Date.now()}`,service_type:body.service_type||body.service_category_name||'Dienstleistung',amount:Number(body.amount||body.price||0),status:body.status||'Offen',pdf_base64,pdf_url,service_category_id:body.service_category_id||null,source_appointment_id:body.source_appointment_id||null}).select('*').single()
        if(error) throw error; invoice=data
      }
      res.json({ok:true,invoice,pdf_base64,pdf_url})
    }catch(e){next(e)}
  })

  router.get('/invoices/:id/pdf', async (req,res,next)=>{
    try{
      const {data:inv,error}=await supabase.from('invoices').select('*').eq('id',req.params.id).single()
      if(error) throw error
      const pdf_base64=inv.pdf_base64 || (await invoicePdf(inv)).toString('base64')
      res.json({ok:true,pdf_base64,pdf_url:`data:application/pdf;base64,${pdf_base64}`})
    }catch(e){next(e)}
  })

  router.get('/appointments/:id', async (req,res,next)=>{
    try{
      const {data,error}=await supabase.from('appointments').select('*').eq('id',req.params.id).single()
      if(error) throw error
      res.json({ok:true,appointment:data})
    }catch(e){next(e)}
  })

  router.post('/pipeline/lead', async (req,res,next)=>{
    try{
      const body=req.body||{}
      const payload={...body,probability:calculateProbability(body),updated_at:new Date().toISOString()}
      const q=body.id?supabase.from('pipeline_leads').update(payload).eq('id',body.id).select('*').single():supabase.from('pipeline_leads').insert(payload).select('*').single()
      const {data,error}=await q
      if(error) throw error
      res.json({ok:true,lead:data})
    }catch(e){next(e)}
  })

  router.post('/automation/:key', async (req,res,next)=>{
    try{
      const key=req.params.key
      const customer_id=req.body?.customer_id||null
      const {data,error}=await supabase.from('automation_runs').insert({customer_id,automation_key:key,title:req.body?.title||key,status:'completed',result:{triggered:true,at:new Date().toISOString()},finished_at:new Date().toISOString()}).select('*').single()
      if(error) throw error
      res.json({ok:true,run:data})
    }catch(e){next(e)}
  })

  router.post('/workflows/:key', async (req,res,next)=>{
    try{
      const key=req.params.key
      const {data,error}=await supabase.from('workflow_runs').insert({customer_id:req.body?.customer_id||null,workflow_key:key,title:req.body?.title||key,status:'completed',progress:100,result:{triggered:true,at:new Date().toISOString()},finished_at:new Date().toISOString()}).select('*').single()
      if(error) throw error
      res.json({ok:true,run:data})
    }catch(e){next(e)}
  })

  router.post('/qr-campaigns', async (req,res,next)=>{
    try{
      const body=req.body||{}
      const qr=await buildQr(body)
      const {data,error}=await supabase.from('qr_campaigns').insert({customer_id:body.customer_id||null,name:body.name||'QR Kampagne',slug:qr.slug,public_url:qr.public_url,redirect_url:qr.redirect_url,qr_svg:qr.qr_svg,qr_png_base64:qr.qr_png_base64,status:'Aktiv',scans:0,conversions:0}).select('*').single()
      if(error) throw error
      res.json({ok:true,campaign:data})
    }catch(e){next(e)}
  })

  router.get('/qr-campaigns/:id', async (req,res,next)=>{
    try{
      const {data:campaign,error}=await supabase.from('qr_campaigns').select('*').eq('id',req.params.id).single()
      if(error) throw error
      const {data:events}=await supabase.from('qr_campaign_events').select('*').eq('campaign_id',req.params.id).order('created_at',{ascending:false}).limit(200)
      const scans=Number(campaign.scans||0), conversions=Number(campaign.conversions||0)
      res.json({ok:true,campaign,events:events||[],kpis:{scans,conversions,conversion_rate:scans?Math.round((conversions/scans)*1000)/10:0,last_scan_at:campaign.last_scan_at}})
    }catch(e){next(e)}
  })

  router.get('/customer/:customer_id/revenue', async (req,res,next)=>{
    try{
      const {data:appointments}=await supabase.from('appointments').select('*').eq('customer_id',req.params.customer_id)
      const revenue=(appointments||[]).reduce((s,a)=>s+Number(a.price||0),0)
      res.json({ok:true,revenue,appointments:appointments||[]})
    }catch(e){next(e)}
  })

  router.post('/success-score/config', async (req,res,next)=>{
    try{
      const {customer_id,config}=req.body||{}
      const {data,error}=await supabase.from('customers').update({success_score_config:config}).eq('id',customer_id).select('*').single()
      if(error) throw error
      res.json({ok:true,customer:data})
    }catch(e){next(e)}
  })

  router.get('/success-score/:customer_id', async (req,res,next)=>{
    try{
      const {data:customer}=await supabase.from('customers').select('*').eq('id',req.params.customer_id).single()
      const {data:appts}=await supabase.from('appointments').select('price').eq('customer_id',req.params.customer_id)
      const {data:tickets}=await supabase.from('tickets').select('id,status').eq('customer_id',req.params.customer_id)
      const revenue=(appts||[]).reduce((s,a)=>s+Number(a.price||0),0)
      const openTickets=(tickets||[]).filter(t=>String(t.status).toLowerCase()!=='closed').length
      res.json({ok:true,score:successScore({customer,revenue,openTickets}),revenue,openTickets})
    }catch(e){next(e)}
  })

  router.post('/reports/advanced', async (req,res,next)=>{
    try{
      const body=req.body||{}
      const pdf_base64=(await reportPdf(body)).toString('base64')
      const pdf_url=`data:application/pdf;base64,${pdf_base64}`
      const {data,error}=await supabase.from('advanced_reports').insert({customer_id:body.customer_id||null,title:body.title||'Advanced Report',report_type:body.report_type||'monthly',pdf_url,pdf_base64,status:'created',metadata:body}).select('*').single()
      if(error) throw error
      res.json({ok:true,report:data,pdf_base64,pdf_url})
    }catch(e){next(e)}
  })

  router.get('/integrations/google/status', (_,res)=>{
    res.json({ok:true,configured:Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET),analytics:Boolean(process.env.GOOGLE_ANALYTICS_PROPERTY_ID),search_console:Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL),note:'Mit Google ENV/OAuth können KPI-Jobs Live-Daten synchronisieren. Ohne Keys Fallbackdaten.'})
  })

  return router
}

module.exports = opsRoutes
