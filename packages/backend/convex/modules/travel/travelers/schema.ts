import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const status = v.union(
  v.literal('going'),
  v.literal('invited'),
  v.literal('maybe'),
  v.literal('not_going')
);

const traveler = v.object({
  email: v.union(v.string(), v.null()),
  id: v.string(),
  image: v.union(v.string(), v.null()),
  invitationId: v.union(v.string(), v.null()),
  name: v.string(),
  status,
  userId: v.string()
});

export const TripTravelerValidators = {
  status,
  traveler
};

export const tripTravelerTables = {
  tripTravelers: defineTable({
    email: v.optional(v.string()),
    invitationId: v.optional(v.string()),
    name: v.string(),
    organizationId: v.string(),
    status,
    tripId: v.id('trips'),
    userId: v.optional(v.string()),
    updatedAt: v.number()
  })
    .index('by_tripId', ['tripId'])
    .index('by_tripId_and_userId', ['tripId', 'userId'])
    .index('by_invitationId', ['invitationId'])
};
