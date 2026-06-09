const { getSupabaseAdmin } = require('./lib/supabaseAdmin')

const supabaseAdmin = getSupabaseAdmin()

module.exports = { supabaseAdmin }
