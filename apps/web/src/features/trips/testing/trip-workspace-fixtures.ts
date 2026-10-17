import type { Mock } from 'vite-plus/test';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';

export const FIXTURE_NOW = Date.UTC(2026, 7, 17);

export function trip(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    archivedAt: null,
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

export function proposal(overrides: Partial<WorkspaceTripProposal> = {}): WorkspaceTripProposal {
  return {
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    ideaName: 'coast-day',
    id: 'tripProposals:idea-1' as WorkspaceTripProposal['id'],
    reviewRequested: false,
    sourceTripId: 'trips:trip-1' as WorkspaceTripProposal['sourceTripId'],
    sourceTripName: 'Atlantic week',
    status: 'in_review',
    title: 'Add a coast day',
    updatedAt: FIXTURE_NOW,
    workingTripId: 'trips:working-1' as WorkspaceTripProposal['workingTripId'],
    ...overrides
  };
}

export function mockTripWorkspace(
  trips: Record<'useTrips' | 'useWorkspaceTripProposals', Mock<(...args: unknown[]) => unknown>>,
  {
    isLoading = false,
    proposals = [] as WorkspaceTripProposal[],
    tripItems = [] as TripListItem[]
  } = {}
) {
  trips.useTrips.mockReturnValue({
    createTrip: () => Promise.resolve(null),
    isLoading,
    loadMore: () => undefined,
    status: 'Exhausted',
    trips: tripItems
  });
  trips.useWorkspaceTripProposals.mockReturnValue({
    isLoading,
    loadMore: () => undefined,
    proposals,
    status: 'Exhausted'
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
export function tripsHookMock(
  trips: Record<'useTrips' | 'useWorkspaceTripProposals', Mock<(...args: unknown[]) => unknown>>
) {
  return {
    useTrips: (...args: unknown[]) => trips.useTrips(...args),
    useWorkspaceTripProposals: (...args: unknown[]) => trips.useWorkspaceTripProposals(...args)
  };
}
