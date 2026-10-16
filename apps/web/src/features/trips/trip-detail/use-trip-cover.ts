import { useState } from 'react';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import type { TripCover, TripCoverSource } from '@/types/trip-cover';

/** Shared cover state: image load failures, pending status, and the refresh action. */
export function useTripCover(trip: TripCoverSource, retryCover: () => Promise<boolean>): TripCover {
  const retrying = useAsyncPending();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const src = trip.coverUrl && trip.coverUrl !== failedSource ? trip.coverUrl : null;
  const isPending = trip.coverStatus === 'pending';
  const isBusy = retrying.isPending || isPending;
  const canRefresh =
    trip.permissions.canEditCover &&
    (isBusy || trip.coverStatus === 'failed' || trip.coverAttribution !== null);

  let refreshLabel = 'Find another image';
  if (isBusy) refreshLabel = 'Finding another image';
  else if (trip.coverStatus === 'failed') refreshLabel = 'Retry cover';

  return {
    canRefresh,
    isBusy,
    onImageError: () => setFailedSource(trip.coverUrl),
    refresh: () => void retrying.run(retryCover),
    refreshLabel,
    showPending: isPending && src === null,
    src
  };
}
