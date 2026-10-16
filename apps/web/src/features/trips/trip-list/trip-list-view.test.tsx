import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import {
  mockTripWorkspace,
  workspaceTripProposal as proposal,
  tripListItem as trip
} from '@/features/trips/test-fixtures';
import { resetTripWorkspaceView, trips } from '@/features/trips/test-workspace-mocks';
import { TripListView } from './trip-list-view';

vi.mock('@groam/ai/ui/context/agent-context', async () => {
  const { agentContextModule } = await import('@/features/trips/test-workspace-mocks');
  return agentContextModule;
});

vi.mock('@/features/workspace/workspace-shell/workspace-state', async () => {
  const { workspaceStateModule } = await import('@/features/trips/test-workspace-mocks');
  return workspaceStateModule;
});

vi.mock('@/features/trips/hooks/use-trips', async () => {
  const { useTripsModule } = await import('@/features/trips/test-workspace-mocks');
  return useTripsModule;
});

vi.mock('@tanstack/react-router', async () => {
  const { tripRouterModule } = await import('@/features/trips/test-workspace-mocks');
  return tripRouterModule();
});

beforeEach(() => {
  resetTripWorkspaceView();
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
