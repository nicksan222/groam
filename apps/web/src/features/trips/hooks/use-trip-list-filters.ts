import { useCallback, useMemo } from 'react';
import { useQueryStatusFilter } from '@/features/workspace/hooks/use-query-status-filter';
import {
  DEFAULT_TRIP_STATUS_FILTER,
  filterWorkspaceTrips,
  type TripListItem,
  type TripStatusFilter,
  tripStatusFilterLabels
} from './trip-list-filter';

export const tripStatusOptions = (
  ['active', 'archived', 'all'] as const satisfies readonly TripStatusFilter[]
).map((value) => ({ label: tripStatusFilterLabels[value], value }));

export function useTripListFilters({
  defaultStatus = DEFAULT_TRIP_STATUS_FILTER,
  emptyFilterMessage,
  trips
}: {
  defaultStatus?: TripStatusFilter;
  emptyFilterMessage: (filter: TripStatusFilter) => string;
  trips: TripListItem[];
}) {
  const filters = useQueryStatusFilter({
    defaultStatus,
    emptyFilterMessage,
    noMatchMessage: 'No matching trips.'
  });
  const visibleTrips = useMemo(
    () =>
      filterWorkspaceTrips(trips, {
        query: filters.query,
        status: filters.statusFilter
      }),
    [filters.query, filters.statusFilter, trips]
  );
  const hasFilters = filters.query.trim() !== '' || filters.hasExtraFilters;
  const clearFilters = useCallback(() => {
    filters.setQuery('');
    filters.clearStatusFilter();
  }, [filters]);

  return {
    ...filters,
    clearFilters,
    hasFilters,
    visibleTrips
  };
}
