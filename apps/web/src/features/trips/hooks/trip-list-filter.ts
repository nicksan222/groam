import type { TripListFilters, TripListItem, TripStatusFilter } from '@/types/trips';

export const DEFAULT_TRIP_STATUS_FILTER = 'active';

export type { TripListFilters, TripListItem, TripStatusFilter };

export const tripStatusFilterLabels: Record<TripStatusFilter, string> = {
  active: 'Active',
  all: 'All',
  archived: 'Archived'
};

function matchesTripStatus(trip: TripListItem, filter: TripStatusFilter) {
  if (filter === 'active') return trip.archivedAt === null;
  if (filter === 'archived') return trip.archivedAt !== null;
  return true;
}

function tripMatchesQuery(trip: TripListItem, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized === '') return true;

  return `${trip.name} ${trip.destination ?? ''} ${trip.dateNotes ?? ''} ${trip.nextAction}`
    .toLocaleLowerCase()
    .includes(normalized);
}

export function filterWorkspaceTrips(trips: TripListItem[], filters: TripListFilters) {
  return trips.filter(
    (trip) => matchesTripStatus(trip, filters.status) && tripMatchesQuery(trip, filters.query)
  );
}
