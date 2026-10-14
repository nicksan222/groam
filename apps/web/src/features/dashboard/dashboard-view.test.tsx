import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import {
  mockTripWorkspace,
  TRIP_FIXTURE_NOW as now,
  workspaceTripProposal as proposal,
  tripListItem as trip
} from '@/features/trips/test-fixtures';
import { resetTripWorkspaceView, trips } from '@/features/trips/test-workspace-mocks';
import { DashboardView } from './dashboard-view';

const tripsUi = vi.hoisted(() => ({
  openCreate: vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trips-sidebar-ui', () => ({
  useTripsSidebarUi: () => ({ openCreate: tripsUi.openCreate })
}));

beforeEach(() => {
  resetTripWorkspaceView();
  tripsUi.openCreate.mockClear();
});

afterEach(cleanup);

describe('DashboardView', () => {
  test('shows home layout chrome while trips and ideas load', async () => {
    mockTripWorkspace(trips, { isLoading: true });
    render(<DashboardView />);

    expect(await screen.findByRole('status', { name: 'Loading your workspace…' })).toBeTruthy();
    expect(document.querySelectorAll('[data-slot="page-loading"]')).toHaveLength(1);
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  test('invites the group to start a trip when home is empty', async () => {
    mockTripWorkspace(trips, { tripItems: [trip({ archivedAt: now, name: 'Last year' })] });
    render(<DashboardView />);

    expect(await screen.findByTestId('empty-screen')).toBeTruthy();
    expect(screen.getByText('Where should we go next?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create a trip' }));
    expect(tripsUi.openCreate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('link', { name: 'View trips' })).toBeNull();
    expect(screen.queryByText('Atlantic week')).toBeNull();
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
    render(<DashboardView />);

    expect(screen.getByText('Acme Labs')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create trip' }));
    expect(tripsUi.openCreate).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Atlantic week' })).toBeTruthy();
    expect(screen.getByText('Please review the coast day')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Review idea' })).toBeTruthy();
    expect(screen.getByText('Packing list')).toBeTruthy();
    expect(screen.getByText('Train tickets')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Open dates' })).toBeTruthy();
    expect(screen.getByText('Agree on the travel period')).toBeTruthy();
    expect(screen.queryByText('Decide now')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Needs your attention' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Recent ideas' })).toBeTruthy();
    expect(screen.getByText('Based on the 3 most recent ideas.')).toBeTruthy();
    expect(screen.getByLabelText('Recent idea status distribution')).toBeTruthy();
    expect(screen.getByText('1 item needs attention')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Continue planning' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your ideas' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Recently decided' })).toBeTruthy();
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
    render(<DashboardView />);

    expect(await screen.findByText('Review request 1')).toBeTruthy();
    expect(screen.getByText('Review request 3')).toBeTruthy();
    expect(screen.queryByText('Review request 4')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Planning trip 4' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Planning trip 5' })).toBeNull();
    expect(screen.queryByText(/6 active trips/i)).toBeNull();
  });

  test('shows a recovery screen when workspace queries throw', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    trips.useTrips.mockImplementation(() => {
      throw new Error('query failed');
    });
    render(<DashboardView />);

    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('The workspace home could not be loaded.')).toBeTruthy();
    expect(screen.getByText('Open trips to keep planning, or try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
