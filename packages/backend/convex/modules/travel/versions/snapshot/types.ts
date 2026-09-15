import type { VersionSnapshotInput } from '#convex/modules/travel/versions/validators';
import type { Doc, Id } from '#convex-generated/dataModel';

export type VersionSnapshot = VersionSnapshotInput;
export type VersionSnapshotFile = VersionSnapshot['files'][number];

export type SnapshotItem<Value> = { key: string; value: Value };
export type WithAttachments<Value> = Value & { attachments: Id<'media'>[] };

export type ParsedVersionSnapshot = {
  activities: Array<
    SnapshotItem<
      WithAttachments<
        Pick<
          Doc<'tripDestinationActivities'>,
          'address' | 'coordinates' | 'cost' | 'notes' | 'position' | 'schedule' | 'title'
        > & { destinationKey: string }
      >
    >
  >;
  activityTransfers: Array<
    SnapshotItem<
      WithAttachments<
        Pick<Doc<'tripActivityTransfers'>, 'cost' | 'duration' | 'mode' | 'notes' | 'timing'> & {
          fromActivityKey: string;
          toActivityKey: string;
        }
      >
    >
  >;
  boundaryTransfers: Array<
    SnapshotItem<
      WithAttachments<
        Pick<
          Doc<'tripBoundaryTransfers'>,
          'boundary' | 'cost' | 'duration' | 'mode' | 'notes' | 'timing'
        >
      >
    >
  >;
  destinations: Array<
    SnapshotItem<
      WithAttachments<
        Pick<
          Doc<'tripDestinations'>,
          'coordinates' | 'countryCode' | 'dayNotes' | 'name' | 'placeId' | 'position' | 'schedule'
        >
      >
    >
  >;
  destinationTransfers: Array<
    SnapshotItem<
      WithAttachments<
        Pick<Doc<'tripDestinationTransfers'>, 'cost' | 'duration' | 'mode' | 'notes' | 'timing'> & {
          fromDestinationKey: string;
          toDestinationKey: string;
        }
      >
    >
  >;
  packingItems: Array<
    SnapshotItem<Pick<Doc<'tripPackingItems'>, 'label' | 'packed' | 'sortOrder'>>
  >;
  stays: Array<
    SnapshotItem<
      WithAttachments<
        Pick<
          Doc<'tripDestinationStays'>,
          'address' | 'cost' | 'notes' | 'position' | 'schedule' | 'title'
        > & { destinationKey: string }
      >
    >
  >;
  trip: WithAttachments<{
    budget: Doc<'trips'>['budget'] | null;
    cover: Doc<'trips'>['cover'] | null;
    currency: Doc<'trips'>['currency'];
    dateNotes: Doc<'trips'>['dateNotes'] | null;
    destination: Doc<'trips'>['destination'];
    duration: Doc<'trips'>['duration'] | null;
    name: string;
    startDate: Doc<'trips'>['startDate'] | null;
  }>;
};

export const MAX_VERSION_FILES = 525;
export const MAX_VERSION_SNAPSHOT_BYTES = 800 * 1024;
