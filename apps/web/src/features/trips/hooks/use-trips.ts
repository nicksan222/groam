import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { useAction, useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useCallback, useMemo } from 'react';
import {
  storageIdFromUploadResponse,
  uploadToConvexStorage
} from '@/features/media/convex-storage-upload';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { attempt, attemptValue } from '@/lib/errors';
import type {
  CreateTripInput,
  TripBoundary,
  TripDestinationActivityInput,
  TripDestinationInput,
  TripDestinationSchedule,
  TripDetail,
  TripStayInput,
  TripTransferInput,
  TripUpdateInput
} from '@/types/trips';
import { useEnsureDestinationCovers } from './use-ensure-destination-covers';
import { useEnsureTripCover } from './use-ensure-trip-cover';

export type {
  CreateTripInput,
  TransportMode,
  TripDestinationActivityInput,
  TripDestinationInput,
  TripDestinationSchedule,
  TripDetail,
  TripListItem,
  TripStayInput,
  TripTransferInput,
  TripUpdateInput
} from '@/types/trips';

const MAX_COVER_BYTES = 25 * 1024 * 1024;
const SUPPORTED_COVER_CONTENT_TYPES = new Set([
  'image/avif',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

function assertValidCover(file: File) {
  if (!SUPPORTED_COVER_CONTENT_TYPES.has(file.type) || file.size > MAX_COVER_BYTES) {
    throw new Error('Choose a JPEG, PNG, WebP, or AVIF image that is 25 MB or smaller');
  }
}

async function uploadCover(file: File, generateUploadUrl: () => Promise<string>) {
  assertValidCover(file);
  const uploadUrl = await generateUploadUrl();
  const response = await uploadToConvexStorage(uploadUrl, file, file.type);
  if (!response.ok) throw new Error('Unable to upload the cover image');
  return storageIdFromUploadResponse(await response.json());
}

export function useTrips(
  options?: { includeArchived?: boolean; initialNumItems?: number } | 'skip'
) {
  const skip = options === 'skip';
  const { loadMore, results, status } = usePaginatedQuery(
    api.routes.trips.list.run,
    skip ? 'skip' : { includeArchived: options?.includeArchived ?? true },
    { initialNumItems: skip ? 25 : (options?.initialNumItems ?? 25) }
  );
  const createMutation = useAction(api.routes.trips.create.run);
  const uploadMutation = useMutation(api.routes.trips.upload.run);

  const createTrip = useCallback(
    (input: CreateTripInput, cover: File | null) =>
      attemptValue(async () => {
        const coverStorageId = cover
          ? await uploadCover(cover, () => uploadMutation({}))
          : undefined;
        return createMutation({
          input: {
            ...input,
            ...(coverStorageId ? { coverContentType: cover?.type, coverStorageId } : {})
          }
        });
      }, 'Unable to create trip'),
    [createMutation, uploadMutation]
  );

  return {
    createTrip,
    isLoading: status === 'LoadingFirstPage',
    loadMore,
    status,
    trips: results
  };
}

function useTripCoreActions(tripId: Id<'trips'>) {
  const updateMutation = useMutation(api.routes.trips.update.run);
  const archiveMutation = useMutation(api.routes.trips.archive.run);
  const restoreMutation = useMutation(api.routes.trips.restore.run);

  return {
    archive: () => attempt(() => archiveMutation({ tripId }), 'Unable to archive trip'),
    restore: () => attempt(() => restoreMutation({ tripId }), 'Unable to restore trip'),
    update: (input: TripUpdateInput) =>
      attempt(() => updateMutation({ input, tripId }), 'Unable to update trip')
  };
}

function useDestinationActions(tripId: Id<'trips'>) {
  const addMutation = useMutation(api.routes.trips.destinations.add.run);
  const moveMutation = useMutation(api.routes.trips.destinations.move.run);
  const removeMutation = useMutation(api.routes.trips.destinations.remove.run);
  const updateMutation = useMutation(api.routes.trips.destinations.update.run);

  return {
    addDestination: (input: TripDestinationInput) =>
      attempt(() => addMutation({ input, tripId }), 'Unable to add the destination'),
    moveDestination: (destinationId: Id<'tripDestinations'>, direction: 'earlier' | 'later') =>
      attempt(
        () => moveMutation({ destinationId, direction, tripId }),
        'Unable to move the destination'
      ),
    removeDestination: (destinationId: Id<'tripDestinations'>) =>
      attempt(() => removeMutation({ destinationId, tripId }), 'Unable to remove the destination'),
    updateDestination: (destinationId: Id<'tripDestinations'>, schedule: TripDestinationSchedule) =>
      attempt(
        () => updateMutation({ ...schedule, destinationId, tripId }),
        'Unable to update the destination plan'
      )
  };
}

function useActivityActions(tripId: Id<'trips'>) {
  const addMutation = useMutation(api.routes.trips.destinations.activities.add.run);
  const removeMutation = useMutation(api.routes.trips.destinations.activities.remove.run);
  const reorderMutation = useMutation(api.routes.trips.destinations.activities.reorder.run);
  const updateMutation = useMutation(api.routes.trips.destinations.activities.update.run);

  return {
    addActivity: (destinationId: Id<'tripDestinations'>, input: TripDestinationActivityInput) =>
      attempt(() => addMutation({ destinationId, input, tripId }), 'Unable to add the activity'),
    removeActivity: (activityId: Id<'tripDestinationActivities'>) =>
      attempt(() => removeMutation({ activityId, tripId }), 'Unable to remove the activity'),
    reorderActivities: (destinationId: Id<'tripDestinations'>) =>
      attempt(() => reorderMutation({ destinationId, tripId }), 'Unable to reorder the activities'),
    updateActivity: (
      activityId: Id<'tripDestinationActivities'>,
      input: TripDestinationActivityInput
    ) =>
      attempt(() => updateMutation({ activityId, input, tripId }), 'Unable to update the activity')
  };
}

function useStayActions(tripId: Id<'trips'>) {
  const addMutation = useMutation(api.routes.trips.destinations.stays.add.run);
  const removeMutation = useMutation(api.routes.trips.destinations.stays.remove.run);
  const updateMutation = useMutation(api.routes.trips.destinations.stays.update.run);

  return {
    addStay: (destinationId: Id<'tripDestinations'>, input: TripStayInput) =>
      attempt(() => addMutation({ destinationId, input, tripId }), 'Unable to add the stay'),
    removeStay: (stayId: Id<'tripDestinationStays'>) =>
      attempt(() => removeMutation({ stayId, tripId }), 'Unable to remove the stay'),
    updateStay: (stayId: Id<'tripDestinationStays'>, input: TripStayInput) =>
      attempt(() => updateMutation({ input, stayId, tripId }), 'Unable to update the stay')
  };
}

function useTransferActions(tripId: Id<'trips'>) {
  const setBoundaryMutation = useMutation(api.routes.trips.transfers.set.run);
  const removeBoundaryMutation = useMutation(api.routes.trips.transfers.remove.run);
  const setDestinationMutation = useMutation(api.routes.trips.destinations.transfers.set.run);
  const removeDestinationMutation = useMutation(api.routes.trips.destinations.transfers.remove.run);
  const setActivityMutation = useMutation(
    api.routes.trips.destinations.activities.transfers.set.run
  );
  const removeActivityMutation = useMutation(
    api.routes.trips.destinations.activities.transfers.remove.run
  );

  return {
    removeActivityTransfer: (transferId: Id<'tripActivityTransfers'>) =>
      attempt(
        () => removeActivityMutation({ transferId, tripId }),
        'Unable to remove activity travel details'
      ),
    removeBoundaryTransfer: (transferId: Id<'tripBoundaryTransfers'>) =>
      attempt(
        () => removeBoundaryMutation({ transferId, tripId }),
        'Unable to remove arrival or return travel details'
      ),
    removeDestinationTransfer: (transferId: Id<'tripDestinationTransfers'>) =>
      attempt(
        () => removeDestinationMutation({ transferId, tripId }),
        'Unable to remove destination travel details'
      ),
    setActivityTransfer: (
      fromActivityId: Id<'tripDestinationActivities'>,
      toActivityId: Id<'tripDestinationActivities'>,
      input: TripTransferInput
    ) =>
      attempt(
        () => setActivityMutation({ fromActivityId, input, toActivityId, tripId }),
        'Unable to save activity travel details'
      ),
    setBoundaryTransfer: (boundary: TripBoundary, input: TripTransferInput) =>
      attempt(
        () => setBoundaryMutation({ boundary, input, tripId }),
        'Unable to save arrival or return travel details'
      ),
    setDestinationTransfer: (
      fromDestinationId: Id<'tripDestinations'>,
      toDestinationId: Id<'tripDestinations'>,
      input: TripTransferInput
    ) =>
      attempt(
        () => setDestinationMutation({ fromDestinationId, input, toDestinationId, tripId }),
        'Unable to save destination travel details'
      )
  };
}

/** The trip alone, without the actions and cover upkeep of `useTrip`; skipped without an id. */
export function useTripDetail(tripId: Id<'trips'> | undefined) {
  const { activeOrganization } = useWorkspace();
  const tripResult = useQuery(api.routes.trips.find.run, tripId ? { tripId } : 'skip');
  const groupMemberCount = activeOrganization.members.length;
  const trip: TripDetail | undefined = useMemo(
    () => (tripResult ? { ...tripResult, groupMemberCount } : undefined),
    [groupMemberCount, tripResult]
  );
  return { exists: tripResult === undefined ? undefined : tripResult !== null, trip };
}

export function useTrip(tripId: Id<'trips'>) {
  const { exists, trip } = useTripDetail(tripId);
  useEnsureDestinationCovers(tripId, trip);
  useEnsureTripCover(tripId, trip);

  return {
    ...useActivityActions(tripId),
    ...useDestinationActions(tripId),
    ...useStayActions(tripId),
    ...useTransferActions(tripId),
    ...useTripCoreActions(tripId),
    exists,
    trip
  };
}
