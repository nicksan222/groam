import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { ItineraryFields } from '#convex/modules/travel/trips/itinerary/fields';
import { TripValidators } from '#convex/modules/travel/trips/schema';
import { VersionDiff, VersionedModel } from '#convex/modules/travel/versions/fields/index';

const schedule = v.object({
  checkInDay: v.number(),
  checkInTime: v.optional(v.string()),
  checkOutDay: v.number(),
  checkOutTime: v.optional(v.string())
});

const input = v.object({
  address: v.optional(v.string()),
  attachmentIds: v.optional(v.array(v.id('media'))),
  cost: v.optional(TripValidators.cost),
  notes: v.optional(v.string()),
  schedule,
  title: v.string()
});

export const TripStayVersionModel = VersionedModel.define({
  address: VersionDiff.text(v.optional(v.string()), 'Address'),
  attachments: VersionDiff.media(v.array(v.id('media')), 'Attachments'),
  cost: VersionDiff.money(v.optional(TripValidators.cost), 'Cost'),
  destinationKey: VersionDiff.hidden(v.string(), 'Destination reference'),
  notes: VersionDiff.text(v.optional(v.string()), 'Notes'),
  position: VersionDiff.hidden(v.number(), 'Position'),
  schedule: VersionDiff.schedule(schedule, 'Stay dates'),
  title: VersionDiff.text(v.string(), 'Stay')
});

export const TripStayValidators = {
  addArgs: {
    destinationId: v.id('tripDestinations'),
    input
  },
  input,
  schedule
};

export const tripStayTables = {
  tripDestinationStays: defineTable({
    ...ItineraryFields.element(schedule),
    sourceId: v.optional(v.id('tripDestinationStays'))
  })
    .index('by_tripId_and_position', ['tripId', 'position'])
    .index('by_destinationId_and_position', ['destinationId', 'position'])
};
