export const miniAuditTemplateManifest = {
  version: '3.0-google-only',
  name: 'MMOS Mini Audit Generator',
  auditMode: 'mini_google_only',
  dataSources: ['google_public_place_data'],
  excludedSources: ['mmos_customer_data', 'qr_campaigns', 'loyalty', 'internal_reviews', 'crm'],
  generator: 'frontend/src/lib/mini-audit/pptxBuilder.ts',
  apiRoutes: {
    googleLookup: '/api/mini-audit/google-place',
    pptxExport: '/api/mini-audit/generate-pptx'
  },
  uiRoute: '/admin/sales/mini-audit-generator',
  placeholders: {
    '{{CLIENT_NAME}}': 'clientName',
    '{{BRANCH}}': 'branch',
    '{{LOCATION}}': 'location',
    '{{AUDIT_DATE}}': 'auditDate',
    '{{OVERALL_STATUS}}': 'overallStatus',
    '{{OVERALL_SUMMARY}}': 'overallSummary',
    '{{AVG_RATING}}': 'publicSignals.rating',
    '{{REVIEWS_COUNT}}': 'publicSignals.reviewCount',
    '{{PHOTOS_COUNT}}': 'publicSignals.photosCount',
    '{{KC1_STATUS}}': 'quickCheck.0.status',
    '{{KC1_NOTE}}': 'quickCheck.0.note',
    '{{KC2_STATUS}}': 'quickCheck.1.status',
    '{{KC2_NOTE}}': 'quickCheck.1.note',
    '{{KC3_STATUS}}': 'quickCheck.2.status',
    '{{KC3_NOTE}}': 'quickCheck.2.note',
    '{{KC4_STATUS}}': 'quickCheck.3.status',
    '{{KC4_NOTE}}': 'quickCheck.3.note',
    '{{KC5_STATUS}}': 'quickCheck.4.status',
    '{{KC5_NOTE}}': 'quickCheck.4.note',
    '{{KC6_STATUS}}': 'quickCheck.5.status',
    '{{KC6_NOTE}}': 'quickCheck.5.note',
    '{{KC7_STATUS}}': 'quickCheck.6.status',
    '{{KC7_NOTE}}': 'quickCheck.6.note',
    '{{NEXT_STEP_CTA}}': 'nextStepCta'
  }
} as const

export default miniAuditTemplateManifest
