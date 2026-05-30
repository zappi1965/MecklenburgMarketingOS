export type MiniAuditStatus = 'kritisch' | 'bedingt' | 'stark'
export type MiniAuditLevel = 'gering' | 'mittel' | 'mittel bis hoch' | 'hoch'

export type BadgeStyle = {
  label: string
  background: string
  border: string
  text: string
  dot?: string
}

export const miniAuditBadgeLibrary = {
  version: '3.0-google-only',
  mode: 'internal-style-resolver-no-manual-selection',
  status: {
    kritisch: {
      label: 'kritisch',
      background: '#FCE7EE',
      border: '#E11D48',
      text: '#BE123C',
      dot: '#E11D48'
    },
    bedingt: {
      label: 'bedingt',
      background: '#FEF3C7',
      border: '#F59E0B',
      text: '#92400E',
      dot: '#F59E0B'
    },
    stark: {
      label: 'stark',
      background: '#D1FAE5',
      border: '#10B981',
      text: '#065F46',
      dot: '#10B981'
    }
  } satisfies Record<MiniAuditStatus, BadgeStyle>,
  level: {
    gering: {
      label: 'gering',
      background: '#EAF8F1',
      border: '#10B981',
      text: '#065F46'
    },
    mittel: {
      label: 'mittel',
      background: '#FEF3C7',
      border: '#F59E0B',
      text: '#92400E'
    },
    'mittel bis hoch': {
      label: 'mittel bis hoch',
      background: '#EDE9FE',
      border: '#7C3AED',
      text: '#5B21B6'
    },
    hoch: {
      label: 'hoch',
      background: '#D1FAE5',
      border: '#10B981',
      text: '#065F46'
    }
  } satisfies Record<MiniAuditLevel, BadgeStyle>,
  shapeConventions: {
    statusBadges: ['KC1_STATUS_BADGE', 'KC2_STATUS_BADGE', 'KC3_STATUS_BADGE', 'KC4_STATUS_BADGE', 'KC5_STATUS_BADGE', 'KC6_STATUS_BADGE', 'KC7_STATUS_BADGE'],
    statusDots: ['KC1_STATUS_DOT', 'KC2_STATUS_DOT', 'KC3_STATUS_DOT', 'KC4_STATUS_DOT', 'KC5_STATUS_DOT', 'KC6_STATUS_DOT', 'KC7_STATUS_DOT', 'OVERALL_STATUS_DOT'],
    effortBadges: ['M1_EFFORT_BADGE', 'M2_EFFORT_BADGE', 'M3_EFFORT_BADGE', 'M4_EFFORT_BADGE', 'M5_EFFORT_BADGE', 'M6_EFFORT_BADGE'],
    impactBadges: ['M1_IMPACT_BADGE', 'M2_IMPACT_BADGE', 'M3_IMPACT_BADGE', 'M4_IMPACT_BADGE', 'M5_IMPACT_BADGE', 'M6_IMPACT_BADGE']
  }
} as const

export function resolveStatusBadge(status: string): BadgeStyle {
  const key = normalizeStatus(status)
  return miniAuditBadgeLibrary.status[key]
}

export function resolveLevelBadge(level: string): BadgeStyle {
  const key = normalizeLevel(level)
  return miniAuditBadgeLibrary.level[key]
}

export function normalizeStatus(status: string): MiniAuditStatus {
  const value = String(status || '').toLowerCase().trim()
  if (value === 'stark' || value === 'gut' || value === 'gruen' || value === 'grün') return 'stark'
  if (value === 'bedingt' || value === 'mittel' || value === 'gelb' || value === 'orange') return 'bedingt'
  return 'kritisch'
}

export function normalizeLevel(level: string): MiniAuditLevel {
  const value = String(level || '').toLowerCase().trim()
  if (value === 'hoch') return 'hoch'
  if (value === 'mittel bis hoch' || value === 'mittel-hoch') return 'mittel bis hoch'
  if (value === 'mittel') return 'mittel'
  return 'gering'
}

export default miniAuditBadgeLibrary
