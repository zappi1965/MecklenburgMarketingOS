
const express = require('express')
const multer = require('multer')
const crypto = require('crypto')
const { slugify, token, hash, createLoyaltyQr, generateInsights, summarizeTranscript } = require('../services/v20GrowthServices')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

function v20GrowthRoutes(supabase) {
  const router = express.Router()
  async function safe(q){ try { return await q } catch { return null } }

  router.post('/ai-insights/generate', async (req,res,next)=>{
    try {
      const { customer_id } = req.body || {}
      const [appointments, qr, reviews, tickets, leads] = await Promise.all([
        customer_id ? supabase.from('appointments').select('price').eq('customer_id', customer_id) : {data:[]},
        customer_id ? supabase.from('qr_campaigns').select('scans,conversions').eq('customer_id', customer_id) : {data:[]},
        customer_id ? supabase.from('review_feedback').select('rating').eq('customer_id', customer_id) : {data:[]},
        customer_id ? supabase.from('tickets').select('id,status').eq('customer_id', customer_id) : {data:[]},
        customer_id ? supabase.from('pipeline_leads').select('id').eq('customer_id', customer_id) : {data:[]}
      ])
      const revenue = (appointments.data||[]).reduce((s,a)=>s+Number(a.price||0),0)
      const qrScans = (qr.data||[]).reduce((s,q)=>s+Number(q.scans||0),0)
      const conversions = (qr.data||[]).reduce((s,q)=>s+Number(q.conversions||0),0)
      const ratings = (reviews.data||[]).map(r=>Number(r.rating||0)).filter(Boolean)
      const avgRating = ratings.length ? ratings.reduce((a,b)=>a+b,0)/ratings.length : 0
      const openTickets = (tickets.data||[]).filter(t=>String(t.status).toLowerCase()!=='closed').length
      const generated = generateInsights({ revenue, qrScans, conversions, avgRating, openTickets, leads:(leads.data||[]).length })
      const saved = []
      for (const item of generated) {
        const { data, error } = await supabase.from('ai_business_insights').insert({ customer_id: customer_id || null, ...item, metadata:{ revenue, qrScans, conversions, avgRating, openTickets, leads:(leads.data||[]).length } }).select('*').single()
        if (!error) saved.push(data)
      }
      res.json({ ok:true, insights:saved })
    } catch(e){ next(e) }
  })

  router.get('/ai-insights/:customer_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('ai_business_insights').select('*').eq('customer_id', req.params.customer_id).order('created_at',{ascending:false}).limit(50)
      if (error) throw error
      res.json({ ok:true, insights:data||[] })
    } catch(e){ next(e) }
  })

  router.post('/reviews/source', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('review_sources').insert(req.body || {}).select('*').single()
      if (error) throw error
      res.json({ ok:true, source:data })
    } catch(e){ next(e) }
  })

  router.post('/reviews/feedback', async (req,res,next)=>{
    try {
      const body = req.body || {}
      const { data, error } = await supabase.from('review_feedback').insert({
        customer_id: body.customer_id || null,
        qr_campaign_id: body.qr_campaign_id || null,
        loyalty_customer_id: body.loyalty_customer_id || null,
        rating: body.rating || null,
        feedback_text: body.feedback_text || null,
        public_review_intended: Number(body.rating || 0) >= 4,
        provider: body.provider || 'internal',
        reviewer_name: body.reviewer_name || null,
        reviewer_email: body.reviewer_email || null,
        reviewer_phone: body.reviewer_phone || null,
        metadata: body.metadata || {}
      }).select('*').single()
      if (error) throw error
      if (body.loyalty_customer_id && Number(body.rating || 0) >= 1) await safe(supabase.from('loyalty_transactions').insert({ customer_id: body.customer_id, loyalty_program_id: body.loyalty_program_id || null, loyalty_customer_id: body.loyalty_customer_id, qr_campaign_id: body.qr_campaign_id || null, review_feedback_id: data.id, action:'review_feedback', points:Number(body.points || 40), source:'review' }))
      res.json({ ok:true, feedback:data })
    } catch(e){ next(e) }
  })

  router.get('/reviews/:customer_id', async (req,res,next)=>{
    try {
      const [sources, feedback] = await Promise.all([
        supabase.from('review_sources').select('*').eq('customer_id', req.params.customer_id),
        supabase.from('review_feedback').select('*').eq('customer_id', req.params.customer_id).order('created_at',{ascending:false}).limit(200)
      ])
      const ratings = (feedback.data||[]).map(r=>Number(r.rating||0)).filter(Boolean)
      res.json({ ok:true, sources:sources.data||[], feedback:feedback.data||[], kpis:{ total_feedback:(feedback.data||[]).length, avg_rating:ratings.length ? Math.round((ratings.reduce((a,b)=>a+b,0)/ratings.length)*10)/10 : 0, negative:(feedback.data||[]).filter(r=>Number(r.rating||0)<=3).length, public_intended:(feedback.data||[]).filter(r=>r.public_review_intended).length } })
    } catch(e){ next(e) }
  })

  router.post('/loyalty/program', async (req,res,next)=>{
    try {
      const body = req.body || {}
      if (!body.customer_id) return res.status(400).json({ ok:false, error:'customer_id fehlt' })
      const slug = body.slug || `${slugify(body.customer_name || 'kunde')}-${slugify(body.name || 'loyalty')}-${Date.now().toString(36)}`
      const qr = await createLoyaltyQr({ program_slug: slug })
      const { data: program, error } = await supabase.from('loyalty_programs').insert({ customer_id:body.customer_id, qr_campaign_id:body.qr_campaign_id || null, name:body.name || 'Loyalty Programm', slug, points_per_scan:Number(body.points_per_scan || 10), points_per_booking:Number(body.points_per_booking || 25), points_per_review:Number(body.points_per_review || 40), public_url:qr.public_url, qr_svg:qr.qr_svg, qr_png_base64:qr.qr_png_base64, rules:body.rules || {} }).select('*').single()
      if (error) throw error
      if (body.qr_campaign_id) await safe(supabase.from('qr_campaigns').update({ loyalty_enabled:true, loyalty_program_id:program.id }).eq('id', body.qr_campaign_id))
      await safe(supabase.from('loyalty_rewards').insert({ customer_id:body.customer_id, loyalty_program_id:program.id, name:body.default_reward_name || 'Starter Reward', description:body.default_reward_description || 'Standard-Bonus für treue Kunden.', required_points:Number(body.default_reward_points || 100), reward_type:'discount' }))
      res.json({ ok:true, program })
    } catch(e){ next(e) }
  })

  router.post('/loyalty/link-qr', async (req,res,next)=>{
    try {
      const { qr_campaign_id, loyalty_program_id } = req.body || {}
      if (!qr_campaign_id || !loyalty_program_id) return res.status(400).json({ ok:false, error:'qr_campaign_id/loyalty_program_id fehlt' })
      const { data:program, error:pe } = await supabase.from('loyalty_programs').select('*').eq('id', loyalty_program_id).single()
      if (pe) throw pe
      const { data:campaign, error:ce } = await supabase.from('qr_campaigns').update({ loyalty_enabled:true, loyalty_program_id }).eq('id', qr_campaign_id).select('*').single()
      if (ce) throw ce
      await supabase.from('loyalty_programs').update({ qr_campaign_id }).eq('id', loyalty_program_id)
      res.json({ ok:true, program, campaign })
    } catch(e){ next(e) }
  })

  router.get('/loyalty/program/:id', async (req,res,next)=>{
    try {
      const [program, customers, transactions, rewards, redemptions] = await Promise.all([
        supabase.from('loyalty_programs').select('*').eq('id', req.params.id).single(),
        supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', req.params.id).order('created_at',{ascending:false}).limit(200),
        supabase.from('loyalty_transactions').select('*').eq('loyalty_program_id', req.params.id).order('created_at',{ascending:false}).limit(300),
        supabase.from('loyalty_rewards').select('*').eq('loyalty_program_id', req.params.id),
        supabase.from('loyalty_redemptions').select('*').eq('loyalty_program_id', req.params.id).order('created_at',{ascending:false}).limit(100)
      ])
      if (program.error) throw program.error
      res.json({ ok:true, program:program.data, customers:customers.data||[], transactions:transactions.data||[], rewards:rewards.data||[], redemptions:redemptions.data||[], kpis:{ participants:(customers.data||[]).length, points_issued:(transactions.data||[]).reduce((s,t)=>s+Number(t.points||0),0), redemptions:(redemptions.data||[]).length, scans:(transactions.data||[]).filter(t=>t.action==='qr_scan').length } })
    } catch(e){ next(e) }
  })

  router.get('/loyalty/by-qr/:qr_campaign_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_programs').select('*').eq('qr_campaign_id', req.params.qr_campaign_id).maybeSingle()
      if (error) throw error
      res.json({ ok:true, program:data })
    } catch(e){ next(e) }
  })

  router.post('/public/loyalty/:slug/join-or-scan', async (req,res,next)=>{
    try {
      const body = req.body || {}
      const { data:program, error } = await supabase.from('loyalty_programs').select('*').eq('slug', req.params.slug).eq('status','active').single()
      if (error) throw error
      const email = body.email ? String(body.email).trim().toLowerCase() : null
      const phone = body.phone ? String(body.phone).trim() : null
      const deviceHash = hash(body.device_id)
      let member = null
      if (body.member_token) member = (await supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', program.id).eq('member_token', body.member_token).maybeSingle()).data
      if (!member && email) member = (await supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', program.id).eq('email', email).maybeSingle()).data
      if (!member && phone) member = (await supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', program.id).eq('phone', phone).maybeSingle()).data
      if (!member && deviceHash) member = (await supabase.from('loyalty_customers').select('*').eq('loyalty_program_id', program.id).eq('device_id_hash', deviceHash).maybeSingle()).data
      if (!member && !email && !phone && !deviceHash) return res.status(400).json({ ok:false, error:'E-Mail, Telefon oder Device-ID erforderlich' })
      if (!member) {
        const created = await supabase.from('loyalty_customers').insert({ customer_id:program.customer_id, loyalty_program_id:program.id, display_name:body.display_name || null, email, phone, member_token:token('loy'), device_id_hash:deviceHash, consent_at:body.consent ? new Date().toISOString() : null, last_seen_at:new Date().toISOString() }).select('*').single()
        if (created.error) throw created.error
        member = created.data
      }
      const points = Number(program.points_per_scan || 10)
      await supabase.from('loyalty_transactions').insert({ customer_id:program.customer_id, loyalty_program_id:program.id, loyalty_customer_id:member.id, qr_campaign_id:program.qr_campaign_id || null, action:'qr_scan', points, source:'qr', metadata:{ public:true } })
      const newBalance = Number(member.points_balance || 0) + points
      const { data:updated } = await supabase.from('loyalty_customers').update({ points_balance:newBalance, last_seen_at:new Date().toISOString() }).eq('id', member.id).select('*').single()
      res.json({ ok:true, member:updated || member, points_added:points, points_balance:newBalance, program })
    } catch(e){ next(e) }
  })

  router.post('/loyalty/rewards', async (req,res,next)=>{
    try {
      const body = req.body || {}
      const payload = {
        customer_id: body.customer_id,
        loyalty_program_id: body.loyalty_program_id,
        qr_campaign_id: body.qr_campaign_id || null,
        name: body.name,
        description: body.description || null,
        required_points: Number(body.required_points || 100),
        reward_type: body.reward_type || 'discount',
        reward_value: body.reward_value ?? null,
        reward_unit: body.reward_unit || null,
        active: body.active !== false,
        valid_from: body.valid_from || null,
        valid_until: body.valid_until || null,
        max_total_redemptions: body.max_total_redemptions || null,
        max_redemptions_per_member: Number(body.max_redemptions_per_member || 1),
        min_scans_required: Number(body.min_scans_required || 0),
        min_reviews_required: Number(body.min_reviews_required || 0),
        allowed_weekdays: body.allowed_weekdays || null,
        campaign_scope: body.campaign_scope || 'program',
        redemption_mode: body.redemption_mode || 'voucher_code',
        staff_confirmation_required: body.staff_confirmation_required !== false,
        staff_code_required: body.staff_code_required === true,
        terms: body.terms || null,
        sort_order: Number(body.sort_order || 0),
        metadata: body.metadata || {}
      }
      const { data, error } = await supabase.from('loyalty_rewards').insert(payload).select('*').single()
      if (error) throw error
      res.json({ ok:true, reward:data })
    } catch(e){ next(e) }
  })

  router.patch('/loyalty/rewards/:id', async (req,res,next)=>{
    try {
      const body = req.body || {}
      const { data, error } = await supabase.from('loyalty_rewards').update({
        name: body.name,
        description: body.description,
        required_points: body.required_points,
        reward_type: body.reward_type,
        reward_value: body.reward_value,
        reward_unit: body.reward_unit,
        active: body.active,
        valid_from: body.valid_from,
        valid_until: body.valid_until,
        max_total_redemptions: body.max_total_redemptions,
        max_redemptions_per_member: body.max_redemptions_per_member,
        min_scans_required: body.min_scans_required,
        min_reviews_required: body.min_reviews_required,
        allowed_weekdays: body.allowed_weekdays,
        campaign_scope: body.campaign_scope,
        qr_campaign_id: body.qr_campaign_id,
        redemption_mode: body.redemption_mode,
        staff_confirmation_required: body.staff_confirmation_required,
        terms: body.terms,
        sort_order: body.sort_order,
        metadata: body.metadata || {}
      }).eq('id', req.params.id).select('*').single()
      if (error) throw error
      res.json({ ok:true, reward:data })
    } catch(e){ next(e) }
  })

  router.get('/loyalty/rewards/program/:program_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_rewards').select('*').eq('loyalty_program_id', req.params.program_id).order('sort_order',{ascending:true}).order('required_points',{ascending:true})
      if (error) throw error
      res.json({ ok:true, rewards:data || [] })
    } catch(e){ next(e) }
  })

  router.get('/loyalty/reward-rule-templates', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('loyalty_reward_rule_templates').select('*').eq('active', true).order('sort_order',{ascending:true})
      if (error) throw error
      res.json({ ok:true, templates:data || [] })
    } catch(e){ next(e) }
  })

  router.post('/loyalty/rewards/:id/check', async (req,res,next)=>{
    try {
      const { loyalty_customer_id } = req.body || {}
      const [{data:member,error:me},{data:reward,error:re}] = await Promise.all([
        supabase.from('loyalty_customers').select('*').eq('id', loyalty_customer_id).single(),
        supabase.from('loyalty_rewards').select('*').eq('id', req.params.id).single()
      ])
      if (me) throw me
      if (re) throw re
      const eligibility = await evaluateRewardEligibility(member, reward)
      res.json({ ok:true, eligibility })
    } catch(e){ next(e) }
  })


  router.post('/loyalty/staff-codes', async (req,res,next)=>{
    try {
      const body = req.body || {}
      if (!body.customer_id || !body.loyalty_program_id || !body.code) {
        return res.status(400).json({ ok:false, error:'customer_id, loyalty_program_id und code erforderlich' })
      }

      const { data, error } = await supabase.from('loyalty_staff_codes').insert({
        customer_id: body.customer_id,
        loyalty_program_id: body.loyalty_program_id,
        qr_campaign_id: body.qr_campaign_id || null,
        label: body.label || 'Mitarbeiter-Code',
        code_hash: staffCodeHash(body.code),
        code_hint: body.code_hint || ` endet auf ${String(body.code).slice(-2)}`,
        active: body.active !== false,
        max_uses: body.max_uses || null,
        valid_from: body.valid_from || null,
        valid_until: body.valid_until || null,
        created_by: body.created_by || 'Kunde'
      }).select('id,customer_id,loyalty_program_id,qr_campaign_id,label,code_hint,active,max_uses,used_count,valid_from,valid_until,created_by,created_at,updated_at').single()

      if (error) throw error
      res.json({ ok:true, staff_code:data })
    } catch(e){ next(e) }
  })

  router.patch('/loyalty/staff-codes/:id', async (req,res,next)=>{
    try {
      const body = req.body || {}
      const update = {
        label: body.label,
        qr_campaign_id: body.qr_campaign_id,
        active: body.active,
        max_uses: body.max_uses,
        valid_from: body.valid_from,
        valid_until: body.valid_until,
        updated_at: new Date().toISOString()
      }
      if (body.code) {
        update.code_hash = staffCodeHash(body.code)
        update.code_hint = body.code_hint || ` endet auf ${String(body.code).slice(-2)}`
      }
      Object.keys(update).forEach(k => update[k] === undefined && delete update[k])

      const { data, error } = await supabase
        .from('loyalty_staff_codes')
        .update(update)
        .eq('id', req.params.id)
        .select('id,customer_id,loyalty_program_id,qr_campaign_id,label,code_hint,active,max_uses,used_count,valid_from,valid_until,created_by,created_at,updated_at')
        .single()

      if (error) throw error
      res.json({ ok:true, staff_code:data })
    } catch(e){ next(e) }
  })

  router.get('/loyalty/staff-codes/program/:program_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase
        .from('loyalty_staff_codes')
        .select('id,customer_id,loyalty_program_id,qr_campaign_id,label,code_hint,active,max_uses,used_count,valid_from,valid_until,created_by,created_at,updated_at')
        .eq('loyalty_program_id', req.params.program_id)
        .order('created_at', { ascending:false })

      if (error) throw error
      res.json({ ok:true, staff_codes:data || [] })
    } catch(e){ next(e) }
  })

  router.post('/loyalty/redemptions/:id/confirm', async (req,res,next)=>{
    try {
      const body = req.body || {}
      const { data:redemption, error:rede } = await supabase
        .from('loyalty_redemptions')
        .select('*')
        .eq('id', req.params.id)
        .single()
      if (rede) throw rede

      const verification = await verifyStaffCode({
        customer_id: redemption.customer_id,
        loyalty_program_id: redemption.loyalty_program_id,
        qr_campaign_id: body.qr_campaign_id || null,
        code: body.staff_code
      })

      if (!verification.ok) return res.status(400).json({ ok:false, error:verification.reason })

      const { staffCode } = verification

      const { data, error } = await supabase
        .from('loyalty_redemptions')
        .update({
          status: 'redeemed',
          staff_code_id: staffCode.id,
          confirmed_by_label: staffCode.label,
          confirmed_at: new Date().toISOString(),
          confirmation_method: 'staff_code',
          redeemed_at: new Date().toISOString()
        })
        .eq('id', redemption.id)
        .select('*')
        .single()

      if (error) throw error

      await supabase
        .from('loyalty_staff_codes')
        .update({ used_count: Number(staffCode.used_count || 0) + 1, updated_at: new Date().toISOString() })
        .eq('id', staffCode.id)

      res.json({ ok:true, redemption:data })
    } catch(e){ next(e) }
  })


  router.post('/loyalty/redeem', async (req,res,next)=>{
    try {
      const body = req.body || {}
      const { data:member, error:me } = await supabase.from('loyalty_customers').select('*').eq('id', body.loyalty_customer_id).single()
      if (me) throw me
      const { data:reward, error:re } = await supabase.from('loyalty_rewards').select('*').eq('id', body.reward_id).single()
      if (re) throw re
      const eligibility = await evaluateRewardEligibility(member, reward)
      if (!eligibility.eligible) return res.status(400).json({ ok:false, error:eligibility.reason })
      const code = token('red')
      const { data:redemption, error:de } = await supabase.from('loyalty_redemptions').insert({ customer_id:member.customer_id, loyalty_program_id:member.loyalty_program_id, loyalty_customer_id:member.id, reward_id:reward.id, redemption_code:code, status:'open' }).select('*').single()
      if (de) throw de

      let finalRedemption = redemption
      if (reward.staff_code_required || reward.staff_confirmation_required) {
        if (body.staff_code) {
          const verification = await verifyStaffCode({
            customer_id: member.customer_id,
            loyalty_program_id: member.loyalty_program_id,
            qr_campaign_id: reward.qr_campaign_id || body.qr_campaign_id || null,
            code: body.staff_code
          })
          if (!verification.ok) return res.status(400).json({ ok:false, error:verification.reason })
          const { staffCode } = verification
          const confirmed = await supabase.from('loyalty_redemptions').update({
            status:'redeemed',
            staff_code_id:staffCode.id,
            confirmed_by_label:staffCode.label,
            confirmed_at:new Date().toISOString(),
            confirmation_method:'staff_code',
            redeemed_at:new Date().toISOString()
          }).eq('id', redemption.id).select('*').single()
          if (confirmed.error) throw confirmed.error
          await supabase.from('loyalty_staff_codes').update({ used_count:Number(staffCode.used_count || 0) + 1, updated_at:new Date().toISOString() }).eq('id', staffCode.id)
          finalRedemption = confirmed.data
        }
      }

      await supabase.from('loyalty_customers').update({ points_balance:Number(member.points_balance)-Number(reward.required_points) }).eq('id', member.id)
      res.json({ ok:true, redemption: finalRedemption })
    } catch(e){ next(e) }
  })

  router.post('/voice-notes', upload.single('audio'), async (req,res,next)=>{
    try {
      const body = req.body || {}
      const transcript = body.transcript || ''
      const parsed = summarizeTranscript(transcript)
      const audio_url = req.file ? `memory://${req.file.originalname}` : body.audio_url || null
      const { data, error } = await supabase.from('crm_voice_notes').insert({ customer_id:body.customer_id || null, customer_client_id:body.customer_client_id || null, lead_id:body.lead_id || null, title:body.title || 'Sprachnotiz', audio_url, audio_mime_type:req.file?.mimetype || body.audio_mime_type || null, transcript, summary:body.summary || parsed.summary, action_items:body.action_items ? JSON.parse(body.action_items) : parsed.action_items, tags:body.tags ? String(body.tags).split(',').map(t=>t.trim()).filter(Boolean) : parsed.tags, status:'processed', metadata:{ file_size:req.file?.size || null } }).select('*').single()
      if (error) throw error
      res.json({ ok:true, voice_note:data })
    } catch(e){ next(e) }
  })

  router.get('/voice-notes/:customer_id', async (req,res,next)=>{
    try {
      const { data, error } = await supabase.from('crm_voice_notes').select('*').eq('customer_id', req.params.customer_id).order('created_at',{ascending:false}).limit(100)
      if (error) throw error
      res.json({ ok:true, voice_notes:data||[] })
    } catch(e){ next(e) }
  })

  return router
}

module.exports = v20GrowthRoutes
