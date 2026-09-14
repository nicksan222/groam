import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import {
  mockTripWorkspace,
  TRIP_FIXTURE_NOW as now,
  workspaceTripProposal as proposal,
  tripListItem as trip
} from '@/features/trips/test-fixtures';
import { resetTripWorkspaceView, trips } from '@/features/trips/test-workspace-mocks';
import { DashboardView } from './dashboard-view';

beforeEach(resetTripWorkspaceView);

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
    expect(screen.getByRole('link', { name: 'Create a trip' })).toBeTruthy();
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

    expect(await screen.findByRole('heading', { name: 'Atlantic week' })).toBeTruthy();
    expect(screen.getByText('Please review the coast day')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Give your take' })).toBeTruthy();
    expect(screen.getByText('Packing list')).toBeTruthy();
    expect(screen.getByText('Train tickets')).toBeTruthy();
    expect(screen.getAllByRole('heading', { name: 'Open dates' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Agree on the travel period')).toBeTruthy();
    expect(screen.queryByText('Decide now')).toBeNull();
    expect(document.querySelector('[data-slot="timeline"]')).toBeTruthy();
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
