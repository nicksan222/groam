import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
import type { TripListItem } from '@/types/trips';
import { DEFAULT_TRIP_STATUS_FILTER, filterWorkspaceTrips } from './trip-list-filter';

function trip(value: Partial<TripListItem> & Pick<TripListItem, 'id' | 'name'>): TripListItem {
  return {
    archivedAt: null,
    coverUrl: null,
    dateNotes: 'Late September',
    destination: 'Lisbon',
    favorite: false,
    lastUpdatedAt: 1,
    nextAction: 'Continue planning together',
    outstandingActionCount: 0,
    ...value
  };
}

const trips = [
  trip({ id: 'trips:active' as Id<'trips'>, name: 'Atlantic week' }),
  trip({
    archivedAt: 10,
    id: 'trips:archived' as Id<'trips'>,
    name: 'Last year'
  })
];

const defaultFilters = { query: '', status: DEFAULT_TRIP_STATUS_FILTER } as const;

describe('filterWorkspaceTrips', () => {
  test('defaults to active trips', () => {
    expect(filterWorkspaceTrips(trips, defaultFilters).map(({ id }) => id)).toEqual([
      'trips:active'
    ]);
  });

  test('filters archived trips', () => {
    expect(
      filterWorkspaceTrips(trips, { query: '', status: 'archived' }).map(({ id }) => id)
    ).toEqual(['trips:archived']);
  });

  test('includes every trip when the status filter is all', () => {
    expect(filterWorkspaceTrips(trips, { query: '', status: 'all' }).map(({ id }) => id)).toEqual([
      'trips:active',
      'trips:archived'
    ]);
  });

  test('searches name, destination, date notes, and next action case-insensitively', () => {
    expect(
      filterWorkspaceTrips(trips, { query: 'LISBON', status: 'all' }).map(({ id }) => id)
    ).toEqual(['trips:active', 'trips:archived']);
    expect(
      filterWorkspaceTrips(trips, { query: 'last year', status: 'all' }).map(({ id }) => id)
    ).toEqual(['trips:archived']);
  });

  test('combines search with the status filter', () => {
    expect(filterWorkspaceTrips(trips, { query: 'last year', status: 'active' })).toEqual([]);
    expect(
      filterWorkspaceTrips(trips, { query: 'last year', status: 'archived' }).map(({ id }) => id)
    ).toEqual(['trips:archived']);
  });
});
