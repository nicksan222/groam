import { ConvexError } from 'convex/values';
import { Attachments } from '#convex/modules/media/attachments/index';
import { DestinationCover } from '#convex/modules/travel/covers/destination/index';
import { TripLocations } from '#convex/modules/travel/locations/index';
import type { MutableTripCtx } from '#convex/modules/travel/trips/ctx';
import { type TripVersionContent, VersionContent } from '#convex/modules/travel/versions/content';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';

type Target = Exclude<Doc<'attachmentReferences'>['target'], { type: 'comment' }>;

function targetKey(target: Doc<'attachmentReferences'>['target']): string {
  return `${target.type}:${target.id}`;
}

async function copyTargetAttachments({
  ctx,
  sourceContent,
  sourceTarget,
  target,
  targetTripId,
  organizationId
}: {
  ctx: MutationCtx;
  sourceContent: TripVersionContent;
  sourceTarget: Target;
  target: Target;
  targetTripId: Id<'trips'>;
  organizationId: string;
}): Promise<boolean> {
  const mediaIds = sourceContent.attachments
    .filter((attachment) => targetKey(attachment.target) === targetKey(sourceTarget))
    .sort((left, right) => left.position - right.position)
    .map((attachment) => attachment.mediaId);
  return await Attachments.setTarget(ctx, {
    label: 'Version items',
    maximum: 10,
    mediaIds,
    organizationId,
    target,
    tripId: targetTripId
  });
}

// fallow-ignore-next-line complexity
export async function cloneTripContent(
  ctx: MutationCtx,
  source: MutableTripCtx,
  workingTripId: Id<'trips'>
): Promise<void> {
  const content = await VersionContent.load(ctx, source.trip._id);
  await Promise.all(
    content.packingItems.map((item) =>
      ctx.db.insert('tripPackingItems', {
        label: item.label,
        organizationId: source.workspace.organizationId,
        packed: item.packed,
        sortOrder: item.sortOrder,
        sourceId: item._id,
        tripId: workingTripId,
        updatedAt: item.updatedAt
      })
    )
  );
  const destinationIds = new Map<Id<'tripDestinations'>, Id<'tripDestinations'>>();
  const activityIds = new Map<Id<'tripDestinationActivities'>, Id<'tripDestinationActivities'>>();
  await copyTargetAttachments({
    ctx,
    organizationId: source.workspace.organizationId,
    sourceContent: content,
    sourceTarget: { id: source.trip._id, type: 'trip' },
    target: { id: workingTripId, type: 'trip' },
    targetTripId: workingTripId
  });

  const copiedDestinations = await Promise.all(
    content.destinations.map(async (destination) => {
      const destinationId = await ctx.db.insert('tripDestinations', {
        coordinates: destination.coordinates,
        countryCode: destination.countryCode,
        dayNotes: destination.dayNotes,
        name: destination.name,
        placeId: destination.placeId,
        position: destination.position,
        schedule: destination.schedule,
        sourceId: destination._id,
        tripId: workingTripId
      });
      await TripLocations.setDestination(ctx, {
        coordinates: destination.coordinates,
        destinationId,
        organizationId: source.workspace.organizationId,
        tripId: workingTripId
      });
      await copyTargetAttachments({
        ctx,
        organizationId: source.workspace.organizationId,
        sourceContent: content,
        sourceTarget: { id: destination._id, type: 'destination' },
        target: { id: destinationId, type: 'destination' },
        targetTripId: workingTripId
      });
      return [destination._id, destinationId] as const;
    })
  );
  for (const [sourceId, destinationId] of copiedDestinations) {
    destinationIds.set(sourceId, destinationId);
  }

  const copiedActivities = await Promise.all(
    content.activities.map(async (activity) => {
      const destinationId = destinationIds.get(activity.destinationId);
      if (!destinationId) throw new ConvexError('Unable to copy trip activity destination');
      const activityId = await ctx.db.insert('tripDestinationActivities', {
        address: activity.address,
        coordinates: activity.coordinates,
        cost: activity.cost,
        destinationId,
        notes: activity.notes,
        position: activity.position,
        schedule: activity.schedule,
        sourceId: activity._id,
        title: activity.title,
        tripId: workingTripId
      });
      await TripLocations.setActivity(ctx, {
        activityId,
        coordinates: activity.coordinates,
        organizationId: source.workspace.organizationId,
        tripId: workingTripId
      });
      await copyTargetAttachments({
        ctx,
        organizationId: source.workspace.organizationId,
        sourceContent: content,
        sourceTarget: { id: activity._id, type: 'activity' },
        target: { id: activityId, type: 'activity' },
        targetTripId: workingTripId
      });
      return [activity._id, activityId] as const;
    })
  );
  for (const [sourceId, activityId] of copiedActivities) {
    activityIds.set(sourceId, activityId);
  }

  await Promise.all(
    content.stays.map(async (stay) => {
      const destinationId = destinationIds.get(stay.destinationId);
      if (!destinationId) throw new ConvexError('Unable to copy trip stay destination');
      const stayId = await ctx.db.insert('tripDestinationStays', {
        address: stay.address,
        cost: stay.cost,
        destinationId,
        notes: stay.notes,
        position: stay.position,
        schedule: stay.schedule,
        sourceId: stay._id,
        title: stay.title,
        tripId: workingTripId
      });
      await copyTargetAttachments({
        ctx,
        organizationId: source.workspace.organizationId,
        sourceContent: content,
        sourceTarget: { id: stay._id, type: 'stay' },
        target: { id: stayId, type: 'stay' },
        targetTripId: workingTripId
      });
    })
  );

  await Promise.all(
    content.boundaryTransfers.map(async (transfer) => {
      const transferId = await ctx.db.insert('tripBoundaryTransfers', {
        boundary: transfer.boundary,
        cost: transfer.cost,
        duration: transfer.duration,
        mode: transfer.mode,
        notes: transfer.notes,
        sourceId: transfer._id,
        timing: transfer.timing,
        tripId: workingTripId
      });
      await copyTargetAttachments({
        ctx,
        organizationId: source.workspace.organizationId,
        sourceContent: content,
        sourceTarget: { id: transfer._id, type: 'boundary_transfer' },
        target: { id: transferId, type: 'boundary_transfer' },
        targetTripId: workingTripId
      });
    })
  );

  await Promise.all(
    content.destinationTransfers.map(async (transfer) => {
      const fromDestinationId = destinationIds.get(transfer.fromDestinationId);
      const toDestinationId = destinationIds.get(transfer.toDestinationId);
      if (!(fromDestinationId && toDestinationId)) {
        throw new ConvexError('Unable to copy destination travel');
      }
      const transferId = await ctx.db.insert('tripDestinationTransfers', {
        cost: transfer.cost,
        duration: transfer.duration,
        fromDestinationId,
        mode: transfer.mode,
        notes: transfer.notes,
        sourceId: transfer._id,
        timing: transfer.timing,
        toDestinationId,
        tripId: workingTripId
      });
      await copyTargetAttachments({
        ctx,
        organizationId: source.workspace.organizationId,
        sourceContent: content,
        sourceTarget: { id: transfer._id, type: 'destination_transfer' },
        target: { id: transferId, type: 'destination_transfer' },
        targetTripId: workingTripId
      });
    })
  );

  await Promise.all(
    content.activityTransfers.map(async (transfer) => {
      const fromActivityId = activityIds.get(transfer.fromActivityId);
      const toActivityId = activityIds.get(transfer.toActivityId);
      const destinationId = destinationIds.get(transfer.destinationId);
      if (!(fromActivityId && toActivityId && destinationId)) {
        throw new ConvexError('Unable to copy activity travel');
      }
      const transferId = await ctx.db.insert('tripActivityTransfers', {
        cost: transfer.cost,
        destinationId,
        duration: transfer.duration,
        fromActivityId,
        mode: transfer.mode,
        notes: transfer.notes,
        sourceId: transfer._id,
        timing: transfer.timing,
        toActivityId,
        tripId: workingTripId
      });
      await copyTargetAttachments({
        ctx,
        organizationId: source.workspace.organizationId,
        sourceContent: content,
        sourceTarget: { id: transfer._id, type: 'activity_transfer' },
        target: { id: transferId, type: 'activity_transfer' },
        targetTripId: workingTripId
      });
    })
  );

  if (source.trip.destination.status === 'known' && 'coordinates' in source.trip.destination) {
    await TripLocations.setTrip(ctx, {
      coordinates: source.trip.destination.coordinates,
      organizationId: source.workspace.organizationId,
      tripId: workingTripId
    });
  }
  await DestinationCover.ensureForTrip(ctx, workingTripId);
}
