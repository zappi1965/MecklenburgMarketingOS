const { toolsForPackage } = require('./packageAccessService')

function evaluateToolAccessPolicy({ tool_key, row = null, package_name = 'Starter', security_blocked = false } = {}) {
  if (security_blocked) return { allowed: false, source: 'security_block', priority: 1, reason: 'Security Block' }
  if (row?.source === 'manual' || row?.metadata?.manual_override === true || row?.metadata?.locked === true) {
    return { allowed: row.enabled !== false, source: 'manual_override', priority: 2, reason: row.enabled === false ? 'Manuell gesperrt' : 'Manuell freigegeben' }
  }
  if (row?.source === 'trial' || row?.metadata?.trial === true) return { allowed: row.enabled !== false, source: 'trial', priority: 3, reason: 'Trial/Demo-Freigabe' }
  const packageTools = toolsForPackage(package_name)
  if (packageTools.includes(tool_key)) return { allowed: true, source: 'package_access', priority: 4, reason: `Im Paket ${package_name} enthalten` }
  if (row?.source === 'addon' || row?.metadata?.addon === true) return { allowed: row.enabled !== false, source: 'addon', priority: 5, reason: 'Add-on-Freigabe' }
  return { allowed: false, source: 'default_deny', priority: 6, reason: 'Nicht freigeschaltet' }
}

module.exports = { evaluateToolAccessPolicy }
