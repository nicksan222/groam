import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const onboardingTables = {
  // Kept when the example group is renamed or deleted: onboarding never restores edits.
  userDemos: defineTable({ userId: v.string(), organizationId: v.string() }).index('by_userId', [
    'userId'
  ])
};
