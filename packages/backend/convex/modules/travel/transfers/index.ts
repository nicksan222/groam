import { ConvexError, type Infer } from 'convex/values';
import { Attachments } from '#convex/modules/media/attachments/index';
import type { TripTransferValidators } from '#convex/modules/travel/transfers/schema';
import { costsMatch, type TripCostSplit } from '#convex/modules/travel/trips/costs';
import {
  assertDayWithinTrip,
  assertMutable,
  loadTripContext,
  type MutableTripCtx,
  patchTrip,
  recordActivity,
  totalDays
} from '#convex/modules/travel/trips/ctx';
import { LocalDateTime } from '#convex/modules/travel/trips/datetime';
import { normalizeCostRecord } from '#convex/modules/travel/trips/normalize';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

const MAX_ACTIVITY_TRANSFERS = 199;
const MAX_ATTACHMENTS = 5;
const MAX_DESTINATION_TRANSFERS = 19;
const MAX_DURATION_MINUTES = 10_080;
const MAX_NOTES_LENGTH = 500;

export type TripTransferInput = Infer<typeof TripTransferValidators.input>;
export type TripBoundary = Infer<typeof TripTransferValidators.boundary>;
type TransportMode = Infer<typeof TripTransferValidators.mode>;
type NormalizedTransfer = {
  cost?: { amount: number; split?: TripCostSplit };
  duration?: { minutes: number };
  mode: TransportMode;
  notes?: string;
  timing?: { endDay?: number; endTime?: string; startDay: number; startTime: string };
};

async function boundaryDestination(ctx: MutationCtx, tripId: Id<'trips'>, boundary: TripBoundary) {
  return await ctx.db
    .query('tripDestinations')
    .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
    .order(boundary === 'arrival' ? 'asc' : 'desc')
    .first();
}

async function setBoundary(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  boundary: TripBoundary,
  input: TripTransferInput
): Promise<Id<'tripBoundaryTransfers'>> {
  const trip = await loadTripContext(ctx, tripId);
  assertMutable(trip);
  const destination = await boundaryDestination(ctx, tripId, boundary);
  if (!destination) throw new ConvexError('Add a destination before planning boundary travel');
  const normalized = normalize(input);
  assertTimingWithinTrip(trip, normalized);
  const tripEndDay = totalDays(trip) ?? destination.schedule?.endDay ?? 1;
  assertTimingWithinDays(
    normalized,
    boundary === 'arrival' ? 1 : (destination.schedule?.endDay ?? tripEndDay),
    boundary === 'arrival' ? (destination.schedule?.startDay ?? 1) : tripEndDay,
    boundary === 'arrival' ? 'Arrival travel' : 'Return travel'
  );
  const existing = await ctx.db
    .query('tripBoundaryTransfers')
    .withIndex('by_tripId_and_boundary', (query) =>
      query.eq('tripId', tripId).eq('boundary', boundary)
    )
    .unique();
  const detailsMatch = existing !== null && transferDetailsMatch(existing, normalized);
  if (existing && detailsMatch) {
    const attachmentsChanged = await Attachments.setTarget(
      ctx,
      tripId,
      { id: existing._id, type: 'boundary_transfer' },
      input.attachmentIds,
      trip.workspace.organizationId,
      MAX_ATTACHMENTS,
      'Transfers'
    );
    if (!attachmentsChanged) return existing._id;
    await touchTrip(trip);
    await recordActivity(
      trip,
      'boundary_transfer_updated',
      `${trip.workspace.viewerName} updated ${boundary} travel`
    );
    return existing._id;
  }

  const transferId = existing
    ? existing._id
    : await ctx.db.insert('tripBoundaryTransfers', { ...normalized, boundary, tripId });
  if (existing) {
    await ctx.db.patch('tripBoundaryTransfers', existing._id, {
      ...normalized,
      cost: normalized.cost,
      duration: normalized.duration,
      notes: normalized.notes,
      timing: normalized.timing
    });
  } else {
  }
  await Attachments.setTarget(
    ctx,
    tripId,
    { id: transferId, type: 'boundary_transfer' },
    input.attachmentIds,
    trip.workspace.organizationId,
    MAX_ATTACHMENTS,
    'Transfers'
  );
  await touchTrip(trip);
  await recordActivity(
    trip,
    'boundary_transfer_updated',
    `${trip.workspace.viewerName} updated ${boundary} travel`
  );
  return transferId;
}

async function removeBoundary(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  transferId: Id<'tripBoundaryTransfers'>
): Promise<null> {
  const [trip, transfer] = await Promise.all([
    loadTripContext(ctx, tripId),
    ctx.db.get('tripBoundaryTransfers', transferId)
  ]);
  assertMutable(trip);
  if (!transfer || transfer.tripId !== tripId) {
    throw new ConvexError('Trip boundary transfer not found');
  }
  await deleteBoundaryRows(ctx, [transfer]);
  await touchTrip(trip);
  await recordActivity(
    trip,
    'boundary_transfer_removed',
    `${trip.workspace.viewerName} removed ${transfer.boundary} travel`
  );
  return null;
}

async function setDestination(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  fromDestinationId: Id<'tripDestinations'>,
  toDestinationId: Id<'tripDestinations'>,
  input: TripTransferInput
): Promise<Id<'tripDestinationTransfers'>> {
  const [trip, from, to] = await Promise.all([
    loadTripContext(ctx, tripId),
    ctx.db.get('tripDestinations', fromDestinationId),
    ctx.db.get('tripDestinations', toDestinationId)
  ]);
  assertMutable(trip);
  if (!from || !to || from.tripId !== tripId || to.tripId !== tripId) {
    throw new ConvexError('Trip destination not found');
  }
  if (to.position !== from.position + 1) {
    throw new ConvexError('Destination transfers must connect consecutive stops');
  }

  const normalized = normalize(input);
  assertTimingWithinTrip(trip, normalized);
  if (from.schedule && to.schedule) {
    assertTimingWithinDays(
      normalized,
      from.schedule.endDay,
      to.schedule.startDay,
      'Destination transfer'
    );
  }
  const existing = await ctx.db
    .query('tripDestinationTransfers')
    .withIndex('by_tripId_and_fromDestinationId', (query) =>
      query.eq('tripId', tripId).eq('fromDestinationId', fromDestinationId)
    )
    .unique();
  const detailsMatch =
    existing !== null &&
    existing.toDestinationId === toDestinationId &&
    transferDetailsMatch(existing, normalized);
  if (existing && detailsMatch) {
    const attachmentsChanged = await Attachments.setTarget(
      ctx,
      tripId,
      { id: existing._id, type: 'destination_transfer' },
      input.attachmentIds,
      trip.workspace.organizationId,
      MAX_ATTACHMENTS,
      'Transfers'
    );
    if (!attachmentsChanged) return existing._id;
    await touchTrip(trip);
    await recordActivity(
      trip,
      'destination_transfer_updated',
      `${trip.workspace.viewerName} updated travel from ${from.name} to ${to.name}`
    );
    return existing._id;
  }

  const transferId = existing
    ? existing._id
    : await ctx.db.insert('tripDestinationTransfers', {
        ...normalized,
        fromDestinationId,
        toDestinationId,
        tripId
      });
  if (existing) {
    await ctx.db.patch('tripDestinationTransfers', existing._id, {
      ...normalized,
      cost: normalized.cost,
      duration: normalized.duration,
      notes: normalized.notes,
      timing: normalized.timing,
      toDestinationId
    });
  } else {
  }
  await Attachments.setTarget(
    ctx,
    tripId,
    { id: transferId, type: 'destination_transfer' },
    input.attachmentIds,
    trip.workspace.organizationId,
    MAX_ATTACHMENTS,
    'Transfers'
  );
  await touchTrip(trip);
  await recordActivity(
    trip,
    'destination_transfer_updated',
    `${trip.workspace.viewerName} updated travel from ${from.name} to ${to.name}`
  );
  return transferId;
}

async function removeDestination(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  transferId: Id<'tripDestinationTransfers'>
): Promise<null> {
  const [trip, transfer] = await Promise.all([
    loadTripContext(ctx, tripId),
    ctx.db.get('tripDestinationTransfers', transferId)
  ]);
  assertMutable(trip);
  if (!transfer || transfer.tripId !== tripId) {
    throw new ConvexError('Destination transfer not found');
  }
  const [from, to] = await Promise.all([
    ctx.db.get('tripDestinations', transfer.fromDestinationId),
    ctx.db.get('tripDestinations', transfer.toDestinationId)
  ]);
  await deleteDestinationRows(ctx, [transfer]);
  await touchTrip(trip);
  await recordActivity(
    trip,
    'destination_transfer_removed',
    `${trip.workspace.viewerName} removed travel from ${from?.name ?? 'a stop'} to ${to?.name ?? 'the next stop'}`
  );
  return null;
}

async function setActivity(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  fromActivityId: Id<'tripDestinationActivities'>,
  toActivityId: Id<'tripDestinationActivities'>,
  input: TripTransferInput
): Promise<Id<'tripActivityTransfers'>> {
  const [trip, from, to] = await Promise.all([
    loadTripContext(ctx, tripId),
    ctx.db.get('tripDestinationActivities', fromActivityId),
    ctx.db.get('tripDestinationActivities', toActivityId)
  ]);
  assertMutable(trip);
  if (!from || !to || from.tripId !== tripId || to.tripId !== tripId) {
    throw new ConvexError('Itinerary activity not found');
  }
  if (from.destinationId !== to.destinationId || to.position !== from.position + 1) {
    throw new ConvexError('Activity transfers must connect consecutive activities at one stop');
  }
  assertActivityOrder(from, to);

  const normalized = normalize(input);
  assertTimingWithinTrip(trip, normalized);
  assertTimingWithinDays(
    normalized,
    from.schedule.endDay ?? from.schedule.day,
    to.schedule.day,
    'Activity transfer'
  );
  assertTimingAgainstActivities(normalized, from, to);
  const existing = await ctx.db
    .query('tripActivityTransfers')
    .withIndex('by_tripId_and_fromActivityId', (query) =>
      query.eq('tripId', tripId).eq('fromActivityId', fromActivityId)
    )
    .unique();
  const detailsMatch =
    existing !== null &&
    existing.toActivityId === toActivityId &&
    transferDetailsMatch(existing, normalized);
  if (existing && detailsMatch) {
    const attachmentsChanged = await Attachments.setTarget(
      ctx,
      tripId,
      { id: existing._id, type: 'activity_transfer' },
      input.attachmentIds,
      trip.workspace.organizationId,
      MAX_ATTACHMENTS,
      'Transfers'
    );
    if (!attachmentsChanged) return existing._id;
    await touchTrip(trip);
    await recordActivity(
      trip,
      'activity_transfer_updated',
      `${trip.workspace.viewerName} updated travel from ${from.title} to ${to.title}`
    );
    return existing._id;
  }

  const transferId = existing
    ? existing._id
    : await ctx.db.insert('tripActivityTransfers', {
        ...normalized,
        destinationId: from.destinationId,
        fromActivityId,
        toActivityId,
        tripId
      });
  if (existing) {
    await ctx.db.patch('tripActivityTransfers', existing._id, {
      ...normalized,
      cost: normalized.cost,
      destinationId: from.destinationId,
      duration: normalized.duration,
      notes: normalized.notes,
      timing: normalized.timing,
      toActivityId
    });
  } else {
  }
  await Attachments.setTarget(
    ctx,
    tripId,
    { id: transferId, type: 'activity_transfer' },
    input.attachmentIds,
    trip.workspace.organizationId,
    MAX_ATTACHMENTS,
    'Transfers'
  );
  await touchTrip(trip);
  await recordActivity(
    trip,
    'activity_transfer_updated',
    `${trip.workspace.viewerName} updated travel from ${from.title} to ${to.title}`
  );
  return transferId;
}

async function removeActivity(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  transferId: Id<'tripActivityTransfers'>
): Promise<null> {
  const [trip, transfer] = await Promise.all([
    loadTripContext(ctx, tripId),
    ctx.db.get('tripActivityTransfers', transferId)
  ]);
  assertMutable(trip);
  if (!transfer || transfer.tripId !== tripId) {
    throw new ConvexError('Activity transfer not found');
  }
  const [from, to] = await Promise.all([
    ctx.db.get('tripDestinationActivities', transfer.fromActivityId),
    ctx.db.get('tripDestinationActivities', transfer.toActivityId)
  ]);
  await deleteActivityRows(ctx, [transfer]);
  await touchTrip(trip);
  await recordActivity(
    trip,
    'activity_transfer_removed',
    `${trip.workspace.viewerName} removed travel from ${from?.title ?? 'an activity'} to ${to?.title ?? 'the next activity'}`
  );
  return null;
}

async function boundaryForTrip(ctx: MutationCtx | QueryCtx, tripId: Id<'trips'>) {
  const rows = await ctx.db
    .query('tripBoundaryTransfers')
    .withIndex('by_tripId_and_boundary', (query) => query.eq('tripId', tripId))
    .take(3);
  if (rows.length > 2) throw new ConvexError('Trips support two boundary transfers');
  return rows;
}

async function deleteBoundaries(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  boundaries: TripBoundary[]
): Promise<void> {
  if (boundaries.length === 0) return;
  const selected = new Set<TripBoundary>(boundaries);
  const rows = (await boundaryForTrip(ctx, tripId)).filter((row) => selected.has(row.boundary));
  await deleteBoundaryRows(ctx, rows);
}

async function destinationForTrip(ctx: MutationCtx | QueryCtx, tripId: Id<'trips'>) {
  const rows = await ctx.db
    .query('tripDestinationTransfers')
    .withIndex('by_tripId_and_fromDestinationId', (query) => query.eq('tripId', tripId))
    .take(MAX_DESTINATION_TRANSFERS + 1);
  if (rows.length > MAX_DESTINATION_TRANSFERS) {
    throw new ConvexError(`Trips support up to ${MAX_DESTINATION_TRANSFERS} destination transfers`);
  }
  return rows;
}

async function activityForTrip(ctx: MutationCtx | QueryCtx, tripId: Id<'trips'>) {
  const rows = await ctx.db
    .query('tripActivityTransfers')
    .withIndex('by_tripId_and_fromActivityId', (query) => query.eq('tripId', tripId))
    .take(MAX_ACTIVITY_TRANSFERS + 1);
  if (rows.length > MAX_ACTIVITY_TRANSFERS) {
    throw new ConvexError(`Trips support up to ${MAX_ACTIVITY_TRANSFERS} activity transfers`);
  }
  return rows;
}

async function deleteInvalidDestinationConnections(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  orderedDestinationIds: Id<'tripDestinations'>[]
): Promise<void> {
  const validConnections = new Set(
    orderedDestinationIds.slice(0, -1).map((destinationId, index) => {
      const nextDestinationId = orderedDestinationIds[index + 1];
      return `${destinationId}:${nextDestinationId}`;
    })
  );
  const transfers = await destinationForTrip(ctx, tripId);
  await deleteDestinationRows(
    ctx,
    transfers.filter(
      (transfer) =>
        !validConnections.has(`${transfer.fromDestinationId}:${transfer.toDestinationId}`)
    )
  );
}

async function deleteInvalidActivityConnections(
  ctx: MutationCtx,
  destinationId: Id<'tripDestinations'>,
  orderedActivityIds: Id<'tripDestinationActivities'>[]
): Promise<void> {
  const validConnections = new Set(
    orderedActivityIds.slice(0, -1).map((activityId, index) => {
      const nextActivityId = orderedActivityIds[index + 1];
      return `${activityId}:${nextActivityId}`;
    })
  );
  const transfers = await ctx.db
    .query('tripActivityTransfers')
    .withIndex('by_destinationId', (query) => query.eq('destinationId', destinationId))
    .take(30);
  await deleteActivityRows(
    ctx,
    transfers.filter(
      (transfer) => !validConnections.has(`${transfer.fromActivityId}:${transfer.toActivityId}`)
    )
  );
}

async function deleteForDestination(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  destinationId: Id<'tripDestinations'>
): Promise<void> {
  const [outgoing, incoming, activityTransfers] = await Promise.all([
    ctx.db
      .query('tripDestinationTransfers')
      .withIndex('by_tripId_and_fromDestinationId', (query) =>
        query.eq('tripId', tripId).eq('fromDestinationId', destinationId)
      )
      .unique(),
    ctx.db
      .query('tripDestinationTransfers')
      .withIndex('by_tripId_and_toDestinationId', (query) =>
        query.eq('tripId', tripId).eq('toDestinationId', destinationId)
      )
      .unique(),
    ctx.db
      .query('tripActivityTransfers')
      .withIndex('by_destinationId', (query) => query.eq('destinationId', destinationId))
      .take(30)
  ]);
  await deleteDestinationRows(
    ctx,
    [outgoing, incoming].flatMap((row) => (row ? [row] : []))
  );
  await deleteActivityRows(ctx, activityTransfers);
}

async function assertActivityScheduleChange(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  activity: Doc<'tripDestinationActivities'>,
  schedule: Doc<'tripDestinationActivities'>['schedule']
): Promise<void> {
  const [incoming, outgoing] = await Promise.all([
    ctx.db
      .query('tripActivityTransfers')
      .withIndex('by_tripId_and_toActivityId', (query) =>
        query.eq('tripId', tripId).eq('toActivityId', activity._id)
      )
      .unique(),
    ctx.db
      .query('tripActivityTransfers')
      .withIndex('by_tripId_and_fromActivityId', (query) =>
        query.eq('tripId', tripId).eq('fromActivityId', activity._id)
      )
      .unique()
  ]);
  const changedActivity = { ...activity, schedule };
  if (incoming) {
    const from = await ctx.db.get('tripDestinationActivities', incoming.fromActivityId);
    if (from) {
      assertActivityOrder(from, changedActivity);
      if (incoming.timing) {
        assertTimingWithinDays(
          incoming,
          from.schedule.endDay ?? from.schedule.day,
          schedule.day,
          'Incoming activity transfer'
        );
        assertTimingAgainstActivities(incoming, from, changedActivity);
      }
    }
  }
  if (outgoing) {
    const to = await ctx.db.get('tripDestinationActivities', outgoing.toActivityId);
    if (to) {
      assertActivityOrder(changedActivity, to);
      if (outgoing.timing) {
        assertTimingWithinDays(
          outgoing,
          schedule.endDay ?? schedule.day,
          to.schedule.day,
          'Outgoing activity transfer'
        );
        assertTimingAgainstActivities(outgoing, changedActivity, to);
      }
    }
  }
}

function assertConnectedDestinationTimings(
  incoming: Doc<'tripDestinationTransfers'> | null,
  outgoing: Doc<'tripDestinationTransfers'> | null,
  previous: Doc<'tripDestinations'> | undefined,
  next: Doc<'tripDestinations'> | undefined,
  schedule: Doc<'tripDestinations'>['schedule']
) {
  if (incoming?.timing && previous?.schedule && schedule) {
    assertTimingWithinDays(
      incoming,
      previous.schedule.endDay,
      schedule.startDay,
      'Incoming destination transfer'
    );
  }
  if (outgoing?.timing && next?.schedule && schedule) {
    assertTimingWithinDays(
      outgoing,
      schedule.endDay,
      next.schedule.startDay,
      'Outgoing destination transfer'
    );
  }
}

function assertBoundaryScheduleTimings(
  boundaries: Doc<'tripBoundaryTransfers'>[],
  index: number,
  destinationCount: number,
  trip: MutableTripCtx,
  schedule: Doc<'tripDestinations'>['schedule']
) {
  const arrival = boundaries.find((row) => row.boundary === 'arrival');
  if (index === 0 && arrival?.timing) {
    assertTimingWithinDays(arrival, 1, schedule?.startDay ?? 1, 'Arrival travel');
  }
  const departure = boundaries.find((row) => row.boundary === 'departure');
  if (index === destinationCount - 1 && departure?.timing) {
    const tripEndDay = totalDays(trip) ?? schedule?.endDay ?? 1;
    assertTimingWithinDays(departure, schedule?.endDay ?? tripEndDay, tripEndDay, 'Return travel');
  }
}

async function assertDestinationScheduleChange(
  ctx: MutationCtx,
  trip: MutableTripCtx,
  destination: Doc<'tripDestinations'>,
  schedule: Doc<'tripDestinations'>['schedule'],
  destinations: Doc<'tripDestinations'>[]
): Promise<void> {
  const index = destinations.findIndex((item) => item._id === destination._id);
  const previous = destinations[index - 1];
  const next = destinations[index + 1];
  const [incoming, outgoing, boundaries] = await Promise.all([
    ctx.db
      .query('tripDestinationTransfers')
      .withIndex('by_tripId_and_toDestinationId', (query) =>
        query.eq('tripId', trip.trip._id).eq('toDestinationId', destination._id)
      )
      .unique(),
    ctx.db
      .query('tripDestinationTransfers')
      .withIndex('by_tripId_and_fromDestinationId', (query) =>
        query.eq('tripId', trip.trip._id).eq('fromDestinationId', destination._id)
      )
      .unique(),
    boundaryForTrip(ctx, trip.trip._id)
  ]);
  assertConnectedDestinationTimings(incoming, outgoing, previous, next, schedule);
  assertBoundaryScheduleTimings(boundaries, index, destinations.length, trip, schedule);
}

async function shiftActivityTimingsForDestination(
  ctx: MutationCtx,
  destinationId: Id<'tripDestinations'>,
  dayShift: number
): Promise<void> {
  if (dayShift === 0) return;
  const transfers = await ctx.db
    .query('tripActivityTransfers')
    .withIndex('by_destinationId', (query) => query.eq('destinationId', destinationId))
    .take(30);
  await Promise.all(
    transfers.map((transfer) => {
      const timing = transfer.timing;
      if (!timing) return null;
      return ctx.db.patch('tripActivityTransfers', transfer._id, {
        timing: {
          ...timing,
          ...(timing.endDay === undefined ? {} : { endDay: timing.endDay + dayShift }),
          startDay: timing.startDay + dayShift
        }
      });
    })
  );
}

async function deleteForActivity(
  ctx: MutationCtx,
  tripId: Id<'trips'>,
  activityId: Id<'tripDestinationActivities'>
): Promise<void> {
  const [outgoing, incoming] = await Promise.all([
    ctx.db
      .query('tripActivityTransfers')
      .withIndex('by_tripId_and_fromActivityId', (query) =>
        query.eq('tripId', tripId).eq('fromActivityId', activityId)
      )
      .unique(),
    ctx.db
      .query('tripActivityTransfers')
      .withIndex('by_tripId_and_toActivityId', (query) =>
        query.eq('tripId', tripId).eq('toActivityId', activityId)
      )
      .unique()
  ]);
  await deleteActivityRows(
    ctx,
    [outgoing, incoming].flatMap((row) => (row ? [row] : []))
  );
}

function assertTimingWithinDays(
  transfer: NormalizedTransfer,
  minimumDay: number,
  maximumDay: number,
  label: string
) {
  const timing = transfer.timing;
  if (timing && (timing.startDay < minimumDay || (timing.endDay ?? timing.startDay) > maximumDay)) {
    throw new ConvexError(`${label} timing must fit between its connected itinerary elements`);
  }
}

function assertActivityOrder(
  from: Doc<'tripDestinationActivities'>,
  to: Doc<'tripDestinationActivities'>
) {
  if ((from.schedule.endDay ?? from.schedule.day) > to.schedule.day) {
    throw new ConvexError('Activity transfers must follow chronological activity order');
  }
}

function assertTimingAgainstActivities(
  transfer: NormalizedTransfer,
  from: Doc<'tripDestinationActivities'>,
  to: Doc<'tripDestinationActivities'>
) {
  const timing = transfer.timing;
  if (!timing) return;
  const fromEndDay = from.schedule.endDay ?? from.schedule.day;
  if (
    from.schedule.endTime &&
    timing.startDay === fromEndDay &&
    timing.startTime < from.schedule.endTime
  ) {
    throw new ConvexError('Activity transfer cannot depart before the previous activity ends');
  }
  const transferEndDay = timing.endDay ?? timing.startDay;
  if (
    to.schedule.startTime &&
    timing.endTime &&
    transferEndDay === to.schedule.day &&
    timing.endTime > to.schedule.startTime
  ) {
    throw new ConvexError('Activity transfer cannot arrive after the next activity starts');
  }
}

function assertTimingWithinTrip(trip: MutableTripCtx, transfer: NormalizedTransfer) {
  if (!transfer.timing) return;
  assertDayWithinTrip(trip, transfer.timing.startDay, 'Transfer start day');
  assertDayWithinTrip(trip, transfer.timing.endDay ?? transfer.timing.startDay, 'Transfer end day');
}

function normalizeDuration(minutes: number | undefined) {
  if (minutes === undefined) return undefined;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_DURATION_MINUTES) {
    throw new ConvexError(
      `transfer duration must be a whole number between 1 and ${MAX_DURATION_MINUTES}`
    );
  }
  return { minutes };
}

function normalizeNotes(value: string | undefined) {
  const notes = value?.trim();
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    throw new ConvexError(`transfer notes must be ${MAX_NOTES_LENGTH} characters or fewer`);
  }
  return notes || undefined;
}

function normalizeTiming(input: TripTransferInput['timing']): NormalizedTransfer['timing'] {
  if (!input) return undefined;
  const startDay = input.startDay;
  const endDay = input.endDay ?? startDay;
  const hasInvalidDay =
    !Number.isInteger(startDay) ||
    startDay < 1 ||
    startDay > 365 ||
    !Number.isInteger(endDay) ||
    endDay < startDay ||
    endDay > 365;
  if (hasInvalidDay) {
    throw new ConvexError('transfer days must be a valid chronological range');
  }
  const normalizedTimes = LocalDateTime.normalizeDayTimeRange(
    startDay,
    input.startTime,
    endDay,
    input.endTime,
    'transfer time'
  );
  if (!normalizedTimes.startTime) {
    throw new ConvexError('transfer time start must be a valid time');
  }
  return {
    ...(endDay === startDay ? {} : { endDay }),
    ...normalizedTimes,
    startDay,
    startTime: normalizedTimes.startTime
  };
}

function normalize(input: TripTransferInput): NormalizedTransfer {
  const cost = normalizeCostRecord(input.cost, 'transfer cost');
  const duration = normalizeDuration(input.duration?.minutes);
  const notes = normalizeNotes(input.notes);
  const timing = normalizeTiming(input.timing);
  return {
    ...(cost === undefined ? {} : { cost }),
    ...(duration ? { duration } : {}),
    mode: input.mode,
    ...(notes ? { notes } : {}),
    ...(timing ? { timing } : {})
  };
}

function timingKey(timing: NormalizedTransfer['timing']) {
  return timing
    ? `${timing.startDay}:${timing.endDay ?? timing.startDay}:${timing.startTime}:${timing.endTime ?? ''}`
    : null;
}

function transferDetailsMatch(existing: NormalizedTransfer, normalized: NormalizedTransfer) {
  return (
    costsMatch(existing.cost, normalized.cost) &&
    existing.duration?.minutes === normalized.duration?.minutes &&
    existing.mode === normalized.mode &&
    existing.notes === normalized.notes &&
    timingKey(existing.timing) === timingKey(normalized.timing)
  );
}

async function touchTrip(trip: MutableTripCtx) {
  await patchTrip(trip, { updatedAt: Date.now() });
}

async function deleteBoundaryRows(ctx: MutationCtx, rows: Doc<'tripBoundaryTransfers'>[]) {
  await Promise.all(
    rows.map(async (row) => {
      await Attachments.removeTarget(ctx, row.tripId, {
        id: row._id,
        type: 'boundary_transfer'
      });
      await ctx.db.delete('tripBoundaryTransfers', row._id);
    })
  );
}

async function deleteDestinationRows(ctx: MutationCtx, rows: Doc<'tripDestinationTransfers'>[]) {
  await Promise.all(
    rows.map(async (row) => {
      await Attachments.removeTarget(ctx, row.tripId, {
        id: row._id,
        type: 'destination_transfer'
      });
      await ctx.db.delete('tripDestinationTransfers', row._id);
    })
  );
}

async function deleteActivityRows(ctx: MutationCtx, rows: Doc<'tripActivityTransfers'>[]) {
  await Promise.all(
    rows.map(async (row) => {
      await Attachments.removeTarget(ctx, row.tripId, {
        id: row._id,
        type: 'activity_transfer'
      });
      await ctx.db.delete('tripActivityTransfers', row._id);
    })
  );
}

/** Arrival, destination, and activity transfers for a trip. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class TripTransfer {
  static MAX_ACTIVITY_TRANSFERS = MAX_ACTIVITY_TRANSFERS;
  static MAX_ATTACHMENTS = MAX_ATTACHMENTS;
  static MAX_DESTINATION_TRANSFERS = MAX_DESTINATION_TRANSFERS;
  static activityForTrip = activityForTrip;
  static assertActivityScheduleChange = assertActivityScheduleChange;
  static assertDestinationScheduleChange = assertDestinationScheduleChange;
  static boundaryForTrip = boundaryForTrip;
  static deleteBoundaries = deleteBoundaries;
  static deleteForActivity = deleteForActivity;
  static deleteForDestination = deleteForDestination;
  static deleteInvalidActivityConnections = deleteInvalidActivityConnections;
  static deleteInvalidDestinationConnections = deleteInvalidDestinationConnections;
  static destinationForTrip = destinationForTrip;
  static removeActivity = removeActivity;
  static removeBoundary = removeBoundary;
  static removeDestination = removeDestination;
  static setActivity = setActivity;
  static setBoundary = setBoundary;
  static shiftActivityTimingsForDestination = shiftActivityTimingsForDestination;
  static setDestination = setDestination;
}
