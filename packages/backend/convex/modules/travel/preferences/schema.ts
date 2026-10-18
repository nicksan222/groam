import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const tripPreferenceTables = {
  tripPreferences: defineTable({
    favorite: v.boolean(),
    organizationId: v.string(),
    tripId: v.id('trips'),
    updatedAt: v.number(),
    userId: v.string()
  })
    .index('by_tripId_and_userId', ['tripId', 'userId'])
    .index('by_organizationId_and_userId', ['organizationId', 'userId'])
};
