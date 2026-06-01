const express = require('express')
const { inspectDocumentIntegrity } = require('../services/documentIntegrityService')
const { inspectSchemaMigrationDoctor } = require('../services/schemaMigrationDoctorService')
const { publicShieldStatus } = require('../services/publicEndpointShieldService')
const { evaluateToolAccessPolicy } = require('../services/toolAccessPolicyService')
const { normalizeLimitPolicy } = require('../services/unifiedLimitEngineService')
const { toolsForPackage } = require('../services/packageAccessService')

async function safeQuery(query) { try { return await query } catch (error) { return { data: null, error } } }

function globalGuardRoutes(supabase) {
  const router = express.Router()

  router.get('/schema-doctor', async (_req, res, next) => {
    try { res.json(await inspectSchemaMigrationDoctor(supabase)) } catch (e) { next(e) }
  })

  router.get('/document-integrity', async (req, res, next) => {
    try { res.json(await inspectDocumentIntegrity(supabase, { customer_id: req.query.customer_id || null })) } catch (e) { next(e) }
  })

  router.get('/public-shield-status', (_req, res) => {
    res.json(publicShieldStatus())
  })

  router.get('/tool-access-policy/:customer_id', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const customer = await safeQuery(supabase.from('customers').select('*').eq('id', customerId).maybeSingle())
      const packageName = customer.data?.package_name || customer.data?.plan || 'Starter'
      const access = await safeQuery(supabase.from('customer_tool_access').select('*').eq('customer_id', customerId).limit(500))
      const rows = access.data || []
      const allTools = Array.from(new Set([...toolsForPackage('Premium'), ...rows.map((r) => r.tool_key).filter(Boolean)]))
      const policies = allTools.map((tool_key) => evaluateToolAccessPolicy({ tool_key, row: rows.find((r) => r.tool_key === tool_key), package_name: packageName }))
      res.json({ ok: true, customer_id: customerId, package_name: packageName, policies })
    } catch (e) { next(e) }
  })

  router.get('/limit-policy/:customer_id', async (req, res, next) => {
    try {
      const customerId = req.params.customer_id
      const [settings, qr, rewards] = await Promise.all([
        safeQuery(supabase.from('v37_loyalty_settings').select('*').eq('customer_id', customerId).maybeSingle()),
        safeQuery(supabase.from('qr_campaigns').select('*').eq('customer_id', customerId).limit(100)),
        safeQuery(supabase.from('loyalty_rewards').select('*').eq('customer_id', customerId).limit(100))
      ])
      const qrPolicies = (qr.data || []).map((row) => ({ id: row.id, slug: row.slug, title: row.title || row.name, policy: normalizeLimitPolicy({ qrSettings: { ...row, ...(row.metadata || {}) }, settings: settings.data || {} }) }))
      const rewardPolicies = (rewards.data || []).map((row) => ({ id: row.id, title: row.title || row.name, policy: normalizeLimitPolicy({ reward: row, settings: settings.data || {} }) }))
      res.json({ ok: true, customer_id: customerId, settings: settings.data || null, qr_policies: qrPolicies, reward_policies: rewardPolicies })
    } catch (e) { next(e) }
  })

  return router
}

module.exports = globalGuardRoutes
