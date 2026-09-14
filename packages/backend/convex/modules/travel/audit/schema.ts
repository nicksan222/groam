import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const eventType = v.union(
  v.literal('destination_added'),
  v.literal('destination_removed'),
  v.literal('destination_updated'),
  v.literal('itinerary_activity_added'),
  v.literal('itinerary_activity_removed'),
  v.literal('itinerary_activity_updated'),
  v.literal('stay_added'),
  v.literal('stay_removed'),
  v.literal('stay_updated'),
  v.literal('activity_transfer_updated'),
  v.literal('activity_transfer_removed'),
  v.literal('boundary_transfer_updated'),
  v.literal('boundary_transfer_removed'),
  v.literal('destination_transfer_updated'),
  v.literal('destination_transfer_removed'),
  v.literal('member_role_updated'),
  v.literal('trip_created'),
  v.literal('cover_updated'),
  v.literal('details_updated'),
  v.literal('trip_archived'),
  v.literal('trip_restored'),
  v.literal('proposed_version_created'),
  v.literal('proposed_version_merged')
);

const actor = v.object({
  name: v.string(),
  userId: v.string()
});

export const TripAuditValidators = { actor, eventType };

export const tripAuditTables = {
  tripAuditEvents: defineTable({
    actor,
    message: v.string(),
    tripId: v.id('trips'),
    type: eventType
  }).index('by_tripId', ['tripId'])
};
