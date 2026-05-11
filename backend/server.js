
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')

const app = express()
const pdfRoutes = require('./routes/pdf')
app.use(cors({ origin: process.env.FRONTEND_URL || true }))
app.use(express.json())
app.use('/api/pdf', pdfRoutes)

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + 'A1!'
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'MMOS Persistent Backend' })
})

app.post('/api/bootstrap/admin', async (req, res) => {
  const { email, password, full_name, bootstrap_secret } = req.body
  if (bootstrap_secret !== process.env.BOOTSTRAP_SECRET) {
    return res.status(401).json({ error: 'Invalid bootstrap secret' })
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  if (createError) return res.status(400).json({ error: createError.message })

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: created.user.id,
    email,
    full_name,
    role: 'admin'
  })
  if (profileError) return res.status(400).json({ error: profileError.message })

  res.json({ ok: true, user_id: created.user.id })
})

app.post('/api/users/create', async (req, res) => {
  const { email, password, full_name, role, customer_id } = req.body
  if (!email || !full_name || !role) return res.status(400).json({ error: 'Missing fields' })

  const finalPassword = password || randomPassword()
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: finalPassword,
    email_confirm: true
  })
  if (createError) return res.status(400).json({ error: createError.message })

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: created.user.id,
    email,
    full_name,
    role
  })
  if (profileError) return res.status(400).json({ error: profileError.message })

  if (customer_id && role === 'customer') {
    const { error: accessError } = await supabaseAdmin.from('user_customer_access').insert({
      user_id: created.user.id,
      customer_id
    })
    if (accessError) return res.status(400).json({ error: accessError.message })
  }

  res.json({ ok: true, user_id: created.user.id, temporary_password: finalPassword })
})

app.listen(process.env.PORT || 4000, () => {
  console.log('MMOS backend running')
})
