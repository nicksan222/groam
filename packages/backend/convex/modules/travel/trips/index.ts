import { ConvexError, type Infer } from 'convex/values';
import { requireWorkspace, workspaceRoster } from '#convex/modules/auth/workspace';
import { insertWithShortId } from '#convex/modules/references/index';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { DestinationCover } from '#convex/modules/travel/covers/destination/index';
import { TripCover } from '#convex/modules/travel/covers/index';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { TripLocations } from '#convex/modules/travel/locations/index';
import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripPreferences } from '#convex/modules/travel/preferences/index';
import { TripStay } from '#convex/modules/travel/stays/index';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import { TripTravelers } from '#convex/modules/travel/travelers/index';
import {
  assertMutable,
  attachTrip,
  isSeedWrite,
  loadTripContext,
  type MutableTripCtx,
  patchTrip,
  recordActivity
} from '#convex/modules/travel/trips/ctx';
import { LocalDateTime } from '#convex/modules/travel/trips/datetime';
import { listTrips } from '#convex/modules/travel/trips/list';
import {
  normalizeDetails,
  type TripDestinationInput,
  type TripInformationInput,
  type TripUpdateInput
} from '#convex/modules/travel/trips/normalize';
import { projectTrip } from '#convex/modules/travel/trips/projection';
import type { Doc, Id, TableNames } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import type { TripValidators } from './schema';

const DELETE_BATCH_SIZE = 50;
const GEOSPATIAL_BATCH_SIZE = 10;
const MILLISECONDS_PER_DAY = 86_400_000;

export type TripCreateInput = Infer<typeof TripValidators.createInput>;

async function deleteRows(
  ctx: MutationCtx,
  rowsPromise: Promise<Array<{ _id: Id<TableNames> }>>
): Promise<boolean> {
  const rows = await rowsPromise;
  await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
  return rows.length > 0;
}

async function deleteProposalBatch(
  ctx: MutationCtx,
  proposalId: Id<'tripProposals'>
): Promise<boolean> {
  const operation = await ctx.db
    .query('tripProposalOperations')
    .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
    .first();
  if (operation) {
    await ctx.db.delete('tripProposalOperations', operation._id);
    return true;
  }
  if (
    await deleteRows(
      ctx,
      ctx.db
        .query('tripProposalComments')
        .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
        .take(DELETE_BATCH_SIZE)
    )
  ) {
    return true;
  }
  if (
    await deleteRows(
      ctx,
      ctx.db
        .query('tripProposalApprovals')
        .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
        .take(DELETE_BATCH_SIZE)
    )
  ) {
    return true;
  }
  const snapshot = await ctx.db
    .query('tripProposalSnapshots')
    .withIndex('by_proposalId', (query) => query.eq('proposalId', proposalId))
    .unique();
  if (snapshot) {
    await ctx.db.delete('tripProposalSnapshots', snapshot._id);
    return true;
  }
  await ctx.db.delete('tripProposals', proposalId);
  return false;
}

async function deleteIssueBatch(ctx: MutationCtx, tripId: Id<'trips'>): Promise<boolean> {
  const issue = await ctx.db
    .query('tripIssues')
    .withIndex('by_tripId_and_updatedAt', (query) => query.eq('tripId', tripId))
    .first();
  if (!issue) return false;
  if (
    await deleteRows(
      ctx,
      ctx.db
        .query('tripIssueComments')
        .withIndex('by_issueId', (query) => query.eq('issueId', issue._id))
        .take(DELETE_BATCH_SIZE)
    )
  ) {
    return true;
  }
  await ctx.db.delete('tripIssues', issue._id);
  return true;
}

async function deleteAttachmentRows(ctx: MutationCtx, tripId: Id<'trips'>): Promise<boolean> {
  if (
    await deleteRows(
      ctx,
      ctx.db
        .query('attachmentReferences')
        .withIndex('by_tripId_and_target_type_and_target_id_and_position', (query) =>
          query.eq('tripId', tripId)
        )
        .take(DELETE_BATCH_SIZE)
    )
  ) {
    return true;
  }
  return await deleteRows(
    ctx,
    ctx.db
      .query('attachments')
      .withIndex('by_tripId_and_mediaId', (query) => query.eq('tripId', tripId))
      .take(DELETE_BATCH_SIZE)
  );
}

async function deleteTransferRows(ctx: MutationCtx, tripId: Id<'trips'>): Promise<boolean> {
  if (
    await deleteRows(
      ctx,
      ctx.db
        .query('tripActivityTransfers')
        .withIndex('by_tripId_and_fromActivityId', (query) => query.eq('tripId', tripId))
        .take(DELETE_BATCH_SIZE)
    )
  ) {
    return true;
  }
  if (
    await deleteRows(
      ctx,
      ctx.db
        .query('tripBoundaryTransfers')
        .withIndex('by_tripId_and_boundary', (query) => query.eq('tripId', tripId))
        .take(DELETE_BATCH_SIZE)
    )
  ) {
    return true;
  }
  return await deleteRows(
    ctx,
    ctx.db
      .query('tripDestinationTransfers')
      .withIndex('by_tripId_and_fromDestinationId', (query) => query.eq('tripId', tripId))
      .take(DELETE_BATCH_SIZE)
  );
}

async function deleteBatch(ctx: MutationCtx, trip: Doc<'trips'>): Promise<void> {
  const sourceProposal = await ctx.db
    .query('tripProposals')
    .withIndex('by_sourceTripId_and_updatedAt', (query) => query.eq('sourceTripId', trip._id))
    .first();
  if (sourceProposal) {
    await deleteProposalBatch(ctx, sourceProposal._id);
    return;
  }
  if (await deleteIssueBatch(ctx, trip._id)) return;
  if (await deleteAttachmentRows(ctx, trip._id)) return;
  const proposal = await ctx.db
    .query('tripProposals')
    .withIndex('by_workingTripId', (query) => query.eq('workingTripId', trip._id))
    .unique();
  if (proposal) {
    if (await deleteProposalBatch(ctx, proposal._id)) return;
  }
  if (await deleteTransferRows(ctx, trip._id)) return;

  const activities = await ctx.db
    .query('tripDestinationActivities')
    .withIndex('by_tripId_and_position', (query) => query.eq('tripId', trip._id))
    .take(GEOSPATIAL_BATCH_SIZE);
  if (activities.length > 0) {
    await Promise.all(
      activities.map(async (activity) => {
        await TripLocations.removeActivity(ctx, activity._id);
        await ctx.db.delete(activity._id);
      })
    );
    return;
  }

  if (
    await deleteRows(
      ctx,
      ctx.db
        .query('tripDestinationStays')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', trip._id))
        .take(DELETE_BATCH_SIZE)
    )
  ) {
    return;
  }

  const destinations = await ctx.db
    .query('tripDestinations')
    .withIndex('by_tripId_and_position', (query) => query.eq('tripId', trip._id))
    .take(GEOSPATIAL_BATCH_SIZE);
  if (destinations.length > 0) {
    await Promise.all(
      destinations.map(async (destination) => {
        await TripLocations.removeDestination(ctx, destination._id);
        await DestinationCover.deleteStorage(ctx, destination);
        await ctx.db.delete(destination._id);
      })
    );
    return;
  }

  if (await TripPacking.deleteForTrip(ctx, trip._id, DELETE_BATCH_SIZE)) {
    return;
  }
  if (await TripPreferences.deleteForTrip(ctx, trip._id, DELETE_BATCH_SIZE)) {
    return;
  }
  if (
    await deleteRows(
      ctx,
      ctx.db
        .query('tripAuditEvents')
        .withIndex('by_tripId', (query) => query.eq('tripId', trip._id))
        .take(DELETE_BATCH_SIZE)
    )
  ) {
    return;
  }

  await TripLocations.removeTrip(ctx, trip._id);
  const coverStorageId =
    trip.cover && 'asset' in trip.cover ? trip.cover.asset?.storageId : undefined;
  await TripCover.deleteStorage(ctx, coverStorageId);
  await ctx.db.delete('trips', trip._id);
}

async function synchronizePrimaryDestination(
  ctx: MutableTripCtx,
  destination: TripDestinationInput
): Promise<void> {
  const primary = await ctx.db
    .query('tripDestinations')
    .withIndex('by_tripId_and_position', (query) => query.eq('tripId', ctx.trip._id))
    .first();
  if (destination.status === 'undecided') {
    if (primary) {
      throw new ConvexError('Remove itinerary destinations before marking the trip undecided');
    }
    await TripLocations.setTrip(ctx, {
      coordinates: undefined,
      organizationId: ctx.workspace.organizationId,
      tripId: ctx.trip._id
    });
    return;
  }
  if (!('coordinates' in destination)) {
    if (primary) {
      throw new ConvexError('Select a verified place when changing the primary destination');
    }
    await TripLocations.setTrip(ctx, {
      coordinates: undefined,
      organizationId: ctx.workspace.organizationId,
      tripId: ctx.trip._id
    });
    return;
  }

  const duplicate = await ctx.db
    .query('tripDestinations')
    .withIndex('by_tripId_and_placeId', (query) =>
      query.eq('tripId', ctx.trip._id).eq('placeId', destination.placeId)
    )
    .unique();
  if (duplicate && duplicate._id !== primary?._id) {
    throw new ConvexError('That destination is already in this trip');
  }

  const location = {
    coordinates: destination.coordinates,
    countryCode: destination.countryCode,
    name: destination.name,
    placeId: destination.placeId
  };
  if (primary) {
    if (
      primary.countryCode !== location.countryCode ||
      primary.coordinates.latitude !== location.coordinates.latitude ||
      primary.coordinates.longitude !== location.coordinates.longitude ||
      primary.name !== location.name ||
      primary.placeId !== location.placeId
    ) {
      await ctx.db.patch('tripDestinations', primary._id, location);
      await DestinationCover.queue(ctx, { ...primary, ...location });
      await TripLocations.setDestination(ctx, {
        coordinates: location.coordinates,
        destinationId: primary._id,
        organizationId: ctx.workspace.organizationId,
        tripId: ctx.trip._id
      });
    }
  } else {
    const destinationId = await ctx.db.insert('tripDestinations', {
      ...location,
      cover: DestinationCover.initial(),
      position: 0,
      tripId: ctx.trip._id
    });
    await DestinationCover.schedule(ctx, destinationId, 1);
    await TripLocations.setDestination(ctx, {
      coordinates: location.coordinates,
      destinationId,
      organizationId: ctx.workspace.organizationId,
      tripId: ctx.trip._id
    });
  }
  await TripLocations.setTrip(ctx, {
    coordinates: destination.coordinates,
    organizationId: ctx.workspace.organizationId,
    tripId: ctx.trip._id
  });
}

async function create(
  ctx: MutationCtx,
  input: TripCreateInput,
  signatureValid: boolean
): Promise<MutableTripCtx> {
  const workspace = await requireWorkspace(ctx);
  const clientRequestId = validateRequestId(input.clientRequestId);
  const details = normalizeCreateDetails(input);
  const creationFingerprint = createFingerprint(details, input.coverContentType);
  const existing = await ctx.db
    .query('trips')
    .withIndex('by_organizationId_and_creator_userId_and_clientRequestId', (query) =>
      query
        .eq('organizationId', workspace.organizationId)
        .eq('creator.userId', workspace.userId)
        .eq('clientRequestId', clientRequestId)
    )
    .unique();
  if (existing) {
    if (existing.creationFingerprint !== creationFingerprint) {
      throw new ConvexError('client request id was already used for a different trip');
    }
    return attachTrip(ctx, existing, workspace, 'organizer');
  }

  await TripCover.validate(ctx, details.coverStorageId, input.coverContentType, signatureValid);

  const updatedAt = Date.now();
  const tripId = await insertWithShortId(ctx, 'trips', {
    budget: details.budget,
    clientRequestId,
    creationFingerprint,
    ...(details.coverStorageId
      ? {
          cover: {
            asset: { source: 'upload' as const, storageId: details.coverStorageId },
            generation: 1,
            status: 'ready' as const
          }
        }
      : {}),
    creator: { userId: workspace.userId },
    currency: details.currency,
    dateNotes: details.dateNotes,
    destination: details.destination,
    duration: details.duration,
    name: details.name,
    organizationId: workspace.organizationId,
    ...(details.startDate ? { startDate: details.startDate } : {}),
    updatedAt
  });
  const data = await ctx.db.get('trips', tripId);
  if (!data) throw new ConvexError('Trip creation failed');
  const trip = attachTrip(ctx, data, workspace, 'organizer');
  await synchronizePrimaryDestination(trip, details.destination);
  if (!isSeedWrite() && !details.coverStorageId && (await TripCover.hasDestination(ctx, tripId))) {
    const refresh = TripCover.from(ctx, trip).refresh();
    if (refresh) {
      await patchTrip(trip, { cover: refresh.cover });
      await TripCover.schedule(ctx, tripId, refresh.generation);
    }
  }
  await TripTravelers.seed(ctx, trip);
  await recordActivity(trip, 'trip_created', `${workspace.viewerName} created the trip`);
  return trip;
}

async function get(ctx: QueryCtx, tripId: Id<'trips'>) {
  return projectTrip(ctx, await loadTripContext(ctx, tripId));
}

async function find(ctx: QueryCtx, tripId: Id<'trips'>) {
  const workspace = await requireWorkspace(ctx);
  const data = await ctx.db.get('trips', tripId);
  if (!data || data.organizationId !== workspace.organizationId) return null;
  return projectTrip(ctx, await loadTripContext(ctx, tripId, workspace));
}

async function groupMemberCount(ctx: QueryCtx, tripId: Id<'trips'>): Promise<number> {
  const trip = await loadTripContext(ctx, tripId);
  return (await workspaceRoster(ctx, trip.workspace)).members.length;
}

async function update(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  input: TripUpdateInput
): Promise<null> {
  const trip = await loadTripContext(ctx, tripId);
  return await applyUpdate(ctx, trip, input);
}

async function updateTravelDates(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  startDateValue: string,
  endDateValue: string
): Promise<null> {
  const startDate = LocalDateTime.normalizeDate(startDateValue, 'trip start date');
  const endDate = LocalDateTime.normalizeDate(endDateValue, 'trip end date');
  if (!(startDate && endDate)) throw new ConvexError('Trip start and end dates are required');
  const totalDays =
    (Date.parse(`${endDate}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`)) /
    MILLISECONDS_PER_DAY;
  if (!Number.isInteger(totalDays) || totalDays < 1) {
    throw new ConvexError('Trip end date must be after the trip start date');
  }
  if (totalDays > 365) throw new ConvexError('Trip date range cannot exceed 365 days');

  const trip = await loadTripContext(ctx, tripId);
  return await applyUpdate(ctx, trip, {
    ...(trip.trip.budget ? { budget: trip.trip.budget } : {}),
    currency: trip.trip.currency,
    ...(trip.trip.dateNotes ? { dateNotes: trip.trip.dateNotes } : {}),
    destination: trip.trip.destination,
    duration: { ...trip.trip.duration, totalDays },
    name: trip.trip.name,
    startDate
  });
}

async function applyUpdate(
  ctx: MutationCtx,
  trip: MutableTripCtx,
  input: TripUpdateInput
): Promise<null> {
  assertMutable(trip);
  const details = normalizeDetails(input);
  if (detailsMatch(trip.trip, details)) return null;
  const totalDays = details.duration?.totalDays;
  if (totalDays !== undefined) {
    const [
      destinations,
      activities,
      stays,
      boundaryTransfers,
      destinationTransfers,
      activityTransfers
    ] = await Promise.all([
      TripDestination.forTrip(ctx, trip.trip._id),
      ItineraryActivity.forTrip(ctx, trip.trip._id),
      TripStay.forTrip(ctx, trip.trip._id),
      TripTransfer.boundaryForTrip(ctx, trip.trip._id),
      TripTransfer.destinationForTrip(ctx, trip.trip._id),
      TripTransfer.activityForTrip(ctx, trip.trip._id)
    ]);
    const transfers = [...boundaryTransfers, ...destinationTransfers, ...activityTransfers];
    if (
      destinations.some(
        (destination) =>
          (destination.schedule?.startDay ?? 0) > totalDays ||
          (destination.schedule?.endDay ?? 0) > totalDays
      ) ||
      activities.some(
        (activityItem) => (activityItem.schedule.endDay ?? activityItem.schedule.day) > totalDays
      ) ||
      stays.some((stay) => stay.schedule.checkOutDay > totalDays) ||
      transfers.some(
        (transfer) => (transfer.timing?.endDay ?? transfer.timing?.startDay ?? 0) > totalDays
      )
    ) {
      throw new ConvexError(
        'Trip length must include every destination, stay, activity, and travel day'
      );
    }
  }
  const previousDestination =
    trip.trip.destination.status === 'known' ? trip.trip.destination.name : null;
  const nextDestination = details.destination.status === 'known' ? details.destination.name : null;
  const cover = TripCover.from(ctx, trip);
  const hadDestination = await TripCover.hasDestination(ctx, trip.trip._id);
  await synchronizePrimaryDestination(trip, details.destination);
  const hasDestination = await TripCover.hasDestination(ctx, trip.trip._id);
  const shouldRefreshCover =
    previousDestination !== nextDestination || (!hadDestination && hasDestination);
  const coverChange = shouldRefreshCover
    ? hasDestination
      ? cover.refresh(true)
      : cover.clearAutomatic()
    : null;
  await patchTrip(trip, {
    ...details,
    ...(coverChange ? { cover: coverChange.cover } : {}),
    budget: details.budget,
    dateNotes: details.dateNotes,
    duration: details.duration,
    startDate: details.startDate,
    updatedAt: Date.now()
  });
  await recordActivity(
    trip,
    'details_updated',
    `${trip.workspace.viewerName} updated trip details`
  );
  if (coverChange && hasDestination) await cover.schedule(coverChange.generation);
  return null;
}

function normalizeCreateDetails(input: TripInformationInput) {
  return {
    ...normalizeDetails(input),
    coverStorageId: input.coverStorageId
  };
}

function detailsMatch(trip: Doc<'trips'>, details: ReturnType<typeof normalizeDetails>): boolean {
  const destinationsMatch = destinationDetailsMatch(trip.destination, details.destination);
  return (
    trip.budget?.amount === details.budget?.amount &&
    trip.currency === details.currency &&
    trip.dateNotes === details.dateNotes &&
    destinationsMatch &&
    trip.duration?.idealDays === details.duration?.idealDays &&
    trip.duration?.minimumDays === details.duration?.minimumDays &&
    trip.duration?.totalDays === details.duration?.totalDays &&
    trip.name === details.name &&
    trip.startDate === details.startDate
  );
}

function destinationDetailsMatch(
  current: Doc<'trips'>['destination'],
  next: ReturnType<typeof normalizeDetails>['destination']
): boolean {
  if (current.status !== next.status) return false;
  if (current.status === 'undecided' || next.status === 'undecided') return true;
  if (current.countryCode !== next.countryCode || current.name !== next.name) return false;
  const currentVerified = verifiedDestination(current);
  const nextVerified = verifiedDestination(next);
  if ((currentVerified === null) !== (nextVerified === null)) return false;
  return (
    currentVerified === null ||
    (nextVerified !== null &&
      currentVerified.placeId === nextVerified.placeId &&
      currentVerified.latitude === nextVerified.latitude &&
      currentVerified.longitude === nextVerified.longitude)
  );
}

function verifiedDestination(value: object) {
  if (!('coordinates' in value) || !('placeId' in value)) return null;
  const { coordinates, placeId } = value;
  if (
    typeof coordinates !== 'object' ||
    coordinates === null ||
    !('latitude' in coordinates) ||
    !('longitude' in coordinates) ||
    typeof coordinates.latitude !== 'number' ||
    typeof coordinates.longitude !== 'number' ||
    typeof placeId !== 'string'
  ) {
    return null;
  }
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    placeId
  };
}

function createFingerprint(
  details: ReturnType<typeof normalizeCreateDetails>,
  coverContentType: string | undefined
): string {
  return JSON.stringify({
    coverContentType: coverContentType?.split(';', 1)[0]?.trim().toLowerCase(),
    details
  });
}

function validateRequestId(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 100) {
    throw new ConvexError('client request id must be between 8 and 100 characters');
  }
  return normalized;
}

export {
  create as createTrip,
  deleteBatch as deleteTripBatch,
  find as findTrip,
  get as getTrip,
  groupMemberCount,
  listTrips,
  update as updateTrip,
  updateTravelDates
};
