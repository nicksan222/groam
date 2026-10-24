import { useCallback, useMemo } from 'react';
import { useQueryStatusFilter } from '@/features/workspace/hooks/use-query-status-filter';
import { useNavigate, useSearch } from '@/lib/navigation/router';
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

function parseTripListSearch(search: Record<string, unknown>): { status?: TripStatusFilter } {
  const status = tripStatusOptions.find((option) => option.value === search.status)?.value;
  return status ? { status } : {};
}

export function useTripListFilters({
  defaultStatus = DEFAULT_TRIP_STATUS_FILTER,
  emptyFilterMessage,
  trips
}: {
  defaultStatus?: TripStatusFilter;
  emptyFilterMessage: (filter: TripStatusFilter) => string;
  trips: TripListItem[];
}) {
  // `/trips?status=archived` opens on the archived trips, for example from an empty Home.
  const { status: initialStatus } = useSearch(parseTripListSearch);
  const filters = useQueryStatusFilter({
    defaultStatus,
    emptyFilterMessage,
    initialStatus,
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
  // The status shows in the URL (`?status=archived`), so the filtered list can be linked to.
  const navigate = useNavigate();
  const { clearStatusFilter, setQuery, setStatusFilter: setStoredStatus } = filters;
  const showStatusInUrl = useCallback(
    (status: TripStatusFilter) =>
      navigate({
        preserveScroll: true,
        replace: true,
        search: status === defaultStatus ? {} : { status },
        to: '/trips'
      }),
    [defaultStatus, navigate]
  );
  const setStatusFilter = useCallback(
    (status: TripStatusFilter) => {
      setStoredStatus(status);
      void showStatusInUrl(status);
    },
    [setStoredStatus, showStatusInUrl]
  );
  const clearFilters = useCallback(() => {
    setQuery('');
    clearStatusFilter();
    void showStatusInUrl(defaultStatus);
  }, [clearStatusFilter, defaultStatus, setQuery, showStatusInUrl]);

  return {
    ...filters,
    clearFilters,
    hasFilters,
    setStatusFilter,
    visibleTrips
  };
}
