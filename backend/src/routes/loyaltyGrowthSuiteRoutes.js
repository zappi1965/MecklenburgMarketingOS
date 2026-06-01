const express = require('express')
const {
  CAMPAIGN_IDEAS,
  VIP_LEVELS,
  listLoyaltyGrowthOverview,
  createLoyaltyCampaign,
  createHappyHourBooster,
  createVipLevelRules,
  createCouponWalletItem,
  createReferralProgram,
  calculateLoyaltyRoi,
  recommendNextLoyaltyTools
} = require('../services/loyaltyGrowthSuiteService')
const { requirePermission } = require('../middleware/permissionGuard')

function loyaltyGrowthSuiteRoutes(supabase) {
  const router = express.Router()

  router.get('/ideas', (_req, res) => {
    res.json({ ok: true, ideas: CAMPAIGN_IDEAS, vip_levels: VIP_LEVELS })
  })

  router.get('/overview/:customer_id', async (req, res, next) => {
    try { res.json(await listLoyaltyGrowthOverview(supabase, { customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.get('/recommendations/:customer_id', async (req, res, next) => {
    try { res.json(await recommendNextLoyaltyTools(supabase, { customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.post('/campaign/:customer_id', requirePermission('manage_loyalty'), async (req, res, next) => {
    try { res.json(await createLoyaltyCampaign(supabase, { ...(req.body || {}), customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.post('/booster/:customer_id', requirePermission('manage_loyalty'), async (req, res, next) => {
    try { res.json(await createHappyHourBooster(supabase, { ...(req.body || {}), customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.post('/vip-levels/:customer_id', requirePermission('manage_loyalty'), async (req, res, next) => {
    try { res.json(await createVipLevelRules(supabase, { customer_id: req.params.customer_id, levels: req.body?.levels || undefined })) } catch (e) { next(e) }
  })

  router.post('/coupon/:customer_id', requirePermission('manage_loyalty'), async (req, res, next) => {
    try { res.json(await createCouponWalletItem(supabase, { ...(req.body || {}), customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.post('/referral/:customer_id', requirePermission('manage_loyalty'), async (req, res, next) => {
    try { res.json(await createReferralProgram(supabase, { ...(req.body || {}), customer_id: req.params.customer_id })) } catch (e) { next(e) }
  })

  router.post('/roi/:customer_id', async (req, res, next) => {
    try { res.json(await calculateLoyaltyRoi(supabase, { customer_id: req.params.customer_id, avg_order_value: req.body?.avg_order_value || 15, gross_margin: req.body?.gross_margin || 0.6 })) } catch (e) { next(e) }
  })

  return router
}

module.exports = loyaltyGrowthSuiteRoutes
