import { expectConsole } from '@groam/vitest-config/console';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { trip } from '@/features/trips/testing/trip-workspace-fixtures';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { testIds } from '@/lib/test-ids';
import type { TripsTurn } from '@/types/dashboard';
import { DashboardView } from './dashboard-view';

const state = vi.hoisted(() => ({
  all: { isLoading: false, trips: [] as unknown[] },
  active: { isLoading: false, trips: [] as unknown[] },
  context: vi.fn(),
  turn: undefined as unknown
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: (context: unknown) => state.context(context)
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', async () => {
  const { workspaceStateMock } = await import('@/features/trips/testing/trip-workspace-fixtures');
  return {
    ...workspaceStateMock(),
    useOptionalWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
  };
});

// `useTrips({ includeArchived: false })` is the active list; the unarchived-only check asks for all.
vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: (options?: unknown) => {
    if (options === 'skip') return { isLoading: false, trips: [] };
    const list = options ? state.active : state.all;
    return { createTrip: () => Promise.resolve(null), loadMore: () => undefined, ...list };
  }
}));

vi.mock('@/features/dashboard/hooks/use-trips-turn', () => ({
  useTripsTurn: (enabled = true) => (enabled ? state.turn : undefined)
}));

vi.mock('@/lib/navigation/router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

function turnOf(overrides: Partial<TripsTurn> = {}) {
  return {
    checked: 1,
    items: [],
    total: 0,
    trips: [],
    truncated: false,
    ...overrides
  } as unknown as TripsTurn;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.active = { isLoading: false, trips: [] };
  state.all = { isLoading: false, trips: [] };
  state.turn = turnOf();
  useWorkspaceDialogs.getState().closeDialog();
});

describe('DashboardView', () => {
  test('shows the header and a placeholder, not zeros, while trips load', async () => {
    state.active = { isLoading: true, trips: [] };
    await render(<DashboardView />);
    await expect.element(page.getByTestId(testIds.homeDashboard)).toBeVisible();
    await expect.element(page.getByRole('status', { name: /Loading trips/u })).toBeInTheDocument();
    await expect.element(page.getByText('Nothing is waiting on you.')).not.toBeInTheDocument();
  });

  test('invites the group to create a first trip when there are none', async () => {
    await render(<DashboardView />);
    await expect.element(page.getByText('Where should we go next?')).toBeVisible();
    await page.getByRole('button', { name: 'Create a trip' }).click();
    expect(useWorkspaceDialogs.getState().dialog).toBe('create-trip');
  });

  test('points to archived trips when they are all that is left', async () => {
    state.all = { isLoading: false, trips: [trip({ archivedAt: 1 })] };
    await render(<DashboardView />);
    await expect.element(page.getByText('No active trips')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'See archived trips' }))
      .toHaveAttribute('href', '/trips?status=archived');
  });

  test('shows the trips, then what waits on the viewer', async () => {
    state.active = {
      isLoading: false,
      trips: [
        trip({ name: 'Atlantic week' }),
        trip({ id: 'trips:two' as TripListItem['id'], name: 'Alps' })
      ]
    };
    state.turn = turnOf({
      items: [
        {
          dueAt: null,
          id: 'issue-1',
          kind: 'issue',
          mandatory: false,
          status: 'open',
          title: 'Book the ferry',
          tripId: 'trips:trip-1',
          tripName: 'Atlantic week',
          tripShortId: 'trpabc',
          updatedAt: 1
        }
      ] as TripsTurn['items'],
      total: 1,
      trips: [{ ideas: 0, issues: 1, polls: 0, tripId: 'trips:trip-1' }] as TripsTurn['trips']
    });
    await render(<DashboardView />);
    await expect.element(page.getByRole('heading', { name: 'Your trips' })).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Atlantic week' })).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Alps' })).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: '1 issue waiting on you in Atlantic week' }))
      .toHaveAttribute('href', '/trips/trpabc/issues');
    await expect.element(page.getByRole('heading', { name: 'Your turn' })).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Book the ferry' })).toBeVisible();
    // What waits on the viewer comes first, under the header.
    expect(
      page
        .getByRole('heading', { name: 'Your turn' })
        .element()
        .compareDocumentPosition(page.getByRole('heading', { name: 'Your trips' }).element()) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    await page.getByRole('button', { name: 'Create trip' }).click();
    expect(useWorkspaceDialogs.getState().dialog).toBe('create-trip');
  });

  test('says nothing is waiting once the turn loads empty', async () => {
    state.active = { isLoading: false, trips: [trip()] };
    await render(<DashboardView />);
    await expect.element(page.getByText('Nothing is waiting on you.')).toBeVisible();
  });

  test('keeps the trips and drops the list when the turn cannot be read', async () => {
    state.active = { isLoading: false, trips: [trip()] };
    state.turn = null;
    await render(<DashboardView />);
    await expect.element(page.getByRole('link', { name: 'Atlantic week' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Your turn' })).not.toBeInTheDocument();
    await expect.element(page.getByText('Nothing is waiting on you.')).not.toBeInTheDocument();
  });

  test('registers one screen context: the group while loading, then the trips and the turn', async () => {
    state.active = { isLoading: true, trips: [] };
    const view = await render(<DashboardView />);
    expect(state.context).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: { groupName: 'Acme Labs', trips: [] },
        key: 'workspace:dashboard'
      })
    );

    state.active = { isLoading: false, trips: [trip()] };
    state.turn = turnOf({ total: 0 });
    await view.rerender(<DashboardView />);
    await expect.element(page.getByText('Nothing is waiting on you.')).toBeVisible();
    expect(state.context).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trips: [expect.objectContaining({ name: 'Atlantic week' })],
          waitingOnYouTotal: 0
        }),
        key: 'workspace:dashboard'
      })
    );
  });

  test('shows a recovery screen when workspace queries throw', async () => {
    // React reports the error the recovery boundary catches.
    expectConsole('error', 'query failed');
    state.active = {
      get isLoading(): boolean {
        throw new Error('query failed');
      },
      trips: []
    };
    await render(<DashboardView />);
    await expect.element(page.getByText('Something went wrong')).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
