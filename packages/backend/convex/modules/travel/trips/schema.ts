import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { TripCoverValidators } from '#convex/modules/travel/covers/schema';
import { TripDestinationValidators } from '#convex/modules/travel/destinations/schema';
import { tripCostSplitValidator } from '#convex/modules/travel/trips/costs';
import { tripCurrencyValidator } from '#convex/modules/travel/trips/currencies';
import { VersionDiff, VersionedModel } from '#convex/modules/travel/versions/fields/index';
import { TripVersionValidators } from '#convex/modules/travel/versions/schema';

export { TRIP_CURRENCIES, tripCurrencyValidator } from '#convex/modules/travel/trips/currencies';

const currency = tripCurrencyValidator;

const budget = v.object({ amount: v.number() });
const cost = v.object({
  amount: v.number(),
  split: v.optional(tripCostSplitValidator)
});
const duration = v.object({
  idealDays: v.optional(v.number()),
  minimumDays: v.optional(v.number()),
  totalDays: v.optional(v.number())
});

const information = v.object({
  budget: v.optional(budget),
  coverStorageId: v.optional(v.id('_storage')),
  currency,
  dateNotes: v.optional(v.string()),
  destination: TripDestinationValidators.destination,
  duration: v.optional(duration),
  name: v.string(),
  startDate: v.optional(v.string())
});

export const TripVersionModel = VersionedModel.define({
  attachments: VersionDiff.media(v.array(v.id('media')), 'Attachments'),
  budget: VersionDiff.money(v.union(budget, v.null()), 'Total group budget'),
  cover: VersionDiff.media(v.union(TripCoverValidators.cover, v.null()), 'Cover'),
  currency: VersionDiff.text(currency, 'Currency'),
  dateNotes: VersionDiff.text(v.union(v.string(), v.null()), 'Date notes'),
  destination: VersionDiff.destination(TripDestinationValidators.destination, 'Destination'),
  duration: VersionDiff.duration(v.union(duration, v.null()), 'Duration'),
  name: VersionDiff.text(v.string(), 'Trip name'),
  startDate: VersionDiff.date(v.union(v.string(), v.null()), 'Start date')
});

export const tripRoleValidator = v.union(v.literal('organizer'), v.literal('participant'));

export const TripValidators = {
  budget,
  cost,
  createInput: information.extend({
    clientRequestId: v.string(),
    coverContentType: v.optional(v.string())
  }),
  currency,
  duration,
  information,
  role: tripRoleValidator,
  travelDates: {
    endDate: v.string(),
    startDate: v.string()
  },
  updateInput: information.omit('coverStorageId')
};

export const tripTables = {
  trips: defineTable({
    shortId: v.optional(v.string()),
    archive: v.optional(v.object({ at: v.number() })),
    budget: v.optional(budget),
    clientRequestId: v.string(),
    creationFingerprint: v.string(),
    cover: v.optional(TripCoverValidators.cover),
    creator: v.object({ userId: v.string() }),
    currency,
    dateNotes: v.optional(v.string()),
    destination: TripDestinationValidators.destination,
    duration: v.optional(duration),
    name: v.string(),
    organizationId: v.string(),
    proposal: v.optional(TripVersionValidators.proposalMetadata),
    startDate: v.optional(v.string()),
    updatedAt: v.number()
  })
    .index('by_shortId', ['shortId'])
    .index('by_organizationId_and_creator_userId_and_clientRequestId', [
      'organizationId',
      'creator.userId',
      'clientRequestId'
    ])
    .index('by_cover_asset_storageId', ['cover.asset.storageId'])
    .index('by_organizationId_and_proposal_sourceTripId_and_updatedAt', [
      'organizationId',
      'proposal.sourceTripId',
      'updatedAt'
    ])
    .index('by_organizationId_and_updatedAt', ['organizationId', 'updatedAt'])
};
