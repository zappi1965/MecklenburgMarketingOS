require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || true }))
app.use(express.json())

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function temporaryPassword(){
  return Math.random().toString(36).slice(2,10) + 'A1!'
}

app.get('/api/health', (req,res)=> {
  res.json({ ok:true, name:'Mecklenburg Marketing OS Complete Fullstack' })
})

app.post('/api/bootstrap/admin', async(req,res)=>{
  try{
    const { email, password, full_name, bootstrap_secret } = req.body
    if(bootstrap_secret !== process.env.BOOTSTRAP_SECRET){
      return res.status(401).json({ error:'Invalid bootstrap secret' })
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm:true
    })
    if(createError) return res.status(400).json({ error:createError.message })

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: created.user.id,
      email,
      full_name,
      role:'admin'
    })
    if(profileError) return res.status(400).json({ error:profileError.message })

    res.json({ ok:true, user_id:created.user.id })
  }catch(e){
    res.status(500).json({ error:e.message })
  }
})

app.post('/api/users/create', async(req,res)=>{
  try{
    const { email, password, full_name, role='customer', customer_id } = req.body
    if(!email || !full_name) return res.status(400).json({ error:'Name und E-Mail fehlen' })

    const finalPassword = password || temporaryPassword()
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email, password: finalPassword, email_confirm:true
    })
    if(createError) return res.status(400).json({ error:createError.message })

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: created.user.id,
      email,
      full_name,
      role
    })
    if(profileError) return res.status(400).json({ error:profileError.message })

    if(customer_id && role === 'customer'){
      const { error: accessError } = await supabaseAdmin.from('user_customer_access').insert({
        user_id: created.user.id,
        customer_id
      })
      if(accessError) return res.status(400).json({ error:accessError.message })
    }

    res.json({ ok:true, user_id:created.user.id, temporary_password:finalPassword })
  }catch(e){
    res.status(500).json({ error:e.message })
  }
})


app.post('/api/bootstrap/test-users', async(req,res)=>{
  try{
    const { bootstrap_secret } = req.body
    if(bootstrap_secret !== process.env.BOOTSTRAP_SECRET){
      return res.status(401).json({ error:'Invalid bootstrap secret' })
    }

    async function upsertCustomer(payload){
      const { data: existing } = await supabaseAdmin.from('customers').select('*').eq('email', payload.email).maybeSingle()
      if(existing) return existing
      const { data, error } = await supabaseAdmin.from('customers').insert(payload).select().single()
      if(error) throw error
      return data
    }

    async function upsertUser({email,password,full_name,role,customer_id}){
      let userId
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm:true })
      if(error && !String(error.message).includes('already been registered')) throw error
      if(created?.user?.id) userId = created.user.id
      if(!userId){
        const { data: list } = await supabaseAdmin.auth.admin.listUsers()
        userId = list.users.find(u=>u.email===email)?.id
      }
      if(!userId) throw new Error('User not found: '+email)
      await supabaseAdmin.from('profiles').upsert({ id:userId, email, full_name, role })
      if(customer_id && role === 'customer'){
        await supabaseAdmin.from('user_customer_access').upsert({ user_id:userId, customer_id }, { onConflict:'user_id,customer_id' })
      }
      return { email, password, role, user_id:userId }
    }

    const demo = await upsertCustomer({ name:'Demo Friseur Rostock', contact_name:'Max Mustermann', email:'demo-friseur@example.de', phone:'0381 123456', status:'Aktiv', branch:'Beauty', revenue:2480, rating:4.8 })
    const real = await upsertCustomer({ name:'Echter Kunde Mustermann', contact_name:'Erika Mustermann', email:'kontakt@mustermann.de', phone:'0381 000000', status:'Aktiv', branch:'', revenue:0, rating:0 })

    await supabaseAdmin.from('service_categories').insert([
      {customer_id:demo.id,name:'Fade Cut',price:29},
      {customer_id:demo.id,name:'Damen Haarschnitt',price:49}
    ]).then(()=>null)

    await supabaseAdmin.from('invoices').upsert([
      {invoice_number:'RE-DEMO-001',customer_id:demo.id,amount:499,status:'Offen',service:'SEO Betreuung'},
      {invoice_number:'RE-DEMO-002',customer_id:demo.id,amount:299,status:'Bezahlt',service:'Review Kampagne'}
    ], { onConflict:'invoice_number' }).then(()=>null)

    await supabaseAdmin.from('appointments').insert([
      {customer_id:demo.id,client_name:'Anna Müller',appointment_date:new Date().toISOString().slice(0,10),start_time:'09:00',end_time:'10:00',notes:'Demo Termin'}
    ]).then(()=>null)

    const users = []
    users.push(await upsertUser({email:'admin@agentur.local',password:'AdminDemo123!',full_name:'Dominique Zapf',role:'admin'}))
    users.push(await upsertUser({email:'kunde.demo@agentur.local',password:'KundeDemo123!',full_name:'Kunde Demo',role:'customer',customer_id:demo.id}))
    users.push(await upsertUser({email:'kunde.echt@agentur.local',password:'KundeEcht123!',full_name:'Echter Kunde',role:'customer',customer_id:real.id}))

    res.json({ ok:true, users, customers:{demo:demo.id, real:real.id} })
  }catch(e){
    res.status(500).json({ error:e.message })
  }
})



app.post('/api/report/customer', async(req,res)=>{
  try{
    const { customer_id, kpis = ['SEO','Reviews','Umsatz','Tickets','Booking'] } = req.body
    const { data: customer, error } = await supabaseAdmin.from('customers').select('*').eq('id', customer_id).single()
    if(error) throw error

    // Simple HTML/PDF fallback route: returns printable HTML if full PDF engine is not active
    const html = `
      <html><head><title>Report ${customer.name}</title>
      <style>body{font-family:Arial;padding:40px;color:#111} h1{color:#5b21b6}.card{border:1px solid #ddd;border-radius:16px;padding:16px;margin:12px 0}</style>
      </head><body>
      <h1>Mecklenburg Marketing OS Report</h1>
      <h2>${customer.name}</h2>
      <div class="card"><b>Umsatz:</b> ${customer.revenue || 0} EUR</div>
      <div class="card"><b>Bewertung:</b> ${customer.rating || 0}</div>
      ${kpis.map(k=>`<div class="card"><h3>${k}</h3><p>Automatisch generierte KPI-Zusammenfassung für die letzten 30 Tage.</p></div>`).join('')}
      <script>window.print()</script>
      </body></html>`
    res.setHeader('Content-Type','text/html')
    res.send(html)
  }catch(e){res.status(500).json({error:e.message})}
})



app.post('/api/register/customer', async(req,res)=>{
  try{
    const { business_name, branch, contact_name, email, phone, password } = req.body
    if(!business_name || !email || !password){
      return res.status(400).json({ error:'Betriebsname, E-Mail und Passwort sind erforderlich.' })
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm:true
    })
    if(createError) return res.status(400).json({ error:createError.message })

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert({
        name:business_name,
        branch:branch || '',
        contact_name:contact_name || '',
        email,
        phone:phone || '',
        status:'Lead',
        revenue:0,
        rating:0
      })
      .select()
      .single()

    if(customerError) return res.status(400).json({ error:customerError.message })

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id:created.user.id,
      email,
      full_name:contact_name || business_name,
      phone:phone || '',
      role:'customer'
    })
    if(profileError) return res.status(400).json({ error:profileError.message })

    await supabaseAdmin.from('user_customer_access').insert({
      user_id:created.user.id,
      customer_id:customer.id
    })

    await supabaseAdmin.from('customer_modules').insert({
      customer_id:customer.id,
      module_key:'sales_page',
      enabled:true
    }).then(()=>null)

    res.json({ ok:true, customer_id:customer.id, user_id:created.user.id })
  }catch(e){
    res.status(500).json({ error:e.message })
  }
})



app.post('/api/locations/create-user', async(req,res)=>{
  try{
    const { customer_id, location_name, address, phone, google_profile_url, creator_user_id } = req.body
    if(!customer_id || !location_name){
      return res.status(400).json({ error:'customer_id und location_name sind erforderlich.' })
    }
    const safe = location_name.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'') || 'standort'
    const email = `${safe}.${Date.now()}@standort.local`
    const password = 'Standort'+Math.random().toString(36).slice(2,8)+'!1'
    const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm:true })
    if(userError) return res.status(400).json({ error:userError.message })
    await supabaseAdmin.from('profiles').insert({ id:created.user.id, email, full_name:location_name, phone:phone || '', role:'customer' })
    await supabaseAdmin.from('user_customer_access').insert({ user_id:created.user.id, customer_id })
    const { data: location, error: locationError } = await supabaseAdmin.from('multi_locations').insert({
      customer_id, location_name, address, phone, google_profile_url,
      created_by:creator_user_id || null,
      location_user_id:created.user.id,
      login_email:email,
      login_password_hint:password,
      enabled:true
    }).select().single()
    if(locationError) return res.status(400).json({ error:locationError.message })
    res.json({ ok:true, location, login:{email,password} })
  }catch(e){ res.status(500).json({ error:e.message }) }
})



app.post('/api/google-business/mock-sync', async(req,res)=>{
  try{
    const { customer_id } = req.body
    if(!customer_id) return res.status(400).json({ error:'customer_id fehlt' })
    await supabaseAdmin.from('seo_traffic').insert({
      customer_id, month:'Google Sync Demo', organic_traffic:820, impressions:15400, clicks:690,
      ctr:4.48, avg_position:8.4, top10_keywords:12, backlinks:38, technical_score:84, local_visibility:76
    })
    const keywords = [
      ['friseur rostock',3.1,4200,310],
      ['fade cut rostock',2.4,1300,120],
      ['barber rostock',5.8,2800,180]
    ]
    for(const [keyword,position,impressions,clicks] of keywords){
      await supabaseAdmin.from('seo_keywords').insert({ customer_id, keyword, position, impressions, clicks })
    }
    await supabaseAdmin.from('google_business_sync_logs').insert({ customer_id, status:'Erfolgreich', message:'Demo-Sync: Keywords und KPI Werte wurden eingepflegt. Für echten Sync Google Business/Profile API Credentials hinterlegen.' })
    await supabaseAdmin.from('google_business_connections').update({ last_sync_at:new Date().toISOString() }).eq('customer_id',customer_id)
    res.json({ ok:true })
  }catch(e){ res.status(500).json({ error:e.message }) }
})



app.get('/api/search/global', async(req,res)=>{
  try{
    const q = String(req.query.q || '').toLowerCase()
    if(!q) return res.json({ ok:true, results:[] })
    const [customers, invoices, tickets, offers] = await Promise.all([
      supabaseAdmin.from('customers').select('*').ilike('name', `%${q}%`).limit(8),
      supabaseAdmin.from('invoices').select('*, customers(*)').ilike('invoice_number', `%${q}%`).limit(8),
      supabaseAdmin.from('tickets').select('*, customers(*)').ilike('title', `%${q}%`).limit(8),
      supabaseAdmin.from('offers').select('*, customers(*)').ilike('title', `%${q}%`).limit(8)
    ])
    res.json({ ok:true, results:[
      ...(customers.data||[]).map(x=>({type:'Kunde',title:x.name,subtitle:x.email,id:x.id})),
      ...(invoices.data||[]).map(x=>({type:'Rechnung',title:x.invoice_number,subtitle:x.customers?.name,id:x.id})),
      ...(tickets.data||[]).map(x=>({type:'Ticket',title:x.title,subtitle:x.customers?.name,id:x.id})),
      ...(offers.data||[]).map(x=>({type:'Angebot',title:x.title,subtitle:x.customers?.name,id:x.id}))
    ]})
  }catch(e){res.status(500).json({error:e.message})}
})

app.post('/api/automation/run', async(req,res)=>{
  try{
    const { type, customer_id, payload={} } = req.body
    await supabaseAdmin.from('activity_timeline').insert({
      customer_id,
      event_type:'automation',
      title:'Automation ausgeführt',
      description:`Trigger: ${type}`,
      entity:payload.entity || null,
      entity_id:payload.entity_id || null
    })
    await supabaseAdmin.from('notifications').insert({
      customer_id,
      title:'Automation ausgeführt',
      message:`${type} wurde verarbeitet.`,
      type:'automation',
      priority:'Normal',
      target_view:'automation'
    })
    res.json({ok:true})
  }catch(e){res.status(500).json({error:e.message})}
})


app.listen(process.env.PORT || 4000, ()=> console.log('MMOS backend running'))