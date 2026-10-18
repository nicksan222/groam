import { expectConsole } from '@groam/vitest-config/console';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import {
  FIXTURE_NOW,
  mockTripWorkspace,
  proposal,
  trip
} from '@/features/trips/testing/trip-workspace-fixtures';
import { DashboardView } from './dashboard-view';

const trips = vi.hoisted(() => ({
  useTrips: vi.fn(),
  useWorkspaceTripProposals: vi.fn()
}));

vi.mock('@/features/dashboard/hooks/use-dashboard-runs', () => ({
  useDashboardRuns: () => ({ activity: [], isLoading: false, waiting: [] })
}));
vi.mock('@/features/dashboard/hooks/use-dashboard-issues', () => ({
  useDashboardIssues: () => ({ assigned: [], isLoading: false, open: [] })
}));
vi.mock('@/features/dashboard/hooks/use-dashboard-polls', () => ({
  useDashboardPolls: () => ({ isLoading: false, polls: [] })
}));
vi.mock('@/features/dashboard/hooks/use-dashboard-research', () => ({
  useDashboardResearch: () => ({ isLoading: false, research: [] })
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({ useSetAgentContext: () => undefined }));

vi.mock('@/features/workspace/workspace-shell/workspace-state', async () => {
  const { workspaceStateMock } = await import('@/features/trips/testing/trip-workspace-fixtures');
  return workspaceStateMock();
});

vi.mock('@/features/trips/hooks/use-trips', async () => {
  const { tripsHookMock } = await import('@/features/trips/testing/trip-workspace-fixtures');
  return tripsHookMock(trips);
});

vi.mock('@tanstack/react-router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

const tripsUi = vi.hoisted(() => ({
  openCreate: vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trips-sidebar-ui', () => ({
  useTripsSidebarUi: () => ({ openCreate: tripsUi.openCreate })
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockTripWorkspace(trips);
  tripsUi.openCreate.mockClear();
});

describe('DashboardView', () => {
  test('shows home layout chrome while trips and ideas load', async () => {
    mockTripWorkspace(trips, { isLoading: true });
    await render(<DashboardView />);

    await expect
      .element(page.getByRole('status', { name: 'Loading your workspace…' }))
      .toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="page-loading"]')).toHaveLength(1);
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  test('invites the group to start a trip when home is empty', async () => {
    mockTripWorkspace(trips, { tripItems: [trip({ archivedAt: FIXTURE_NOW, name: 'Last year' })] });
    await render(<DashboardView />);

    await expect.element(page.getByTestId('empty-screen')).toBeInTheDocument();
    await expect.element(page.getByText('Where should we go next?')).toBeInTheDocument();
    await page.getByRole('button', { name: 'Create a trip' }).click();
    expect(tripsUi.openCreate).toHaveBeenCalledTimes(1);
    await expect.element(page.getByRole('link', { name: 'View trips' })).not.toBeInTheDocument();
    await expect.element(page.getByText('Atlantic week')).not.toBeInTheDocument();
  });

  test('surfaces waiting ideas, trips, drafts, and settled work', async () => {
    mockTripWorkspace(trips, {
      proposals: [
        proposal({ reviewRequested: true, title: 'Please review the coast day' }),
        proposal({
          id: 'tripProposals:draft' as WorkspaceTripProposal['id'],
          status: 'draft',
          title: 'Packing list'
        }),
        proposal({
          id: 'tripProposals:merged' as WorkspaceTripProposal['id'],
          status: 'merged',
          title: 'Train tickets'
        })
      ],
      tripItems: [
        trip(),
        trip({
          id: 'trips:open' as TripListItem['id'],
          name: 'Open dates',
          nextAction: 'Agree on the travel period',
          outstandingActionCount: 1
        })
      ]
    });
    await render(<DashboardView />);

    await expect.element(page.getByText('Acme Labs')).toBeInTheDocument();
    await page.getByRole('button', { name: 'Create trip' }).click();
    expect(tripsUi.openCreate).toHaveBeenCalledTimes(1);
    await expect.element(page.getByRole('heading', { name: 'Atlantic week' })).toBeInTheDocument();
    await expect.element(page.getByText('Please review the coast day')).toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'Review idea' })).toBeInTheDocument();
    await expect.element(page.getByText('Packing list')).toBeInTheDocument();
    await expect.element(page.getByText('Train tickets')).toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Open dates' })).toBeInTheDocument();
    await expect.element(page.getByText('Agree on the travel period')).toBeInTheDocument();
    await expect.element(page.getByText('Decide now')).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('heading', { name: 'Needs your attention' }))
      .toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Recent ideas' })).toBeInTheDocument();
    await expect.element(page.getByText('Based on the 3 most recent ideas.')).toBeInTheDocument();
    await expect
      .element(page.getByLabelText('Recent idea status distribution'))
      .toBeInTheDocument();
    await expect.element(page.getByText('1 item needs attention')).toBeInTheDocument();
    await expect
      .element(page.getByRole('heading', { name: 'Continue planning' }))
      .toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Your ideas' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('heading', { name: 'Recently decided' }))
      .toBeInTheDocument();
  });

  test('caps review requests and dashboard lists without implying workspace totals', async () => {
    mockTripWorkspace(trips, {
      proposals: Array.from({ length: 6 }, (_, index) =>
        proposal({
          id: `tripProposals:review-${index}` as WorkspaceTripProposal['id'],
          reviewRequested: true,
          title: `Review request ${index + 1}`
        })
      ),
      tripItems: Array.from({ length: 6 }, (_, index) =>
        trip({
          id: `trips:trip-${index}` as TripListItem['id'],
          name: `Planning trip ${index + 1}`
        })
      )
    });
    await render(<DashboardView />);

    await expect.element(page.getByText('Review request 1')).toBeInTheDocument();
    await expect.element(page.getByText('Review request 3')).toBeInTheDocument();
    await expect.element(page.getByText('Review request 4')).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('heading', { name: 'Planning trip 4' }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('heading', { name: 'Planning trip 5' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByText(/6 active trips/i)).not.toBeInTheDocument();
  });

  test('shows a recovery screen when workspace queries throw', async () => {
    // React reports the error the recovery boundary catches.
    expectConsole('error', 'query failed');
    trips.useTrips.mockImplementation(() => {
      throw new Error('query failed');
    });
    await render(<DashboardView />);

    await expect.element(page.getByText('Something went wrong')).toBeInTheDocument();
    await expect
      .element(page.getByText('The workspace home could not be loaded.'))
      .toBeInTheDocument();
    await expect
      .element(page.getByText('Open trips to keep planning, or try again.'))
      .toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
