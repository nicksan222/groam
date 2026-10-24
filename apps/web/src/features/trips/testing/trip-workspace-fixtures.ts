import type { Mock } from 'vite-plus/test';
import type { TripListItem } from '@/features/trips/hooks/use-trips';

const FIXTURE_NOW = Date.UTC(2026, 7, 17);

export function trip(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    archivedAt: null,
    canParticipate: true,
    coverUrl: null,
    dateNotes: 'Late September',
    destination: 'Lisbon',
    favorite: false,
    id: 'trips:trip-1' as TripListItem['id'],
    shortId: 'trpabc',
    lastUpdatedAt: FIXTURE_NOW,
    name: 'Atlantic week',
    nextAction: 'Continue planning together',
    outstandingActionCount: 0,
    ...overrides
  };
}

export function mockTripWorkspace(
  trips: Record<'useTrips', Mock<(...args: unknown[]) => unknown>>,
  { isLoading = false, tripItems = [] as TripListItem[] } = {}
) {
  trips.useTrips.mockReturnValue({
    createTrip: () => Promise.resolve(null),
    isLoading,
    loadMore: () => undefined,
    status: 'Exhausted',
    trips: tripItems
  });
}

/** Factory for the `workspace-state` module mock shared by the home and trip list views. */
export function workspaceStateMock() {
  return {
    useWorkspace: () => ({
      activeOrganization: { id: 'org-acme', name: 'Acme Labs' },
      session: { user: { id: 'user-alex' } }
    })
  };
}

/** Factory for the `use-trips` module mock, delegating to the hoisted spies. */
export function tripsHookMock(trips: Record<'useTrips', Mock<(...args: unknown[]) => unknown>>) {
  return {
    useTrips: (...args: unknown[]) => trips.useTrips(...args)
  };
}
