import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { mockTripWorkspace, trip } from '@/features/trips/testing/trip-workspace-fixtures';
import { TripListView } from './trip-list-view';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/navigation/router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets(navigate);
});

const trips = vi.hoisted(() => ({
  useTrips: vi.fn()
}));
const turn = vi.hoisted(() => ({ value: undefined as unknown }));

vi.mock('@/features/dashboard/hooks/use-trips-turn', () => ({ useTripsTurn: () => turn.value }));

vi.mock('@groam/ai/ui/context/agent-context', () => ({ useSetAgentContext: () => undefined }));

vi.mock('@/features/workspace/workspace-shell/workspace-state', async () => {
  const { workspaceStateMock } = await import('@/features/trips/testing/trip-workspace-fixtures');
  return workspaceStateMock();
});

vi.mock('@/features/trips/hooks/use-trips', async () => {
  const { tripsHookMock } = await import('@/features/trips/testing/trip-workspace-fixtures');
  return tripsHookMock(trips);
});

beforeEach(() => {
  vi.clearAllMocks();
  turn.value = null;
  mockTripWorkspace(trips);
});

describe('TripListView', () => {
  test('shows one loading surface and no fake header while trips load', async () => {
    mockTripWorkspace(trips, { isLoading: true });
    await render(<TripListView />);

    await expect.element(page.getByRole('status', { name: 'Loading trips…' })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="page-loading"]')).toHaveLength(1);
    expect(document.querySelector('[data-slot="shell-header-skeleton"]')).toBeNull();
  });

  test('invites the group to create a trip when the portfolio is empty', async () => {
    await render(<TripListView />);

    await expect.element(page.getByTestId('empty-screen')).toBeInTheDocument();
    await expect.element(page.getByText('Where should we go next?')).toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Create your first trip' }))
      .toBeInTheDocument();
  });

  test('renders a card per trip with where and when, and the new subtitle', async () => {
    mockTripWorkspace(trips, {
      tripItems: [
        trip(),
        trip({
          id: 'trips:trip-2' as TripListItem['id'],
          name: 'Open dates',
          destination: null,
          shortId: 'opn123'
        })
      ]
    });
    await render(<TripListView />);

    await expect
      .element(page.getByText('Every trip in this group, active and archived.').first())
      .toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'Atlantic week' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: 'Open dates' }))
      .toHaveAttribute('href', '/trips/opn123/plan');
    await expect.element(page.getByText('Destination undecided')).toBeInTheDocument();
    await expect.element(page.getByText(/Continue planning/u)).not.toBeInTheDocument();
  });

  test('cards show what waits on the viewer, from the same turn query as Home', async () => {
    const first = trip();
    turn.value = {
      checked: 1,
      items: [],
      total: 2,
      trips: [{ ideas: 1, issues: 2, polls: 0, tripId: first.id }],
      truncated: false
    };
    mockTripWorkspace(trips, { tripItems: [first] });
    await render(<TripListView />);

    const counts = page.getByTestId('home-trip-count');
    expect(counts.elements()).toHaveLength(2);
    await expect.element(counts.first()).toHaveAttribute('data-section', 'ideas');
    const list = page.getByRole('link', { name: 'Atlantic week' }).element().closest('ul');
    expect(list?.className).toContain('sm:grid-cols-2');
    expect(list?.className).toContain('xl:grid-cols-3');
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
    await expect.element(page.getByRole('link', { name: 'Atlantic week' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: 'Lisbon long weekend 37' }))
      .not.toBeInTheDocument();
  });

  test('keeps loading while the Active filter hides every loaded trip', async () => {
    const loadMore = vi.fn();
    mockTripWorkspace(trips, {
      tripItems: [
        trip({ archivedAt: Date.UTC(2026, 0, 1), id: 'trips:archived' as TripListItem['id'] })
      ]
    });
    trips.useTrips.mockReturnValue({
      createTrip: () => Promise.resolve(null),
      isLoading: false,
      loadMore,
      status: 'CanLoadMore',
      trips: [
        trip({ archivedAt: Date.UTC(2026, 0, 1), id: 'trips:archived' as TripListItem['id'] })
      ]
    });
    await render(<TripListView />);
    await expect.element(page.getByText('Looking through more trips…')).toBeInTheDocument();
    await expect.poll(() => loadMore.mock.calls.length).toBeGreaterThan(0);
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

    await expect.element(page.getByRole('link', { name: 'Atlantic week' })).toBeInTheDocument();
    await page.getByLabelText('Filter trips by status').click();
    await page.getByRole('option', { name: 'Archived' }).click();
    // The chosen status shows in the URL.
    expect(navigate).toHaveBeenLastCalledWith(
      expect.objectContaining({ replace: true, search: { status: 'archived' }, to: '/trips' })
    );

    await expect
      .element(page.getByRole('link', { name: 'Lisbon long weekend 37' }))
      .toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'Atlantic week' })).not.toBeInTheDocument();
  });
});
