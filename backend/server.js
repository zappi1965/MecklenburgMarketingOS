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


app.listen(process.env.PORT || 4000, ()=> console.log('MMOS backend running'))