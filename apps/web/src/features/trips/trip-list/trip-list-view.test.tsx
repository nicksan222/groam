import { stubPopoverEnvironment } from '@groam/ui/lib/stub-popover-environment';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { TripListItem, WorkspaceTripProposal } from '@/features/trips/hooks/use-trips';
import {
  mockTripWorkspace,
  workspaceTripProposal as proposal,
  tripListItem as trip
} from '@/features/trips/test-fixtures';
import { resetTripWorkspaceView, trips } from '@/features/trips/test-workspace-mocks';
import { TripListView } from './trip-list-view';

beforeEach(() => {
  stubPopoverEnvironment();
  Element.prototype.scrollIntoView = vi.fn();
  resetTripWorkspaceView();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TripListView', () => {
  test('shows trip card chrome while trips load', async () => {
    mockTripWorkspace(trips, { isLoading: true });
    render(<TripListView />);

    expect(await screen.findByRole('status', { name: 'Loading trips…' })).toBeTruthy();
    expect(document.querySelectorAll('[data-slot="page-loading"]')).toHaveLength(1);
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  test('invites the group to create a trip when the portfolio is empty', async () => {
    render(<TripListView />);

    expect(await screen.findByTestId('empty-screen')).toBeTruthy();
    expect(screen.getByText('Where should we go next?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create your first trip' })).toBeTruthy();
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
    render(<TripListView />);

    expect(await screen.findByRole('heading', { name: 'Atlantic week' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Open dates' })).toBeTruthy();
    expect(screen.getByText('Add a coast day')).toBeTruthy();
    expect(screen.getAllByText(/Ideas:/u).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 open/u).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 applied/u).length).toBeGreaterThan(0);
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
    render(<TripListView />);

    expect(await screen.findByRole('region', { name: 'Filter trips' })).toBeTruthy();
    expect(screen.getByRole('searchbox', { name: 'Search trips' })).toBeTruthy();
    expect(screen.getByLabelText('Filter trips by status').textContent).toContain('Active');
    expect(screen.getByRole('heading', { name: 'Atlantic week' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Lisbon long weekend 37' })).toBeNull();
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
    render(<TripListView />);

    await screen.findByRole('heading', { name: 'Atlantic week' });
    fireEvent.click(screen.getByLabelText('Filter trips by status'));
    fireEvent.click(screen.getByRole('option', { name: 'Archived' }));

    expect(await screen.findByRole('heading', { name: 'Lisbon long weekend 37' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Atlantic week' })).toBeNull();
  });
});
