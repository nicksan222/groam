import { ConvexError } from 'convex/values';
import { Attachments } from '#convex/modules/media/attachments/index';
import { DestinationCover } from '#convex/modules/travel/covers/destination/index';
import { TripLocations } from '#convex/modules/travel/locations/index';
import { applyPackingSnapshot } from '#convex/modules/travel/packing/apply';
import { type MutableTripCtx, patchTrip } from '#convex/modules/travel/trips/ctx';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';
import { VersionContent } from './content';
import {
  type ParsedVersionSnapshot,
  type VersionSnapshot,
  VersionSnapshots
} from './snapshot/index';

const MAX_TARGET_ATTACHMENTS = 10;
type Target = Exclude<Doc<'attachmentReferences'>['target'], { type: 'comment' }>;
type ApplyOptions = { retainSourceKeys?: boolean };

type SourceLinkedTable =
  | 'tripActivityTransfers'
  | 'tripDestinationActivities'
  | 'tripDestinationStays'
  | 'tripDestinationTransfers'
  | 'tripDestinations';

function sourceLink<Table extends SourceLinkedTable>(
  ctx: MutationCtx,
  table: Table,
  key: string,
  retainSourceKeys: boolean | undefined
): { sourceId: Id<Table> } | Record<string, never> {
  if (!retainSourceKeys) return {};
  const sourceId = ctx.db.normalizeId(table, key);
  return sourceId ? { sourceId } : {};
}

function sourceKey<T extends string>(sourceId: T | undefined, id: T): string {
  return sourceId ?? id;
}

function selectedFieldsMatch(current: object, next: object): boolean {
  const currentRecord = current as Record<string, unknown>;
  return Object.entries(next).every(
    ([field, value]) => JSON.stringify(currentRecord[field]) === JSON.stringify(value)
  );
}

async function removeTarget(ctx: MutationCtx, tripId: Id<'trips'>, target: Target): Promise<void> {
  await Attachments.removeTarget(ctx, tripId, target);
}

async function setAttachments(
  ctx: MutationCtx,
  source: MutableTripCtx,
  target: Target,
  mediaIds: Id<'media'>[]
): Promise<boolean> {
  return await Attachments.setTarget(
    ctx,
    source.trip._id,
    target,
    mediaIds,
    source.workspace.organizationId,
    MAX_TARGET_ATTACHMENTS,
    'Version items'
  );
}

async function reconcileDestinations(
  ctx: MutationCtx,
  source: MutableTripCtx,
  snapshot: ParsedVersionSnapshot,
  sourceContent: Awaited<ReturnType<typeof VersionContent.load>>,
  retainSourceKeys?: boolean
) {
  const existingByKey = new Map(
    sourceContent.destinations.map((destination) => [
      sourceKey(destination.sourceId, destination._id),
      destination
    ])
  );
  const destinationMap = new Map<string, Id<'tripDestinations'>>();
  const retained = new Set<Id<'tripDestinations'>>();

  await Promise.all(
    snapshot.destinations.map(async ({ key, value }) => {
      const existing = existingByKey.get(key);
      const { attachments, ...fields } = value;
      const id =
        existing?._id ??
        (await ctx.db.insert('tripDestinations', {
          ...fields,
          ...sourceLink(ctx, 'tripDestinations', key, retainSourceKeys),
          tripId: source.trip._id
        }));
      const detailsChanged = existing ? !selectedFieldsMatch(existing, fields) : true;
      if (existing && (detailsChanged || existing.sourceId !== undefined)) {
        await ctx.db.patch('tripDestinations', id, { ...fields, sourceId: undefined });
      }
      if (!existing || detailsChanged) {
        await TripLocations.setDestination(
          ctx,
          id,
          source.trip._id,
          source.workspace.organizationId,
          fields.coordinates
        );
      }
      await setAttachments(ctx, source, { id, type: 'destination' }, attachments);
      destinationMap.set(key, id);
      retained.add(id);
    })
  );
  return { destinationMap, retained };
}

async function reconcileActivities(
  ctx: MutationCtx,
  source: MutableTripCtx,
  snapshot: ParsedVersionSnapshot,
  sourceContent: Awaited<ReturnType<typeof VersionContent.load>>,
  destinationMap: Map<string, Id<'tripDestinations'>>,
  retainSourceKeys?: boolean
) {
  const existingByKey = new Map(
    sourceContent.activities.map((activity) => [
      sourceKey(activity.sourceId, activity._id),
      activity
    ])
  );
  const activityMap = new Map<string, Id<'tripDestinationActivities'>>();
  const activityDestinationMap = new Map<string, Id<'tripDestinations'>>();
  const retained = new Set<Id<'tripDestinationActivities'>>();

  await Promise.all(
    snapshot.activities.map(async ({ key, value }) => {
      const destinationId = destinationMap.get(value.destinationKey);
      if (!destinationId)
        throw new ConvexError('Applying this idea produced an invalid activity destination');
      const existing = existingByKey.get(key);
      const { attachments, destinationKey: _destinationKey, ...details } = value;
      const fields = { ...details, destinationId };
      const id =
        existing?._id ??
        (await ctx.db.insert('tripDestinationActivities', {
          ...fields,
          ...sourceLink(ctx, 'tripDestinationActivities', key, retainSourceKeys),
          tripId: source.trip._id
        }));
      const detailsChanged = existing ? !selectedFieldsMatch(existing, fields) : true;
      if (existing && (detailsChanged || existing.sourceId !== undefined)) {
        await ctx.db.patch('tripDestinationActivities', id, { ...fields, sourceId: undefined });
      }
      if (!existing || detailsChanged) {
        await TripLocations.setActivity(
          ctx,
          id,
          source.trip._id,
          source.workspace.organizationId,
          fields.coordinates
        );
      }
      await setAttachments(ctx, source, { id, type: 'activity' }, attachments);
      activityMap.set(key, id);
      activityDestinationMap.set(key, destinationId);
      retained.add(id);
    })
  );
  return { activityDestinationMap, activityMap, retained };
}

async function reconcileStays(
  ctx: MutationCtx,
  source: MutableTripCtx,
  snapshot: ParsedVersionSnapshot,
  sourceContent: Awaited<ReturnType<typeof VersionContent.load>>,
  destinationMap: Map<string, Id<'tripDestinations'>>,
  retainSourceKeys?: boolean
) {
  const existingByKey = new Map(
    sourceContent.stays.map((stay) => [sourceKey(stay.sourceId, stay._id), stay])
  );
  const retained = new Set<Id<'tripDestinationStays'>>();

  await Promise.all(
    snapshot.stays.map(async ({ key, value }) => {
      const destinationId = destinationMap.get(value.destinationKey);
      if (!destinationId)
        throw new ConvexError('Applying this idea produced an invalid stay destination');
      const existing = existingByKey.get(key);
      const { attachments, destinationKey: _destinationKey, ...details } = value;
      const fields = { ...details, destinationId };
      const id =
        existing?._id ??
        (await ctx.db.insert('tripDestinationStays', {
          ...fields,
          ...sourceLink(ctx, 'tripDestinationStays', key, retainSourceKeys),
          tripId: source.trip._id
        }));
      const detailsChanged = existing ? !selectedFieldsMatch(existing, fields) : true;
      if (existing && (detailsChanged || existing.sourceId !== undefined)) {
        await ctx.db.patch('tripDestinationStays', id, { ...fields, sourceId: undefined });
      }
      await setAttachments(ctx, source, { id, type: 'stay' }, attachments);
      retained.add(id);
    })
  );
  return retained;
}

async function reconcileBoundaryTransfers(
  ctx: MutationCtx,
  source: MutableTripCtx,
  snapshot: ParsedVersionSnapshot,
  sourceContent: Awaited<ReturnType<typeof VersionContent.load>>
) {
  const existingByBoundary = new Map(
    sourceContent.boundaryTransfers.map((transfer) => [transfer.boundary, transfer])
  );
  const retained = new Set<Id<'tripBoundaryTransfers'>>();
  await Promise.all(
    snapshot.boundaryTransfers.map(async ({ key, value }) => {
      if (key !== value.boundary)
        throw new ConvexError('Applying this idea produced invalid boundary travel');
      const existing = existingByBoundary.get(value.boundary);
      const { attachments, ...fields } = value;
      const id =
        existing?._id ??
        (await ctx.db.insert('tripBoundaryTransfers', { ...fields, tripId: source.trip._id }));
      const detailsChanged = existing ? !selectedFieldsMatch(existing, fields) : true;
      if (existing && (detailsChanged || existing.sourceId !== undefined)) {
        await ctx.db.patch('tripBoundaryTransfers', id, { ...fields, sourceId: undefined });
      }
      await setAttachments(ctx, source, { id, type: 'boundary_transfer' }, attachments);
      retained.add(id);
    })
  );
  return retained;
}

async function reconcileDestinationTransfers(
  ctx: MutationCtx,
  source: MutableTripCtx,
  snapshot: ParsedVersionSnapshot,
  sourceContent: Awaited<ReturnType<typeof VersionContent.load>>,
  destinationMap: Map<string, Id<'tripDestinations'>>,
  retainSourceKeys?: boolean
) {
  const existingByKey = new Map(
    sourceContent.destinationTransfers.map((transfer) => [
      sourceKey(transfer.sourceId, transfer._id),
      transfer
    ])
  );
  const retained = new Set<Id<'tripDestinationTransfers'>>();
  await Promise.all(
    snapshot.destinationTransfers.map(async ({ key, value }) => {
      const fromDestinationId = destinationMap.get(value.fromDestinationKey);
      const toDestinationId = destinationMap.get(value.toDestinationKey);
      if (!(fromDestinationId && toDestinationId)) {
        throw new ConvexError('Applying this idea produced an invalid destination route');
      }
      const existing = existingByKey.get(key);
      const {
        attachments,
        fromDestinationKey: _fromDestinationKey,
        toDestinationKey: _toDestinationKey,
        ...details
      } = value;
      const fields = { ...details, fromDestinationId, toDestinationId };
      const id =
        existing?._id ??
        (await ctx.db.insert('tripDestinationTransfers', {
          ...fields,
          ...sourceLink(ctx, 'tripDestinationTransfers', key, retainSourceKeys),
          tripId: source.trip._id
        }));
      const detailsChanged = existing ? !selectedFieldsMatch(existing, fields) : true;
      if (existing && (detailsChanged || existing.sourceId !== undefined)) {
        await ctx.db.patch('tripDestinationTransfers', id, { ...fields, sourceId: undefined });
      }
      await setAttachments(ctx, source, { id, type: 'destination_transfer' }, attachments);
      retained.add(id);
    })
  );
  return retained;
}

async function reconcileActivityTransfers(
  ctx: MutationCtx,
  source: MutableTripCtx,
  snapshot: ParsedVersionSnapshot,
  sourceContent: Awaited<ReturnType<typeof VersionContent.load>>,
  activityMap: Map<string, Id<'tripDestinationActivities'>>,
  activityDestinationMap: Map<string, Id<'tripDestinations'>>,
  retainSourceKeys?: boolean
) {
  const existingByKey = new Map(
    sourceContent.activityTransfers.map((transfer) => [
      sourceKey(transfer.sourceId, transfer._id),
      transfer
    ])
  );
  const retained = new Set<Id<'tripActivityTransfers'>>();
  await Promise.all(
    snapshot.activityTransfers.map(async ({ key, value }) => {
      const fromActivityId = activityMap.get(value.fromActivityKey);
      const toActivityId = activityMap.get(value.toActivityKey);
      const destinationId = activityDestinationMap.get(value.fromActivityKey);
      const toDestinationId = activityDestinationMap.get(value.toActivityKey);
      if (!(fromActivityId && toActivityId && destinationId) || destinationId !== toDestinationId) {
        throw new ConvexError('Applying this idea produced an invalid activity route');
      }
      const existing = existingByKey.get(key);
      const {
        attachments,
        fromActivityKey: _fromActivityKey,
        toActivityKey: _toActivityKey,
        ...details
      } = value;
      const fields = { ...details, destinationId, fromActivityId, toActivityId };
      const id =
        existing?._id ??
        (await ctx.db.insert('tripActivityTransfers', {
          ...fields,
          ...sourceLink(ctx, 'tripActivityTransfers', key, retainSourceKeys),
          tripId: source.trip._id
        }));
      const detailsChanged = existing ? !selectedFieldsMatch(existing, fields) : true;
      if (existing && (detailsChanged || existing.sourceId !== undefined)) {
        await ctx.db.patch('tripActivityTransfers', id, { ...fields, sourceId: undefined });
      }
      await setAttachments(ctx, source, { id, type: 'activity_transfer' }, attachments);
      retained.add(id);
    })
  );
  return retained;
}

async function removeMissingTransfers(
  ctx: MutationCtx,
  source: MutableTripCtx,
  sourceContent: Awaited<ReturnType<typeof VersionContent.load>>,
  retained: {
    activity: Set<Id<'tripActivityTransfers'>>;
    boundary: Set<Id<'tripBoundaryTransfers'>>;
    destination: Set<Id<'tripDestinationTransfers'>>;
  }
): Promise<void> {
  await Promise.all([
    ...sourceContent.activityTransfers.map(async (transfer) => {
      if (retained.activity.has(transfer._id)) return;
      await removeTarget(ctx, source.trip._id, { id: transfer._id, type: 'activity_transfer' });
      await ctx.db.delete('tripActivityTransfers', transfer._id);
    }),
    ...sourceContent.destinationTransfers.map(async (transfer) => {
      if (retained.destination.has(transfer._id)) return;
      await removeTarget(ctx, source.trip._id, { id: transfer._id, type: 'destination_transfer' });
      await ctx.db.delete('tripDestinationTransfers', transfer._id);
    }),
    ...sourceContent.boundaryTransfers.map(async (transfer) => {
      if (retained.boundary.has(transfer._id)) return;
      await removeTarget(ctx, source.trip._id, { id: transfer._id, type: 'boundary_transfer' });
      await ctx.db.delete('tripBoundaryTransfers', transfer._id);
    })
  ]);
}

// fallow-ignore-next-line complexity
async function applyVersionSnapshot(
  ctx: MutationCtx,
  source: MutableTripCtx,
  mergedSnapshot: VersionSnapshot,
  options?: ApplyOptions
): Promise<void> {
  const snapshot = VersionSnapshots.parse(mergedSnapshot);
  const sourceContent = await VersionContent.load(ctx, source.trip._id);
  await applyPackingSnapshot(
    source,
    snapshot.packingItems,
    sourceContent.packingItems,
    options?.retainSourceKeys
  );
  const destinations = await reconcileDestinations(
    ctx,
    source,
    snapshot,
    sourceContent,
    options?.retainSourceKeys
  );
  const [activities, stays] = await Promise.all([
    reconcileActivities(
      ctx,
      source,
      snapshot,
      sourceContent,
      destinations.destinationMap,
      options?.retainSourceKeys
    ),
    reconcileStays(
      ctx,
      source,
      snapshot,
      sourceContent,
      destinations.destinationMap,
      options?.retainSourceKeys
    )
  ]);
  const [activityTransfers, boundaryTransfers, destinationTransfers] = await Promise.all([
    reconcileActivityTransfers(
      ctx,
      source,
      snapshot,
      sourceContent,
      activities.activityMap,
      activities.activityDestinationMap,
      options?.retainSourceKeys
    ),
    reconcileBoundaryTransfers(ctx, source, snapshot, sourceContent),
    reconcileDestinationTransfers(
      ctx,
      source,
      snapshot,
      sourceContent,
      destinations.destinationMap,
      options?.retainSourceKeys
    )
  ]);
  await removeMissingTransfers(ctx, source, sourceContent, {
    activity: activityTransfers,
    boundary: boundaryTransfers,
    destination: destinationTransfers
  });

  await Promise.all(
    sourceContent.activities.map(async (activity) => {
      if (activities.retained.has(activity._id)) return;
      await removeTarget(ctx, source.trip._id, { id: activity._id, type: 'activity' });
      await TripLocations.removeActivity(ctx, activity._id);
      await ctx.db.delete('tripDestinationActivities', activity._id);
    })
  );
  await Promise.all(
    sourceContent.stays.map(async (stay) => {
      if (stays.has(stay._id)) return;
      await removeTarget(ctx, source.trip._id, { id: stay._id, type: 'stay' });
      await ctx.db.delete('tripDestinationStays', stay._id);
    })
  );
  await Promise.all(
    sourceContent.destinations.map(async (destination) => {
      if (destinations.retained.has(destination._id)) return;
      await removeTarget(ctx, source.trip._id, { id: destination._id, type: 'destination' });
      await TripLocations.removeDestination(ctx, destination._id);
      await DestinationCover.deleteStorage(ctx, destination);
      await ctx.db.delete('tripDestinations', destination._id);
    })
  );

  const { attachments, budget, cover, dateNotes, duration, startDate, ...tripDetails } =
    snapshot.trip;
  await setAttachments(ctx, source, { id: source.trip._id, type: 'trip' }, attachments);
  await patchTrip(source, {
    ...tripDetails,
    budget: budget ?? undefined,
    cover: cover ?? undefined,
    dateNotes: dateNotes ?? undefined,
    duration: duration ?? undefined,
    startDate: startDate ?? undefined,
    updatedAt: Math.max(Date.now(), source.trip.updatedAt + 1)
  });
  await TripLocations.setTrip(
    ctx,
    source.trip._id,
    source.workspace.organizationId,
    tripDetails.destination.status === 'known' && 'coordinates' in tripDetails.destination
      ? tripDetails.destination.coordinates
      : undefined
  );
  await DestinationCover.ensureForTrip(ctx, source.trip._id);
}

/** Writes a merged snapshot onto the shared trip. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class VersionApply {
  static snapshot = applyVersionSnapshot;
}
