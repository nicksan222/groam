import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import { TripListView } from './trip-list-view';

// oxlint-disable-next-line groam/no-local-type-definitions -- test double shape
type RouteTarget = {
  params?: Record<string, string | number>;
  search?: Record<string, unknown>;
  to: string;
};

const FIXTURE_NOW = Date.UTC(2026, 7, 17);

function trip(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    archivedAt: null,
    coverUrl: null,
    dateNotes: 'Late September',
    destination: 'Lisbon',
    favorite: false,
    id: 'trips:trip-1' as TripListItem['id'],
    lastUpdatedAt: FIXTURE_NOW,
    name: 'Atlantic week',
    nextAction: 'Continue planning together',
    outstandingActionCount: 0,
    ...overrides
  };
}

function proposal(overrides: Partial<WorkspaceTripProposal> = {}): WorkspaceTripProposal {
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

const trips = vi.hoisted(() => ({
  useTrips: vi.fn(),
  useWorkspaceTripProposals: vi.fn()
}));

function mockTripWorkspace(
  _trips: typeof trips,
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

vi.mock('@groam/ai/ui/context/agent-context', () => ({ useSetAgentContext: () => undefined }));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' },
    session: { user: { id: 'user-alex' } }
  })
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: (...args: unknown[]) => trips.useTrips(...args),
  useWorkspaceTripProposals: (...args: unknown[]) => trips.useWorkspaceTripProposals(...args)
}));

vi.mock('@tanstack/react-router', async () => {
  const navigate = vi.fn();
  const resolveHref = ({ params = {}, search = {}, to }: RouteTarget) => {
    const path = to.replace(/\$(\w+)/gu, (_, name: string) => String(params[name]));
    const query = new URLSearchParams(
      Object.entries(search).map(([key, value]) => [key, String(value)])
    ).toString();
    return query ? `${path}?${query}` : path;
  };
  return {
    ...(await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')),
    Link: ({ children, params, search, to, ...rest }: RouteTarget & { children?: ReactNode }) => (
      <a href={resolveHref({ params, search, to })} {...rest}>
        {children}
      </a>
    ),
    Navigate: (target: RouteTarget) => <div>navigate:{resolveHref(target)}</div>,
    useNavigate: () => navigate
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockTripWorkspace(trips);
});

describe('TripListView', () => {
  test('shows trip card chrome while trips load', async () => {
    mockTripWorkspace(trips, { isLoading: true });
    await render(<TripListView />);

    await expect.element(page.getByRole('status', { name: 'Loading trips…' })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="page-loading"]')).toHaveLength(1);
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  test('invites the group to create a trip when the portfolio is empty', async () => {
    await render(<TripListView />);

    await expect.element(page.getByTestId('empty-screen')).toBeInTheDocument();
    await expect.element(page.getByText('Where should we go next?')).toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Create your first trip' }))
      .toBeInTheDocument();
  });

  test('renders trip cards with open and settled idea timelines', async () => {
    mockTripWorkspace(trips, {
      proposals: [
        proposal({ status: 'in_review', title: 'Add a coast day' }),
        proposal({
          id: 'tripProposals:merged' as WorkspaceTripProposal['id'],
          status: 'merged',
          title: 'Train tickets'
        })
      ],
      tripItems: [
        trip(),
        trip({
          id: 'trips:trip-2' as TripListItem['id'],
          name: 'Open dates',
          nextAction: 'Agree on the travel period',
          outstandingActionCount: 1
        })
      ]
    });
    await render(<TripListView />);

    await expect.element(page.getByRole('heading', { name: 'Atlantic week' })).toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Open dates' })).toBeInTheDocument();
    await expect.element(page.getByText('Add a coast day')).toBeInTheDocument();
    await expect.element(page.getByText(/Ideas:/u).first()).toBeInTheDocument();
    await expect.element(page.getByText(/1 open/u).first()).toBeInTheDocument();
    await expect.element(page.getByText(/1 applied/u).first()).toBeInTheDocument();
  });

  test('renders a search-and-status toolbar and hides archived trips by default', async () => {
    mockTripWorkspace(trips, {
      tripItems: [
        trip(),
        trip({
          archivedAt: Date.UTC(2026, 0, 1),
          id: 'trips:archived' as TripListItem['id'],
          name: 'Lisbon long weekend 37'
        })
      ]
    });
    await render(<TripListView />);

    await expect.element(page.getByRole('region', { name: 'Filter trips' })).toBeInTheDocument();
    await expect.element(page.getByRole('searchbox', { name: 'Search trips' })).toBeInTheDocument();
    expect(page.getByLabelText('Filter trips by status').element().textContent).toContain('Active');
    await expect.element(page.getByRole('heading', { name: 'Atlantic week' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('heading', { name: 'Lisbon long weekend 37' }))
      .not.toBeInTheDocument();
  });

  test('shows archived trips when the archived filter is selected', async () => {
    mockTripWorkspace(trips, {
      tripItems: [
        trip(),
        trip({
          archivedAt: Date.UTC(2026, 0, 1),
          id: 'trips:archived' as TripListItem['id'],
          name: 'Lisbon long weekend 37'
        })
      ]
    });
    await render(<TripListView />);

    await expect.element(page.getByRole('heading', { name: 'Atlantic week' })).toBeInTheDocument();
    await page.getByLabelText('Filter trips by status').click();
    await page.getByRole('option', { name: 'Archived' }).click();

    await expect
      .element(page.getByRole('heading', { name: 'Lisbon long weekend 37' }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('heading', { name: 'Atlantic week' }))
      .not.toBeInTheDocument();
  });
});
