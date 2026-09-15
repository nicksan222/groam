import { v } from 'convex/values';
import { TripAuditValidators } from '#convex/modules/travel/audit/schema';
import { TripCoverValidators } from '#convex/modules/travel/covers/schema';
import { TripDestinationValidators } from '#convex/modules/travel/destinations/schema';
import { TripTransferValidators } from '#convex/modules/travel/transfers/schema';
import { tripCostSplitValidator } from '#convex/modules/travel/trips/costs';
import { tripQuery } from '#convex/modules/travel/trips/ctx';
import { getTrip } from '#convex/modules/travel/trips/index';
import { TripValidators } from '#convex/modules/travel/trips/schema';

const nullableNumber = v.union(v.number(), v.null());
const costFields = {
  costAmount: nullableNumber,
  costSplit: tripCostSplitValidator
};
const mediaAttachment = v.object({
  contentType: v.string(),
  id: v.id('media'),
  name: v.string(),
  size: v.number(),
  url: v.union(v.string(), v.null())
});
const transferTiming = v.union(
  v.object({
    endDay: v.number(),
    endTime: v.union(v.string(), v.null()),
    startDay: v.number(),
    startTime: v.string()
  }),
  v.null()
);
const boundaryTransfer = v.union(
  v.object({
    attachments: v.array(mediaAttachment),
    ...costFields,
    durationMinutes: nullableNumber,
    id: v.id('tripBoundaryTransfers'),
    sourceId: v.union(v.id('tripBoundaryTransfers'), v.null()),
    mode: TripTransferValidators.mode,
    notes: v.union(v.string(), v.null()),
    timing: transferTiming
  }),
  v.null()
);

export const tripDetailValidator = v.object({
  activity: v.array(
    v.object({
      actorName: v.string(),
      actorUserId: v.string(),
      createdAt: v.number(),
      id: v.id('tripAuditEvents'),
      message: v.string(),
      type: TripAuditValidators.eventType
    })
  ),
  archivedAt: nullableNumber,
  arrivalTransfer: boundaryTransfer,
  coverAttribution: v.union(
    v.object({
      creator: v.union(v.string(), v.null()),
      creatorUrl: v.union(v.string(), v.null()),
      license: v.string(),
      licenseUrl: v.string(),
      sourceName: v.string(),
      sourceUrl: v.string(),
      title: v.string()
    }),
    v.null()
  ),
  coverStatus: v.union(TripCoverValidators.status, v.null()),
  coverUrl: v.union(v.string(), v.null()),
  currency: TripValidators.currency,
  dateNotes: v.union(v.string(), v.null()),
  departureTransfer: boundaryTransfer,
  destination: TripDestinationValidators.destination,
  destinations: v.array(
    v.object({
      activities: v.array(
        v.object({
          address: v.union(v.string(), v.null()),
          attachments: v.array(mediaAttachment),
          ...costFields,
          dayNumber: v.number(),
          endDayNumber: v.number(),
          id: v.id('tripDestinationActivities'),
          notes: v.union(v.string(), v.null()),
          position: v.number(),
          sourceId: v.union(v.id('tripDestinationActivities'), v.null()),
          timeBlock: v.union(
            v.literal('full_day'),
            v.literal('morning'),
            v.literal('afternoon'),
            v.literal('evening')
          ),
          startTime: v.union(v.string(), v.null()),
          endTime: v.union(v.string(), v.null()),
          title: v.string(),
          transferToNext: v.union(
            v.object({
              attachments: v.array(mediaAttachment),
              ...costFields,
              durationMinutes: nullableNumber,
              id: v.id('tripActivityTransfers'),
              sourceId: v.union(v.id('tripActivityTransfers'), v.null()),
              mode: TripTransferValidators.mode,
              notes: v.union(v.string(), v.null()),
              timing: transferTiming,
              toActivityId: v.id('tripDestinationActivities')
            }),
            v.null()
          )
        })
      ),
      countryCode: v.optional(v.string()),
      coverStatus: v.union(TripCoverValidators.status, v.null()),
      coverUrl: v.union(v.string(), v.null()),
      dayNotes: v.union(v.string(), v.null()),
      endDay: nullableNumber,
      id: v.id('tripDestinations'),
      sourceId: v.union(v.id('tripDestinations'), v.null()),
      latitude: v.number(),
      longitude: v.number(),
      name: v.string(),
      placeId: v.string(),
      position: v.number(),
      startDay: nullableNumber,
      stays: v.array(
        v.object({
          address: v.union(v.string(), v.null()),
          attachments: v.array(mediaAttachment),
          checkInDay: v.number(),
          checkInTime: v.union(v.string(), v.null()),
          checkOutDay: v.number(),
          checkOutTime: v.union(v.string(), v.null()),
          ...costFields,
          id: v.id('tripDestinationStays'),
          sourceId: v.union(v.id('tripDestinationStays'), v.null()),
          notes: v.union(v.string(), v.null()),
          position: v.number(),
          title: v.string()
        })
      ),
      transferToNext: v.union(
        v.object({
          attachments: v.array(mediaAttachment),
          ...costFields,
          durationMinutes: nullableNumber,
          id: v.id('tripDestinationTransfers'),
          sourceId: v.union(v.id('tripDestinationTransfers'), v.null()),
          mode: TripTransferValidators.mode,
          notes: v.union(v.string(), v.null()),
          timing: transferTiming,
          toDestinationId: v.id('tripDestinations')
        }),
        v.null()
      )
    })
  ),
  id: v.id('trips'),
  idealDurationDays: nullableNumber,
  initialBudget: nullableNumber,
  lastUpdatedAt: v.number(),
  minimumDurationDays: nullableNumber,
  name: v.string(),
  permissions: v.object({
    canArchive: v.boolean(),
    canEdit: v.boolean(),
    canEditCover: v.boolean(),
    canPropose: v.boolean(),
    canRestore: v.boolean(),
    isReadOnly: v.boolean()
  }),
  proposal: v.union(
    v.object({
      author: v.object({ name: v.string(), userId: v.string() }),
      baseUpdatedAt: v.number(),
      ideaName: v.optional(v.string()),
      sourceTripId: v.id('trips'),
      status: v.union(
        v.literal('draft'),
        v.literal('in_review'),
        v.literal('conflicted'),
        v.literal('merged'),
        v.literal('closed')
      )
    }),
    v.null()
  ),
  role: TripValidators.role,
  startDate: v.union(v.string(), v.null()),
  totalDurationDays: nullableNumber,
  totalPlannedCost: v.number()
});

export const run = tripQuery({
  args: {},
  returns: tripDetailValidator,
  handler: (ctx) => getTrip(ctx, ctx.trip._id)
});
