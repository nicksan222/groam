import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { TripValidators } from '#convex/modules/travel/trips/schema';
import { VersionDiff, VersionedModel } from '#convex/modules/travel/versions/fields/index';

const mode = v.union(
  v.literal('walk'),
  v.literal('bicycle'),
  v.literal('car'),
  v.literal('rideshare'),
  v.literal('taxi'),
  v.literal('public_transit'),
  v.literal('bus'),
  v.literal('train'),
  v.literal('flight'),
  v.literal('ferry'),
  v.literal('shuttle'),
  v.literal('other')
);

const boundary = v.union(v.literal('arrival'), v.literal('departure'));
const duration = v.object({ minutes: v.number() });
const timing = v.object({
  endDay: v.optional(v.number()),
  endTime: v.optional(v.string()),
  startDay: v.number(),
  startTime: v.string()
});

export const TripTransferVersionModel = VersionedModel.define({
  attachments: VersionDiff.media(v.array(v.id('media')), 'Attachments'),
  boundary: VersionDiff.text(v.optional(boundary), 'Journey'),
  cost: VersionDiff.money(v.optional(TripValidators.cost), 'Cost'),
  duration: VersionDiff.duration(v.optional(duration), 'Duration'),
  fromActivityKey: VersionDiff.hidden(v.optional(v.string()), 'From activity reference'),
  fromDestinationKey: VersionDiff.hidden(v.optional(v.string()), 'From destination reference'),
  mode: VersionDiff.travelMode(mode, 'Travel mode'),
  notes: VersionDiff.text(v.optional(v.string()), 'Notes'),
  timing: VersionDiff.schedule(v.optional(timing), 'Timing'),
  toActivityKey: VersionDiff.hidden(v.optional(v.string()), 'To activity reference'),
  toDestinationKey: VersionDiff.hidden(v.optional(v.string()), 'To destination reference')
});

export const TripTransferValidators = {
  boundary,
  duration,
  input: v.object({
    attachmentIds: v.optional(v.array(v.id('media'))),
    cost: v.optional(TripValidators.cost),
    duration: v.optional(duration),
    mode,
    notes: v.optional(v.string()),
    timing: v.optional(timing)
  }),
  mode
};

export const tripTransferTables = {
  tripActivityTransfers: defineTable({
    cost: v.optional(TripValidators.cost),
    destinationId: v.id('tripDestinations'),
    duration: v.optional(duration),
    fromActivityId: v.id('tripDestinationActivities'),
    mode,
    notes: v.optional(v.string()),
    sourceId: v.optional(v.id('tripActivityTransfers')),
    timing: v.optional(timing),
    toActivityId: v.id('tripDestinationActivities'),
    tripId: v.id('trips')
  })
    .index('by_tripId_and_fromActivityId', ['tripId', 'fromActivityId'])
    .index('by_tripId_and_toActivityId', ['tripId', 'toActivityId'])
    .index('by_destinationId', ['destinationId']),
  tripBoundaryTransfers: defineTable({
    boundary,
    cost: v.optional(TripValidators.cost),
    duration: v.optional(duration),
    mode,
    notes: v.optional(v.string()),
    sourceId: v.optional(v.id('tripBoundaryTransfers')),
    timing: v.optional(timing),
    tripId: v.id('trips')
  }).index('by_tripId_and_boundary', ['tripId', 'boundary']),
  tripDestinationTransfers: defineTable({
    cost: v.optional(TripValidators.cost),
    duration: v.optional(duration),
    fromDestinationId: v.id('tripDestinations'),
    mode,
    notes: v.optional(v.string()),
    sourceId: v.optional(v.id('tripDestinationTransfers')),
    timing: v.optional(timing),
    toDestinationId: v.id('tripDestinations'),
    tripId: v.id('trips')
  })
    .index('by_tripId_and_fromDestinationId', ['tripId', 'fromDestinationId'])
    .index('by_tripId_and_toDestinationId', ['tripId', 'toDestinationId'])
};
