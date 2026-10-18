import type { Id } from '@groam/backend/data-model';
import { useEffect, useMemo } from 'react';
import { useTrips } from '@/features/trips/hooks/use-trips';

const PAGE_SIZE = 50;

/** Every active trip in the group (all pages), loaded only while `enabled`. */
export function useCreatableTrips(enabled: boolean) {
  const { isLoading, loadMore, status, trips } = useTrips(
    enabled ? { includeArchived: false, initialNumItems: PAGE_SIZE } : 'skip'
  );

  useEffect(() => {
    if (enabled && status === 'CanLoadMore') loadMore(PAGE_SIZE);
  }, [enabled, loadMore, status]);

  const options = useMemo(
    () =>
      trips
        .filter((trip) => trip.archivedAt === null)
        .map((trip): { id: Id<'trips'>; name: string } => ({ id: trip.id, name: trip.name })),
    [trips]
  );

  return {
    isLoading: isLoading || status === 'CanLoadMore' || status === 'LoadingMore',
    trips: options
  };
}
