import type { Point } from '@convex-dev/geospatial';
import { defineTable } from 'convex/server';
import { type Validator, v } from 'convex/values';
import { TripCoverValidators } from '#convex/modules/travel/covers/schema';
import { VersionDiff, VersionedModel } from '#convex/modules/travel/versions/fields/index';

const coordinates = v.object({
  latitude: v.number(),
  longitude: v.number()
}) satisfies Validator<Point, 'required', string>;

const namedDestination = v.object({
  countryCode: v.optional(v.string()),
  name: v.string(),
  status: v.literal('known')
});

const verifiedDestination = namedDestination.extend({
  coordinates,
  placeId: v.string()
});

const knownDestination = v.union(verifiedDestination, namedDestination);
const destinationSchedule = v.object({
  endDay: v.number(),
  startDay: v.number()
});

export const TripDestinationVersionModel = VersionedModel.define({
  attachments: VersionDiff.media(v.array(v.id('media')), 'Attachments'),
  coordinates: VersionDiff.hidden(coordinates, 'Coordinates'),
  countryCode: VersionDiff.hidden(v.optional(v.string()), 'Country code'),
  dayNotes: VersionDiff.text(v.optional(v.string()), 'Day notes'),
  name: VersionDiff.text(v.string(), 'Destination'),
  placeId: VersionDiff.hidden(v.string(), 'Place ID'),
  position: VersionDiff.hidden(v.number(), 'Position'),
  schedule: VersionDiff.schedule(v.optional(destinationSchedule), 'Days')
});

export const TripDestinationValidators = {
  coordinates,
  destination: v.union(knownDestination, v.object({ status: v.literal('undecided') })),
  knownDestination,
  schedule: destinationSchedule,
  stopInput: verifiedDestination.extend({
    dayNotes: v.optional(v.string()),
    schedule: v.optional(destinationSchedule)
  })
};

export const tripDestinationTables = {
  tripDestinations: defineTable({
    coordinates,
    countryCode: v.optional(v.string()),
    cover: v.optional(TripCoverValidators.cover),
    dayNotes: v.optional(v.string()),
    name: v.string(),
    placeId: v.string(),
    position: v.number(),
    schedule: v.optional(destinationSchedule),
    sourceId: v.optional(v.id('tripDestinations')),
    tripId: v.id('trips')
  })
    .index('by_tripId_and_position', ['tripId', 'position'])
    .index('by_tripId_and_placeId', ['tripId', 'placeId'])
};
