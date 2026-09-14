import { api } from '@groam/backend/api';
import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useAction, useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useCallback, useMemo } from 'react';
import {
  storageIdFromUploadResponse,
  uploadToConvexStorage
} from '@/features/media/convex-storage-upload';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { errorMessage } from '@/lib/errors';
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
  TripBoundary,
  TripDestinationActivityInput,
  TripDestinationInput,
  TripDestinationSchedule,
  TripDetail,
  TripListItem,
  TripStayInput,
  TripTransferInput,
  TripUpdateInput,
  WorkspaceTripProposal
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
    async (input: CreateTripInput, cover: File | null) => {
      try {
        const coverStorageId = cover
          ? await uploadCover(cover, () => uploadMutation({}))
          : undefined;
        return await createMutation({
          input: {
            ...input,
            ...(coverStorageId ? { coverContentType: cover?.type, coverStorageId } : {})
          }
        });
      } catch (error: unknown) {
        toast.error(errorMessage(error, 'Unable to create trip'));
        return null;
      }
    },
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

export function useWorkspaceTripProposals(options?: { initialNumItems?: number }) {
  const { loadMore, results, status } = usePaginatedQuery(
    api.routes.trips.versions.workspace.list.run,
    {},
    { initialNumItems: options?.initialNumItems ?? 25 }
  );
  return {
    isLoading: status === 'LoadingFirstPage',
    loadMore,
    proposals: results,
    status
  };
}

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
type RunTripAction = (action: () => Promise<unknown>, fallback: string) => Promise<boolean>;

function useTripCoreActions(tripId: Id<'trips'>, run: RunTripAction) {
  const updateMutation = useMutation(api.routes.trips.update.run);
  const archiveMutation = useMutation(api.routes.trips.archive.run);
  const restoreMutation = useMutation(api.routes.trips.restore.run);

  return {
    archive: () => run(() => archiveMutation({ tripId }), 'Unable to archive trip'),
    restore: () => run(() => restoreMutation({ tripId }), 'Unable to restore trip'),
    update: (input: TripUpdateInput) =>
      run(() => updateMutation({ input, tripId }), 'Unable to update trip')
  };
}

function useDestinationActions(tripId: Id<'trips'>, run: RunTripAction) {
  const addMutation = useMutation(api.routes.trips.destinations.add.run);
  const moveMutation = useMutation(api.routes.trips.destinations.move.run);
  const removeMutation = useMutation(api.routes.trips.destinations.remove.run);
  const updateMutation = useMutation(api.routes.trips.destinations.update.run);

  return {
    addDestination: (input: TripDestinationInput) =>
      run(() => addMutation({ input, tripId }), 'Unable to add the destination'),
    moveDestination: (destinationId: Id<'tripDestinations'>, direction: 'earlier' | 'later') =>
      run(
        () => moveMutation({ destinationId, direction, tripId }),
        'Unable to move the destination'
      ),
    removeDestination: (destinationId: Id<'tripDestinations'>) =>
      run(() => removeMutation({ destinationId, tripId }), 'Unable to remove the destination'),
    updateDestination: (destinationId: Id<'tripDestinations'>, schedule: TripDestinationSchedule) =>
      run(
        () => updateMutation({ ...schedule, destinationId, tripId }),
        'Unable to update the destination plan'
      )
  };
}

function useActivityActions(tripId: Id<'trips'>, run: RunTripAction) {
  const addMutation = useMutation(api.routes.trips.destinations.activities.add.run);
  const removeMutation = useMutation(api.routes.trips.destinations.activities.remove.run);
  const reorderMutation = useMutation(api.routes.trips.destinations.activities.reorder.run);
  const updateMutation = useMutation(api.routes.trips.destinations.activities.update.run);

  return {
    addActivity: (destinationId: Id<'tripDestinations'>, input: TripDestinationActivityInput) =>
      run(() => addMutation({ destinationId, input, tripId }), 'Unable to add the activity'),
    removeActivity: (activityId: Id<'tripDestinationActivities'>) =>
      run(() => removeMutation({ activityId, tripId }), 'Unable to remove the activity'),
    reorderActivities: (destinationId: Id<'tripDestinations'>) =>
      run(() => reorderMutation({ destinationId, tripId }), 'Unable to reorder the activities'),
    updateActivity: (
      activityId: Id<'tripDestinationActivities'>,
      input: TripDestinationActivityInput
    ) => run(() => updateMutation({ activityId, input, tripId }), 'Unable to update the activity')
  };
}

function useStayActions(tripId: Id<'trips'>, run: RunTripAction) {
  const addMutation = useMutation(api.routes.trips.destinations.stays.add.run);
  const removeMutation = useMutation(api.routes.trips.destinations.stays.remove.run);
  const updateMutation = useMutation(api.routes.trips.destinations.stays.update.run);

  return {
    addStay: (destinationId: Id<'tripDestinations'>, input: TripStayInput) =>
      run(() => addMutation({ destinationId, input, tripId }), 'Unable to add the stay'),
    removeStay: (stayId: Id<'tripDestinationStays'>) =>
      run(() => removeMutation({ stayId, tripId }), 'Unable to remove the stay'),
    updateStay: (stayId: Id<'tripDestinationStays'>, input: TripStayInput) =>
      run(() => updateMutation({ input, stayId, tripId }), 'Unable to update the stay')
  };
}

function useTransferActions(tripId: Id<'trips'>, run: RunTripAction) {
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
      run(
        () => removeActivityMutation({ transferId, tripId }),
        'Unable to remove activity travel details'
      ),
    removeBoundaryTransfer: (transferId: Id<'tripBoundaryTransfers'>) =>
      run(
        () => removeBoundaryMutation({ transferId, tripId }),
        'Unable to remove arrival or return travel details'
      ),
    removeDestinationTransfer: (transferId: Id<'tripDestinationTransfers'>) =>
      run(
        () => removeDestinationMutation({ transferId, tripId }),
        'Unable to remove destination travel details'
      ),
    setActivityTransfer: (
      fromActivityId: Id<'tripDestinationActivities'>,
      toActivityId: Id<'tripDestinationActivities'>,
      input: TripTransferInput
    ) =>
      run(
        () => setActivityMutation({ fromActivityId, input, toActivityId, tripId }),
        'Unable to save activity travel details'
      ),
    setBoundaryTransfer: (boundary: TripBoundary, input: TripTransferInput) =>
      run(
        () => setBoundaryMutation({ boundary, input, tripId }),
        'Unable to save arrival or return travel details'
      ),
    setDestinationTransfer: (
      fromDestinationId: Id<'tripDestinations'>,
      toDestinationId: Id<'tripDestinations'>,
      input: TripTransferInput
    ) =>
      run(
        () => setDestinationMutation({ fromDestinationId, input, toDestinationId, tripId }),
        'Unable to save destination travel details'
      )
  };
}

function useCoverActions(tripId: Id<'trips'>, run: RunTripAction) {
  const coverMutation = useAction(api.routes.trips.cover.run);
  const retryMutation = useMutation(api.routes.trips.cover.retry.run);
  const uploadMutation = useMutation(api.routes.trips.upload.run);

  return {
    replaceCover: (cover: File) =>
      run(async () => {
        const storageId = await uploadCover(cover, () => uploadMutation({}));
        await coverMutation({ contentType: cover.type, storageId, tripId });
      }, 'Unable to replace the cover image'),
    retryCover: () => run(() => retryMutation({ tripId }), 'Unable to find another cover image')
  };
}

export function useTrip(tripId: Id<'trips'>) {
  const { activeOrganization } = useWorkspace();
  const tripResult = useQuery(api.routes.trips.find.run, { tripId });
  const exists = tripResult === undefined ? undefined : tripResult !== null;
  const groupMemberCount = activeOrganization.members.length;
  const trip: TripDetail | undefined = useMemo(
    () => (tripResult ? { ...tripResult, groupMemberCount } : undefined),
    [groupMemberCount, tripResult]
  );
  useEnsureDestinationCovers(tripId, trip);
  useEnsureTripCover(tripId, trip);
  const run = useCallback<RunTripAction>(async (action, fallback) => {
    try {
      await action();
      return true;
    } catch (error: unknown) {
      toast.error(errorMessage(error, fallback));
      return false;
    }
  }, []);

  return {
    ...useActivityActions(tripId, run),
    ...useCoverActions(tripId, run),
    ...useDestinationActions(tripId, run),
    ...useStayActions(tripId, run),
    ...useTransferActions(tripId, run),
    ...useTripCoreActions(tripId, run),
    exists,
    trip
  };
}
