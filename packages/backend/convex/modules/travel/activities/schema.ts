import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { TRIP_TIME_BLOCKS } from '#convex/modules/travel/activities/timeblocks';
import { TripDestinationValidators } from '#convex/modules/travel/destinations/schema';
import { ItineraryFields } from '#convex/modules/travel/trips/itinerary/fields';
import { TripValidators } from '#convex/modules/travel/trips/schema';
import { VersionDiff, VersionedModel } from '#convex/modules/travel/versions/fields/index';

export { TRIP_TIME_BLOCKS } from '#convex/modules/travel/activities/timeblocks';

const timeBlock = v.union(
  v.literal(TRIP_TIME_BLOCKS[0]),
  v.literal(TRIP_TIME_BLOCKS[1]),
  v.literal(TRIP_TIME_BLOCKS[2]),
  v.literal(TRIP_TIME_BLOCKS[3])
);

const schedule = v.object({
  day: v.number(),
  endDay: v.optional(v.number()),
  endTime: v.optional(v.string()),
  startTime: v.optional(v.string()),
  timeBlock
});

const input = v.object({
  address: v.optional(v.string()),
  attachmentIds: v.optional(v.array(v.id('media'))),
  coordinates: v.optional(TripDestinationValidators.coordinates),
  cost: v.optional(TripValidators.cost),
  notes: v.optional(v.string()),
  schedule,
  title: v.string()
});

export const TripActivityVersionModel = VersionedModel.define({
  address: VersionDiff.text(v.optional(v.string()), 'Address'),
  attachments: VersionDiff.media(v.array(v.id('media')), 'Attachments'),
  coordinates: VersionDiff.hidden(v.optional(TripDestinationValidators.coordinates), 'Coordinates'),
  cost: VersionDiff.money(v.optional(TripValidators.cost), 'Cost'),
  destinationKey: VersionDiff.hidden(v.string(), 'Destination reference'),
  notes: VersionDiff.text(v.optional(v.string()), 'Notes'),
  position: VersionDiff.hidden(v.number(), 'Position'),
  schedule: VersionDiff.schedule(schedule, 'Schedule'),
  title: VersionDiff.text(v.string(), 'Activity')
});

export const TripActivityValidators = {
  addArgs: {
    destinationId: v.id('tripDestinations'),
    input
  },
  input,
  schedule,
  timeBlock
};

export const tripActivityTables = {
  tripDestinationActivities: defineTable({
    ...ItineraryFields.element(schedule),
    coordinates: v.optional(TripDestinationValidators.coordinates),
    sourceId: v.optional(v.id('tripDestinationActivities'))
  })
    .index('by_tripId_and_position', ['tripId', 'position'])
    .index('by_destinationId_and_position', ['destinationId', 'position'])
};
