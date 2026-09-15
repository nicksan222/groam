import { ConvexError } from 'convex/values';
import { TripActivityVersionModel } from '#convex/modules/travel/activities/schema';
import { TripDestinationVersionModel } from '#convex/modules/travel/destinations/schema';
import { TripPackingVersionModel } from '#convex/modules/travel/packing/schema';
import { TripStayVersionModel } from '#convex/modules/travel/stays/schema';
import { TripTransferVersionModel } from '#convex/modules/travel/transfers/schema';
import { TripVersionModel } from '#convex/modules/travel/trips/schema';
import { type TripVersionContent, VersionContent } from '#convex/modules/travel/versions/content';
import { VersionedModel } from '#convex/modules/travel/versions/fields/index';
import { VersionSnapshotFormat } from '#convex/modules/travel/versions/snapshot/format';
import {
  MAX_VERSION_FILES,
  MAX_VERSION_SNAPSHOT_BYTES,
  type VersionSnapshot
} from '#convex/modules/travel/versions/snapshot/types';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

export type {
  ParsedVersionSnapshot,
  SnapshotItem,
  VersionSnapshot,
  VersionSnapshotFile,
  WithAttachments
} from '#convex/modules/travel/versions/snapshot/types';
export {
  MAX_VERSION_FILES,
  MAX_VERSION_SNAPSHOT_BYTES
} from '#convex/modules/travel/versions/snapshot/types';

function sourceKey<T extends string>(sourceId: T | undefined, id: T): T {
  return sourceId ?? id;
}

function attachmentMediaIds(
  content: TripVersionContent,
  type: Doc<'attachmentReferences'>['target']['type'],
  id: string
): Id<'media'>[] {
  return content.attachments
    .filter((attachment) => attachment.target.type === type && attachment.target.id === id)
    .sort((left, right) => left.position - right.position)
    .map((attachment) => attachment.mediaId);
}

async function createVersionSnapshot(
  ctx: MutationCtx | QueryCtx,
  trip: Doc<'trips'>
): Promise<VersionSnapshot> {
  const content = await VersionContent.load(ctx, trip._id);
  const destinationKeyById = new Map(
    content.destinations.map((destination) => [
      destination._id,
      sourceKey(destination.sourceId, destination._id)
    ])
  );
  const activityKeyById = new Map(
    content.activities.map((activity) => [activity._id, sourceKey(activity.sourceId, activity._id)])
  );
  const files = [
    {
      path: 'trip.json',
      value: VersionedModel.serialize(TripVersionModel, {
        attachments: attachmentMediaIds(content, 'trip', trip._id),
        budget: trip.budget ?? null,
        cover: trip.cover ?? null,
        currency: trip.currency,
        dateNotes: trip.dateNotes ?? null,
        destination: trip.destination,
        duration: trip.duration ?? null,
        name: trip.name,
        startDate: trip.startDate ?? null
      })
    },
    ...content.destinations.map((destination) => ({
      path: `destinations/${sourceKey(destination.sourceId, destination._id)}.json`,
      value: VersionedModel.serialize(TripDestinationVersionModel, {
        attachments: attachmentMediaIds(content, 'destination', destination._id),
        coordinates: destination.coordinates,
        countryCode: destination.countryCode,
        dayNotes: destination.dayNotes,
        name: destination.name,
        placeId: destination.placeId,
        position: destination.position,
        schedule: destination.schedule
      })
    })),
    ...content.activities.map((activity) => ({
      path: `activities/${sourceKey(activity.sourceId, activity._id)}.json`,
      value: VersionedModel.serialize(TripActivityVersionModel, {
        address: activity.address,
        attachments: attachmentMediaIds(content, 'activity', activity._id),
        coordinates: activity.coordinates,
        cost: activity.cost,
        destinationKey: destinationKeyById.get(activity.destinationId) ?? activity.destinationId,
        notes: activity.notes,
        position: activity.position,
        schedule: activity.schedule,
        title: activity.title
      })
    })),
    ...content.packingItems.map((item) => ({
      path: `packing/${sourceKey(item.sourceId, item._id)}.json`,
      value: VersionedModel.serialize(TripPackingVersionModel, {
        label: item.label,
        packed: item.packed,
        sortOrder: item.sortOrder
      })
    })),
    ...content.stays.map((stay) => ({
      path: `stays/${sourceKey(stay.sourceId, stay._id)}.json`,
      value: VersionedModel.serialize(TripStayVersionModel, {
        address: stay.address,
        attachments: attachmentMediaIds(content, 'stay', stay._id),
        cost: stay.cost,
        destinationKey: destinationKeyById.get(stay.destinationId) ?? stay.destinationId,
        notes: stay.notes,
        position: stay.position,
        schedule: stay.schedule,
        title: stay.title
      })
    })),
    ...content.boundaryTransfers.map((transfer) => ({
      path: `transfers/boundary-${transfer.boundary}.json`,
      value: VersionedModel.serialize(TripTransferVersionModel, {
        attachments: attachmentMediaIds(content, 'boundary_transfer', transfer._id),
        boundary: transfer.boundary,
        cost: transfer.cost,
        duration: transfer.duration,
        mode: transfer.mode,
        notes: transfer.notes,
        timing: transfer.timing
      })
    })),
    ...content.destinationTransfers.map((transfer) => ({
      path: `transfers/destination-${sourceKey(transfer.sourceId, transfer._id)}.json`,
      value: VersionedModel.serialize(TripTransferVersionModel, {
        attachments: attachmentMediaIds(content, 'destination_transfer', transfer._id),
        cost: transfer.cost,
        duration: transfer.duration,
        fromDestinationKey:
          destinationKeyById.get(transfer.fromDestinationId) ?? transfer.fromDestinationId,
        mode: transfer.mode,
        notes: transfer.notes,
        timing: transfer.timing,
        toDestinationKey:
          destinationKeyById.get(transfer.toDestinationId) ?? transfer.toDestinationId
      })
    })),
    ...content.activityTransfers.map((transfer) => ({
      path: `transfers/activity-${sourceKey(transfer.sourceId, transfer._id)}.json`,
      value: VersionedModel.serialize(TripTransferVersionModel, {
        attachments: attachmentMediaIds(content, 'activity_transfer', transfer._id),
        cost: transfer.cost,
        duration: transfer.duration,
        fromActivityKey: activityKeyById.get(transfer.fromActivityId) ?? transfer.fromActivityId,
        mode: transfer.mode,
        notes: transfer.notes,
        timing: transfer.timing,
        toActivityKey: activityKeyById.get(transfer.toActivityId) ?? transfer.toActivityId
      })
    }))
  ].sort((left, right) => left.path.localeCompare(right.path));
  if (files.length > MAX_VERSION_FILES) {
    throw new ConvexError(`Trip versions support at most ${MAX_VERSION_FILES} version files`);
  }
  const bytes = files.reduce((total, file) => total + file.value.length * 3, 0);
  if (bytes > MAX_VERSION_SNAPSHOT_BYTES) {
    throw new ConvexError('This trip is too large for version control');
  }
  return { files };
}

/** Serializes and parses trip idea snapshots. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class VersionSnapshots {
  static create = createVersionSnapshot;
  static fromStored = VersionSnapshotFormat.fromStored;
  static match = VersionSnapshotFormat.match;
  static parse = VersionSnapshotFormat.parse;
}
