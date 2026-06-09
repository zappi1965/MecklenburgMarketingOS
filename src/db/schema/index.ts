import { relations } from "drizzle-orm";
import {
  auditLog,
  consentRecords,
  tenants,
  tenantMemberships,
  tenantTools,
  userProfiles,
} from "./platform";
import {
  loyaltyCampaigns,
  loyaltyMembers,
  loyaltyPrograms,
  loyaltyRedemptions,
  loyaltyRewards,
  loyaltyTransactions,
  qrCodes,
  qrScans,
} from "./loyalty";
import {
  reviewInvitations,
  reviews,
  reviewSources,
} from "./reviews";
import { bookings, bookingServices, bookingSlots } from "./booking";
import {
  newsletterCampaigns,
  newsletterContacts,
  newsletterSends,
} from "./newsletter";
import { referralCodes, referralPrograms, referrals } from "./referral";
import { seoKeywords, seoProfiles, seoRankSnapshots } from "./seo";
import {
  surveyAnswers,
  surveyQuestions,
  surveyResponses,
  surveys,
} from "./survey";
import { giftCards, giftCardTransactions } from "./giftcard";

// --- Re-exports ------------------------------------------------------------

export * from "./platform";
export * from "./loyalty";
export * from "./reviews";
export * from "./booking";
export * from "./newsletter";
export * from "./referral";
export * from "./seo";
export * from "./survey";
export * from "./giftcard";

// --- Relations -------------------------------------------------------------

export const tenantsRelations = relations(tenants, ({ many }) => ({
  memberships: many(tenantMemberships),
  tools: many(tenantTools),
  loyaltyPrograms: many(loyaltyPrograms),
  reviews: many(reviews),
}));

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  memberships: many(tenantMemberships),
}));

export const tenantMembershipsRelations = relations(
  tenantMemberships,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [tenantMemberships.tenantId],
      references: [tenants.id],
    }),
    user: one(userProfiles, {
      fields: [tenantMemberships.userId],
      references: [userProfiles.id],
    }),
  }),
);

export const tenantToolsRelations = relations(tenantTools, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantTools.tenantId],
    references: [tenants.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLog.tenantId],
    references: [tenants.id],
  }),
}));

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  tenant: one(tenants, {
    fields: [consentRecords.tenantId],
    references: [tenants.id],
  }),
}));

// --- Loyalty relations -----------------------------------------------------

export const loyaltyProgramsRelations = relations(
  loyaltyPrograms,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [loyaltyPrograms.tenantId],
      references: [tenants.id],
    }),
    qrCodes: many(qrCodes),
    members: many(loyaltyMembers),
    rewards: many(loyaltyRewards),
    campaigns: many(loyaltyCampaigns),
  }),
);

export const loyaltyCampaignsRelations = relations(
  loyaltyCampaigns,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [loyaltyCampaigns.tenantId],
      references: [tenants.id],
    }),
    program: one(loyaltyPrograms, {
      fields: [loyaltyCampaigns.programId],
      references: [loyaltyPrograms.id],
    }),
  }),
);

export const qrCodesRelations = relations(qrCodes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [qrCodes.tenantId],
    references: [tenants.id],
  }),
  program: one(loyaltyPrograms, {
    fields: [qrCodes.programId],
    references: [loyaltyPrograms.id],
  }),
  scans: many(qrScans),
}));

export const loyaltyMembersRelations = relations(
  loyaltyMembers,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [loyaltyMembers.tenantId],
      references: [tenants.id],
    }),
    program: one(loyaltyPrograms, {
      fields: [loyaltyMembers.programId],
      references: [loyaltyPrograms.id],
    }),
    transactions: many(loyaltyTransactions),
    redemptions: many(loyaltyRedemptions),
  }),
);

export const qrScansRelations = relations(qrScans, ({ one }) => ({
  tenant: one(tenants, {
    fields: [qrScans.tenantId],
    references: [tenants.id],
  }),
  qrCode: one(qrCodes, {
    fields: [qrScans.qrCodeId],
    references: [qrCodes.id],
  }),
  member: one(loyaltyMembers, {
    fields: [qrScans.memberId],
    references: [loyaltyMembers.id],
  }),
}));

export const loyaltyTransactionsRelations = relations(
  loyaltyTransactions,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [loyaltyTransactions.tenantId],
      references: [tenants.id],
    }),
    member: one(loyaltyMembers, {
      fields: [loyaltyTransactions.memberId],
      references: [loyaltyMembers.id],
    }),
  }),
);

export const loyaltyRewardsRelations = relations(
  loyaltyRewards,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [loyaltyRewards.tenantId],
      references: [tenants.id],
    }),
    program: one(loyaltyPrograms, {
      fields: [loyaltyRewards.programId],
      references: [loyaltyPrograms.id],
    }),
    redemptions: many(loyaltyRedemptions),
  }),
);

export const loyaltyRedemptionsRelations = relations(
  loyaltyRedemptions,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [loyaltyRedemptions.tenantId],
      references: [tenants.id],
    }),
    member: one(loyaltyMembers, {
      fields: [loyaltyRedemptions.memberId],
      references: [loyaltyMembers.id],
    }),
    reward: one(loyaltyRewards, {
      fields: [loyaltyRedemptions.rewardId],
      references: [loyaltyRewards.id],
    }),
  }),
);

// --- Reviews relations -----------------------------------------------------

export const reviewSourcesRelations = relations(reviewSources, ({ one }) => ({
  tenant: one(tenants, {
    fields: [reviewSources.tenantId],
    references: [tenants.id],
  }),
}));

export const reviewInvitationsRelations = relations(
  reviewInvitations,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [reviewInvitations.tenantId],
      references: [tenants.id],
    }),
    reviews: many(reviews),
  }),
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  tenant: one(tenants, {
    fields: [reviews.tenantId],
    references: [tenants.id],
  }),
  invitation: one(reviewInvitations, {
    fields: [reviews.invitationId],
    references: [reviewInvitations.id],
  }),
}));

// --- Booking relations -----------------------------------------------------

export const bookingServicesRelations = relations(
  bookingServices,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [bookingServices.tenantId],
      references: [tenants.id],
    }),
    slots: many(bookingSlots),
  }),
);

export const bookingSlotsRelations = relations(
  bookingSlots,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [bookingSlots.tenantId],
      references: [tenants.id],
    }),
    service: one(bookingServices, {
      fields: [bookingSlots.serviceId],
      references: [bookingServices.id],
    }),
    bookings: many(bookings),
  }),
);

export const bookingsRelations = relations(bookings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [bookings.tenantId],
    references: [tenants.id],
  }),
  slot: one(bookingSlots, {
    fields: [bookings.slotId],
    references: [bookingSlots.id],
  }),
  service: one(bookingServices, {
    fields: [bookings.serviceId],
    references: [bookingServices.id],
  }),
}));

// --- Newsletter relations --------------------------------------------------

export const newsletterContactsRelations = relations(
  newsletterContacts,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [newsletterContacts.tenantId],
      references: [tenants.id],
    }),
  }),
);

export const newsletterCampaignsRelations = relations(
  newsletterCampaigns,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [newsletterCampaigns.tenantId],
      references: [tenants.id],
    }),
    sends: many(newsletterSends),
  }),
);

export const newsletterSendsRelations = relations(
  newsletterSends,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [newsletterSends.tenantId],
      references: [tenants.id],
    }),
    campaign: one(newsletterCampaigns, {
      fields: [newsletterSends.campaignId],
      references: [newsletterCampaigns.id],
    }),
    contact: one(newsletterContacts, {
      fields: [newsletterSends.contactId],
      references: [newsletterContacts.id],
    }),
  }),
);

// --- Referral relations ----------------------------------------------------

export const referralProgramsRelations = relations(
  referralPrograms,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [referralPrograms.tenantId],
      references: [tenants.id],
    }),
  }),
);

export const referralCodesRelations = relations(referralCodes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [referralCodes.tenantId],
    references: [tenants.id],
  }),
  member: one(loyaltyMembers, {
    fields: [referralCodes.memberId],
    references: [loyaltyMembers.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  tenant: one(tenants, {
    fields: [referrals.tenantId],
    references: [tenants.id],
  }),
  referrer: one(loyaltyMembers, {
    fields: [referrals.referrerMemberId],
    references: [loyaltyMembers.id],
  }),
  referee: one(loyaltyMembers, {
    fields: [referrals.refereeMemberId],
    references: [loyaltyMembers.id],
  }),
}));

// --- SEO relations ---------------------------------------------------------

export const seoProfilesRelations = relations(seoProfiles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [seoProfiles.tenantId],
    references: [tenants.id],
  }),
}));

export const seoKeywordsRelations = relations(seoKeywords, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [seoKeywords.tenantId],
    references: [tenants.id],
  }),
  snapshots: many(seoRankSnapshots),
}));

export const seoRankSnapshotsRelations = relations(
  seoRankSnapshots,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [seoRankSnapshots.tenantId],
      references: [tenants.id],
    }),
    keyword: one(seoKeywords, {
      fields: [seoRankSnapshots.keywordId],
      references: [seoKeywords.id],
    }),
  }),
);

// --- Survey relations ------------------------------------------------------

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [surveys.tenantId],
    references: [tenants.id],
  }),
  questions: many(surveyQuestions),
  responses: many(surveyResponses),
}));

export const surveyQuestionsRelations = relations(
  surveyQuestions,
  ({ one, many }) => ({
    survey: one(surveys, {
      fields: [surveyQuestions.surveyId],
      references: [surveys.id],
    }),
    answers: many(surveyAnswers),
  }),
);

export const surveyResponsesRelations = relations(
  surveyResponses,
  ({ one, many }) => ({
    survey: one(surveys, {
      fields: [surveyResponses.surveyId],
      references: [surveys.id],
    }),
    answers: many(surveyAnswers),
  }),
);

export const surveyAnswersRelations = relations(surveyAnswers, ({ one }) => ({
  response: one(surveyResponses, {
    fields: [surveyAnswers.responseId],
    references: [surveyResponses.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyAnswers.questionId],
    references: [surveyQuestions.id],
  }),
}));

// --- Gift card relations ---------------------------------------------------

export const giftCardsRelations = relations(giftCards, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [giftCards.tenantId],
    references: [tenants.id],
  }),
  transactions: many(giftCardTransactions),
}));

export const giftCardTransactionsRelations = relations(
  giftCardTransactions,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [giftCardTransactions.tenantId],
      references: [tenants.id],
    }),
    giftCard: one(giftCards, {
      fields: [giftCardTransactions.giftCardId],
      references: [giftCards.id],
    }),
  }),
);
