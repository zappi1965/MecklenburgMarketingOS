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

// --- Re-exports ------------------------------------------------------------

export * from "./platform";
export * from "./loyalty";
export * from "./reviews";

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
