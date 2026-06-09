import type { MiniAuditLevel, MiniAuditStatus } from './badgeLibrary'

export type GoogleReviewSignal = {
  rating?: number
  text?: string
  relativeTime?: string
  author?: string
}

export type GooglePlacePublicData = {
  placeId?: string
  clientName: string
  branch?: string
  location?: string
  address?: string
  rating?: number
  reviewCount?: number
  photosCount?: number
  website?: string
  phone?: string
  businessStatus?: string
  categories?: string[]
  openingHoursAvailable?: boolean
  reviews?: GoogleReviewSignal[]
  raw?: unknown
}

export type MiniAuditQuickCheckItem = {
  key: string
  area: string
  status: MiniAuditStatus
  note: string
  source: 'google_public'
}

export type MiniAuditChance = {
  title: string
  text: string
  recommendation: string
}

export type MiniAuditMeasure = {
  title: string
  effort: MiniAuditLevel
  impact: MiniAuditLevel
}

export type MiniAuditResult = {
  auditMode: 'mini_google_only'
  clientName: string
  branch: string
  location: string
  address?: string
  auditDate: string
  overallStatus: MiniAuditStatus
  overallSummary: string
  publicSignals: {
    rating: number | null
    reviewCount: number | null
    photosCount: number | null
    openingHoursAvailable: boolean
    websiteAvailable: boolean
    phoneAvailable: boolean
    categoriesAvailable: boolean
  }
  quickCheck: MiniAuditQuickCheckItem[]
  chances: MiniAuditChance[]
  measures: MiniAuditMeasure[]
  potential: string[]
  nextStepCta: string
  score: number
}
