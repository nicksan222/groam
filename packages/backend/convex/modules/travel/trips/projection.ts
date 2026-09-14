import { Attachments } from '#convex/modules/media/attachments/index';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { TripStay } from '#convex/modules/travel/stays/index';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import { TripTravelers } from '#convex/modules/travel/travelers/index';
import {
  plannedCostAmount,
  type TripCostSplit,
  tripCostSplit
} from '#convex/modules/travel/trips/costs';
import {
  MAX_ACTIVITY_ITEMS,
  nextActionFor,
  type TripQueryCtx,
  tripPermissions,
  totalDays as tripTotalDays
} from '#convex/modules/travel/trips/ctx';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { QueryCtx } from '#convex-generated/server';

export async function projectTripListItem(
  ctx: QueryCtx,
  data: Doc<'trips'>,
  favoriteIds: Set<Id<'trips'>>
) {
  const coverStorageId =
    data.cover && 'asset' in data.cover ? data.cover.asset?.storageId : undefined;
  return {
    archivedAt: data.archive?.at ?? null,
    coverUrl: coverStorageId ? await ctx.storage.getUrl(coverStorageId) : null,
    dateNotes: data.dateNotes ?? null,
    destination: data.destination.status === 'known' ? data.destination.name : null,
    favorite: favoriteIds.has(data._id),
    id: data._id,
    ...(data.shortId ? { shortId: data.shortId } : {}),
    lastUpdatedAt: data.updatedAt,
    name: data.name,
    ...nextActionFor(data)
  };
}

type AttachmentRow = Awaited<ReturnType<typeof Attachments.forTrip>>[number];

type AttachmentProjection = Awaited<ReturnType<typeof createAttachmentProjection>>;

async function createAttachmentProjection(
  ctx: QueryCtx,
  rows: AttachmentRow[],
  organizationId: string
) {
  const mediaIds = [...new Set(rows.map((attachment) => attachment.mediaId))];
  const media = await Promise.all(mediaIds.map((mediaId) => ctx.db.get('media', mediaId)));
  const mediaWithUrls = await Promise.all(
    media.flatMap((item) =>
      item && item.organizationId === organizationId
        ? [
            (async () => ({
              ...item,
              url: await ctx.storage.getUrl(item.storageId)
            }))()
          ]
        : []
    )
  );
  const mediaById = new Map(mediaWithUrls.map((item) => [item._id, item] as const));
  return {
    forTarget: (type: string, id: string) =>
      rows.filter((attachment) => attachment.target.type === type && attachment.target.id === id),
    project: (attachments: AttachmentRow[]) =>
      attachments
        .slice()
        .sort((left, right) => left.position - right.position)
        .flatMap((attachment) => {
          const item = mediaById.get(attachment.mediaId);
          return item
            ? [
                {
                  contentType: item.contentType,
                  id: item._id,
                  name: item.name,
                  size: item.size,
                  url: item.url
                }
              ]
            : [];
        })
  };
}

function projectCost(cost: { amount: number; split?: TripCostSplit } | undefined) {
  return {
    costAmount: cost?.amount ?? null,
    costSplit: tripCostSplit(cost?.split)
  };
}

function projectTransferTiming(
  timing: { endDay?: number; endTime?: string; startDay: number; startTime: string } | undefined
) {
  return timing
    ? {
        endDay: timing.endDay ?? timing.startDay,
        endTime: timing.endTime ?? null,
        startDay: timing.startDay,
        startTime: timing.startTime
      }
    : null;
}

function projectBoundaryTransfer(
  boundary: 'arrival' | 'departure',
  transfers: Doc<'tripBoundaryTransfers'>[],
  attachments: AttachmentProjection
) {
  const transfer = transfers.find((item) => item.boundary === boundary);
  return transfer
    ? {
        attachments: attachments.project(attachments.forTarget('boundary_transfer', transfer._id)),
        ...projectCost(transfer.cost),
        durationMinutes: transfer.duration?.minutes ?? null,
        id: transfer._id,
        sourceId: transfer.sourceId ?? null,
        mode: transfer.mode,
        notes: transfer.notes ?? null,
        timing: projectTransferTiming(transfer.timing)
      }
    : null;
}

function projectTripDestinations(
  ctx: QueryCtx,
  destinations: Doc<'tripDestinations'>[],
  itineraryActivities: Doc<'tripDestinationActivities'>[],
  stays: Doc<'tripDestinationStays'>[],
  destinationTransfers: Doc<'tripDestinationTransfers'>[],
  activityTransfers: Doc<'tripActivityTransfers'>[],
  attachments: AttachmentProjection
) {
  return Promise.all(
    destinations.map(async (destination) => {
      const destinationTransfer = destinationTransfers.find(
        (transfer) => transfer.fromDestinationId === destination._id
      );
      const coverStorageId =
        destination.cover && 'asset' in destination.cover
          ? destination.cover.asset?.storageId
          : undefined;
      const activities = itineraryActivities
        .filter((activity) => activity.destinationId === destination._id)
        .sort((left, right) => left.position - right.position)
        .map((activity) => {
          const transfer = activityTransfers.find((item) => item.fromActivityId === activity._id);
          return {
            address: activity.address ?? null,
            attachments: attachments.project(attachments.forTarget('activity', activity._id)),
            ...projectCost(activity.cost),
            dayNumber: activity.schedule.day,
            endDayNumber: activity.schedule.endDay ?? activity.schedule.day,
            endTime: activity.schedule.endTime ?? null,
            id: activity._id,
            sourceId: activity.sourceId ?? null,
            notes: activity.notes ?? null,
            position: activity.position,
            startTime: activity.schedule.startTime ?? null,
            timeBlock: activity.schedule.timeBlock,
            title: activity.title,
            transferToNext: transfer
              ? {
                  attachments: attachments.project(
                    attachments.forTarget('activity_transfer', transfer._id)
                  ),
                  ...projectCost(transfer.cost),
                  durationMinutes: transfer.duration?.minutes ?? null,
                  id: transfer._id,
                  sourceId: transfer.sourceId ?? null,
                  mode: transfer.mode,
                  notes: transfer.notes ?? null,
                  timing: projectTransferTiming(transfer.timing),
                  toActivityId: transfer.toActivityId
                }
              : null
          };
        });
      return {
        activities,
        ...(destination.countryCode ? { countryCode: destination.countryCode } : {}),
        coverStatus: destination.cover?.status ?? null,
        coverUrl: coverStorageId ? await ctx.storage.getUrl(coverStorageId) : null,
        dayNotes: destination.dayNotes ?? null,
        endDay: destination.schedule?.endDay ?? null,
        id: destination._id,
        sourceId: destination.sourceId ?? null,
        latitude: destination.coordinates.latitude,
        longitude: destination.coordinates.longitude,
        name: destination.name,
        placeId: destination.placeId,
        position: destination.position,
        startDay: destination.schedule?.startDay ?? null,
        stays: stays
          .filter((stay) => stay.destinationId === destination._id)
          .sort((left, right) => left.position - right.position)
          .map((stay) => ({
            address: stay.address ?? null,
            attachments: attachments.project(attachments.forTarget('stay', stay._id)),
            checkInDay: stay.schedule.checkInDay,
            checkInTime: stay.schedule.checkInTime ?? null,
            checkOutDay: stay.schedule.checkOutDay,
            checkOutTime: stay.schedule.checkOutTime ?? null,
            ...projectCost(stay.cost),
            id: stay._id,
            sourceId: stay.sourceId ?? null,
            notes: stay.notes ?? null,
            position: stay.position,
            title: stay.title
          })),
        transferToNext: destinationTransfer
          ? {
              attachments: attachments.project(
                attachments.forTarget('destination_transfer', destinationTransfer._id)
              ),
              ...projectCost(destinationTransfer.cost),
              durationMinutes: destinationTransfer.duration?.minutes ?? null,
              id: destinationTransfer._id,
              sourceId: destinationTransfer.sourceId ?? null,
              mode: destinationTransfer.mode,
              notes: destinationTransfer.notes ?? null,
              timing: projectTransferTiming(destinationTransfer.timing),
              toDestinationId: destinationTransfer.toDestinationId
            }
          : null
      };
    })
  );
}

async function projectCover(ctx: QueryCtx, trip: TripQueryCtx) {
  const cover = trip.trip.cover;
  const asset = cover && 'asset' in cover ? cover.asset : undefined;
  const attribution = asset?.source === 'stock' ? asset.attribution : undefined;
  return {
    attribution: attribution
      ? {
          creator: attribution.creator ?? null,
          creatorUrl: attribution.creatorUrl ?? null,
          license: attribution.license,
          licenseUrl: attribution.licenseUrl,
          sourceName: attribution.sourceName,
          sourceUrl: attribution.sourceUrl,
          title: attribution.title
        }
      : null,
    url: asset ? await ctx.storage.getUrl(asset.storageId) : null
  };
}

function projectedDuration(
  trip: TripQueryCtx,
  destinations: Doc<'tripDestinations'>[],
  activities: Doc<'tripDestinationActivities'>[],
  stays: Doc<'tripDestinationStays'>[],
  transfers: Array<{
    timing?: { endDay?: number; endTime?: string; startDay: number; startTime: string };
  }>
) {
  return (
    (tripTotalDays(trip) ??
      Math.max(
        0,
        ...destinations.flatMap((destination) => [
          destination.schedule?.startDay ?? 0,
          destination.schedule?.endDay ?? 0
        ]),
        ...activities.map((activity) => activity.schedule.endDay ?? activity.schedule.day),
        ...stays.map((stay) => stay.schedule.checkOutDay),
        ...transfers.map((transfer) => transfer.timing?.endDay ?? transfer.timing?.startDay ?? 0)
      )) ||
    null
  );
}

export async function projectTrip(ctx: QueryCtx, trip: TripQueryCtx) {
  const tripId = trip.trip._id;
  const [
    activity,
    destinations,
    itineraryActivities,
    stays,
    attachmentRows,
    boundaryTransfers,
    destinationTransfers,
    activityTransfers
  ] = await Promise.all([
    ctx.db
      .query('tripAuditEvents')
      .withIndex('by_tripId', (query) => query.eq('tripId', tripId))
      .order('desc')
      .take(MAX_ACTIVITY_ITEMS),
    TripDestination.forTrip(ctx, tripId),
    ItineraryActivity.forTrip(ctx, tripId),
    TripStay.forTrip(ctx, tripId),
    Attachments.forTrip(ctx, tripId),
    TripTransfer.boundaryForTrip(ctx, tripId),
    TripTransfer.destinationForTrip(ctx, tripId),
    TripTransfer.activityForTrip(ctx, tripId)
  ]);
  const [attachments, cover, travelerCount] = await Promise.all([
    createAttachmentProjection(ctx, attachmentRows, trip.workspace.organizationId),
    projectCover(ctx, trip),
    TripTravelers.goingCount(trip)
  ]);
  const totalPlannedCost = [
    ...itineraryActivities,
    ...stays,
    ...boundaryTransfers,
    ...destinationTransfers,
    ...activityTransfers
  ].reduce((total, item) => total + plannedCostAmount(item.cost, travelerCount), 0);

  return {
    activity: activity.map((item) => ({
      actorName: item.actor.name,
      actorUserId: item.actor.userId,
      createdAt: item._creationTime,
      id: item._id,
      message: item.message,
      type: item.type
    })),
    archivedAt: trip.trip.archive?.at ?? null,
    arrivalTransfer: projectBoundaryTransfer('arrival', boundaryTransfers, attachments),
    coverAttribution: cover.attribution,
    coverStatus: trip.trip.cover?.status ?? null,
    coverUrl: cover.url,
    currency: trip.trip.currency,
    dateNotes: trip.trip.dateNotes ?? null,
    departureTransfer: projectBoundaryTransfer('departure', boundaryTransfers, attachments),
    destination: trip.trip.destination,
    destinations: await projectTripDestinations(
      ctx,
      destinations,
      itineraryActivities,
      stays,
      destinationTransfers,
      activityTransfers,
      attachments
    ),
    id: trip.trip._id,
    idealDurationDays: trip.trip.duration?.idealDays ?? null,
    initialBudget: trip.trip.budget?.amount ?? null,
    lastUpdatedAt: trip.trip.updatedAt,
    minimumDurationDays: trip.trip.duration?.minimumDays ?? null,
    name: trip.trip.name,
    permissions: tripPermissions(trip),
    proposal: trip.trip.proposal
      ? {
          author: trip.trip.proposal.author,
          baseUpdatedAt: trip.trip.proposal.baseUpdatedAt,
          ideaName: trip.trip.proposal.branchName,
          sourceTripId: trip.trip.proposal.sourceTripId,
          status: trip.trip.proposal.status
        }
      : null,
    role: trip.role,
    startDate: trip.trip.startDate ?? null,
    totalDurationDays: projectedDuration(trip, destinations, itineraryActivities, stays, [
      ...boundaryTransfers,
      ...destinationTransfers,
      ...activityTransfers
    ]),
    totalPlannedCost
  };
}
