import type { TripListItem, WorkspaceTripProposal } from './hooks/use-trips';

export const TRIP_FIXTURE_NOW = Date.UTC(2026, 7, 17);

export function tripListItem(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    archivedAt: null,
    coverUrl: null,
    dateNotes: 'Late September',
    destination: 'Lisbon',
    favorite: false,
    id: 'trips:trip-1' as TripListItem['id'],
    lastUpdatedAt: TRIP_FIXTURE_NOW,
    name: 'Atlantic week',
    nextAction: 'Continue planning together',
    outstandingActionCount: 0,
    ...overrides
  };
}

export function workspaceTripProposal(
  overrides: Partial<WorkspaceTripProposal> = {}
): WorkspaceTripProposal {
  return {
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    ideaName: 'coast-day',
    id: 'tripProposals:idea-1' as WorkspaceTripProposal['id'],
    reviewRequested: false,
    sourceTripId: 'trips:trip-1' as WorkspaceTripProposal['sourceTripId'],
    sourceTripName: 'Atlantic week',
    status: 'in_review',
    title: 'Add a coast day',
    updatedAt: TRIP_FIXTURE_NOW,
    workingTripId: 'trips:working-1' as WorkspaceTripProposal['workingTripId'],
    ...overrides
  };
}

export function mockTripWorkspace(
  trips: {
    useTrips: { mockReturnValue: (value: unknown) => void };
    useWorkspaceTripProposals: { mockReturnValue: (value: unknown) => void };
  },
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
