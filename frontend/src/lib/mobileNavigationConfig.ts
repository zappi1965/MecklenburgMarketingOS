
export type EnterpriseNavSection = {
  key: string
  label: string
  icon?: string
  children?: string[]
  mobilePriority?: number
}

export const mobileBreakpoints = {
  phone: 620,
  tablet: 820,
  desktop: 1100
}

export function getBottomNavItems(sections: EnterpriseNavSection[]) {
  return [...sections]
    .sort((a, b) => (a.mobilePriority || 99) - (b.mobilePriority || 99))
    .slice(0, 5)
}
