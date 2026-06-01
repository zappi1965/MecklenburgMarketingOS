function n(v, fallback = 0) { return Number.isFinite(Number(v)) ? Number(v) : fallback }

function normalizeLimitPolicy({ qrSettings = {}, reward = {}, settings = {} } = {}) {
  return {
    max_scans_per_member: Math.max(0, Math.floor(n(qrSettings.max_scans_per_member, 0))),
    daily_scan_limit_per_member: Math.max(0, Math.floor(n(qrSettings.daily_scan_limit_per_member ?? settings.daily_scan_limit, 0))),
    weekly_scan_limit_per_member: (settings.weekly_scan_limit_enabled === true || qrSettings.weekly_scan_limit_enabled === true) ? Math.max(0, Math.floor(n(qrSettings.weekly_scan_limit_per_member ?? settings.weekly_scan_limit, 0))) : 0,
    daily_point_limit_per_member: Math.max(0, Math.floor(n(qrSettings.daily_point_limit_per_member ?? settings.daily_point_limit_per_member, 0))),
    weekly_point_limit_per_member: Math.max(0, Math.floor(n(qrSettings.weekly_point_limit_per_member ?? settings.metadata?.weekly_point_limit_per_member, 0))),
    reward_daily_limit: Math.max(0, Math.floor(n(reward.daily_limit, 0))),
    reward_weekly_limit: (reward.weekly_limit_enabled === true || reward.metadata?.weekly_limit_enabled === true) ? Math.max(0, Math.floor(n(reward.weekly_limit, 0))) : 0,
    reward_max_per_member: Math.max(0, Math.floor(n(reward.max_redemptions_per_member ?? reward.max_per_customer, 0))),
    require_rescan_for_points: qrSettings.require_rescan_for_points === true || settings.require_rescan_for_points === true || settings.metadata?.require_rescan_for_points === true
  }
}

module.exports = { normalizeLimitPolicy }
