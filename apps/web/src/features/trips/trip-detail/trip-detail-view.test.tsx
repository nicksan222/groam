import type { Id } from '@groam/backend/data-model';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripSection } from '@/features/trips/trip-sections';
import { TripDetailView } from './trip-detail-view';

const state = vi.hoisted(() => ({
  exists: true as boolean | undefined,
  trip: undefined as TripDetail | undefined
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  Navigate: ({ to }: { to: string }) => <div>navigate:{to}</div>,
  useNavigate: () => vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrip: () => ({
    archive: vi.fn(),
    exists: state.exists,
    replaceCover: vi.fn(),
    restore: vi.fn(),
    retryCover: vi.fn(),
    trip: state.trip,
    update: vi.fn()
  })
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: () => ({
    createVersion: vi.fn(),
    proposals: [
      {
        author: { name: 'Alex Morgan', userId: 'user-alex' },
        id: 'proposal-1' as Id<'tripProposals'>,
        status: 'draft',
        workingTripId: 'working-1'
      }
    ]
  })
}));

vi.mock('@/features/trips/hooks/use-trip-travelers', () => ({
  useTripTravelers: () => ({ goingCount: 3, isLoading: false, travelers: [] })
}));

vi.mock('@/features/trips/trip-travelers/trip-travelers-sheet', () => ({
  TripTravelersSheet: () => null
}));

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: () => ({ issues: [] })
}));

vi.mock('@/features/trips/hooks/use-trip-agent-context', () => ({
  useTripAgentContext: () => undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } }),
  useWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));

vi.mock('@/features/trips/trip-ideas/create-trip-idea-dialog', () => ({
  CreateTripIdeaDialog: () => null
}));

vi.mock('@/features/trips/trip-overview/trip-overview', () => ({
  TripOverview: () => <div>Overview section</div>
}));

vi.mock('@/features/trips/trip-destinations/trip-destinations-panel', () => ({
  TripDestinationsPanel: () => <div>Itinerary section</div>
}));

vi.mock('@/features/trips/trip-issues/trip-issues-panel', () => ({
  TripIssuesPanel: () => <div>Issues section</div>
}));

vi.mock('@/features/trips/trip-ideas/trip-ideas-panel', () => ({
  TripIdeasPanel: () => <div>Ideas section</div>
}));

vi.mock('@/features/trips/trip-activity/trip-activity-history', () => ({
  TripActivityHistory: () => <div>Activity section</div>
}));

vi.mock('@/features/trips/trip-overview/trip-packing-list', () => ({
  TripPackingList: () => <div>Packing list</div>
}));

vi.mock('@/features/trips/trip-detail/trip-details-editor', () => ({
  TripDetailsEditor: () => null
}));

function tripDetail(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    activity: [],
    archivedAt: null,
    arrivalTransfer: null,
    coverAttribution: null,
    coverStatus: 'ready',
    coverUrl: null,
    currency: 'EUR',
    dateNotes: null,
    departureTransfer: null,
    destination: { countryCode: 'PT', name: 'Portugal', status: 'known' },
    destinations: [],
    groupMemberCount: 3,
    id: 'working-1' as Id<'trips'>,
    initialBudget: null,
    name: 'Summer escape',
    permissions: {
      canArchive: false,
      canEdit: true,
      canEditCover: true,
      canPropose: false,
      canRestore: false,
      isReadOnly: false
    },
    proposal: {
      author: { name: 'Alex Morgan', userId: 'user-alex' },
      baseUpdatedAt: Date.UTC(2026, 7, 16),
      ideaName: 'coast-day',
      sourceTripId: 'source-1' as Id<'trips'>,
      status: 'draft'
    },
    role: 'organizer',
    startDate: null,
    totalDurationDays: 7,
    totalPlannedCost: 0,
    ...overrides
  } as TripDetail;
}

function renderTrip(section: TripSection, trip: TripDetail = tripDetail()) {
  state.exists = true;
  state.trip = trip;
  return render(<TripDetailView addDestinationOpen={false} section={section} tripId={trip.id} />);
}

beforeEach(() => {
  state.exists = true;
  state.trip = undefined;
});

afterEach(cleanup);

describe('TripDetailView idea workspace', () => {
  test.each(['overview', 'itinerary', 'ideas', 'activity'] as const)(
    'redirects a working-trip idea to the nested clone on %s',
    (section) => {
      renderTrip(section);

      expect(screen.getByText('navigate:/trips/$tripId/ideas/$proposalId/$view')).toBeTruthy();
      expect(screen.queryByLabelText('Idea workspace')).toBeNull();
    }
  );

  test('does not redirect a shared trip', () => {
    renderTrip('overview', tripDetail({ id: 'source-1' as Id<'trips'>, proposal: null }));

    expect(screen.queryByText('navigate:/trips/$tripId/ideas/$proposalId/$view')).toBeNull();
    expect(screen.queryByLabelText('Idea workspace')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open shared trip' })).toBeNull();
    expect(screen.getByText('Overview section')).toBeTruthy();
  });
});

test.each(['overview', 'itinerary'] as const)(
  'renders the full viewing page at %s with one creation action',
  (section) => {
    renderTrip(
      section,
      tripDetail({
        id: 'source-1' as Id<'trips'>,
        proposal: null,
        permissions: {
          canArchive: false,
          canEdit: false,
          canEditCover: false,
          canPropose: true,
          canRestore: false,
          isReadOnly: true
        }
      })
    );
    expect(screen.getByRole('region', { name: 'Trip at a glance' })).toBeTruthy();
    expect(screen.getByText('Itinerary section')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'New idea' })).toHaveLength(1);
    expect(screen.queryByTestId('trip-section-itinerary')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit details' })).toBeNull();
  }
);
