import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import type { TripsTurn } from '@/types/dashboard';
import { YourTrips } from './your-trips';

vi.mock('@/lib/navigation/router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

function makeTrip(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    archivedAt: null,
    canParticipate: true,
    coverUrl: null,
    dateNotes: 'Early June',
    destination: 'Lisbon',
    favorite: false,
    id: 'trip-1',
    name: 'Lisbon getaway',
    nextAction: 'Continue planning together',
    outstandingActionCount: 2,
    shortId: 'lis123',
    ...overrides
  } as unknown as TripListItem;
}

function turnOf(trips: Array<Partial<TripsTurn['trips'][number]> & { tripId: Id<'trips'> }>) {
  return {
    items: [],
    total: 0,
    trips: trips.map((trip) => ({ ideas: 0, issues: 0, polls: 0, ...trip }))
  } as unknown as TripsTurn;
}

describe('YourTrips', () => {
  test('opens each trip on its plan and shows where and when, without an attention count', async () => {
    await render(
      <YourTrips trips={[makeTrip()]} turn={turnOf([{ tripId: 'trip-1' as Id<'trips'> }])} />
    );
    await expect
      .element(page.getByRole('link', { name: 'Lisbon getaway' }))
      .toHaveAttribute('href', '/trips/lis123/plan');
    await expect.element(page.getByText('Lisbon', { exact: true })).toBeVisible();
    await expect.element(page.getByText('Early June')).toBeVisible();
    await expect.element(page.getByText(/need.* attention/u)).not.toBeInTheDocument();
    await expect.element(page.getByText('Continue planning together')).not.toBeInTheDocument();
  });

  test('falls back when destination and dates are not set', async () => {
    await render(
      <YourTrips
        trips={[makeTrip({ dateNotes: null, destination: null })]}
        turn={turnOf([{ tripId: 'trip-1' as Id<'trips'> }])}
      />
    );
    await expect.element(page.getByText('Destination undecided')).toBeVisible();
    await expect.element(page.getByText('Flexible dates')).toBeVisible();
  });

  test('shows only the counts above zero, each linking to the viewer’s items in that section', async () => {
    await render(
      <YourTrips
        trips={[makeTrip()]}
        turn={turnOf([{ ideas: 2, issues: 0, polls: 1, tripId: 'trip-1' as Id<'trips'> }])}
      />
    );
    const links = page.getByTestId(testIds.homeTripCount);
    await expect.element(links.first()).toBeVisible();
    expect(links.elements()).toHaveLength(2);
    await expect
      .element(page.getByRole('link', { name: '2 ideas waiting on you in Lisbon getaway' }))
      .toHaveAttribute('href', '/trips/lis123/ideas');
    await expect
      .element(page.getByRole('link', { name: '1 poll waiting on you in Lisbon getaway' }))
      .toHaveAttribute('href', '/trips/lis123/polls');
    await expect.element(page.getByText(/issue/u)).not.toBeInTheDocument();
  });

  test('shows no count, never a zero, while the counts load', async () => {
    await render(<YourTrips trips={[makeTrip()]} turn={undefined} />);
    await expect.element(page.getByRole('link', { name: 'Lisbon getaway' })).toBeVisible();
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);
    await expect.element(page.getByText('0')).not.toBeInTheDocument();
  });

  test('shows how to join a trip without a seat, and no counts', async () => {
    await render(
      <YourTrips
        trips={[
          makeTrip({ canParticipate: false, nextAction: 'Join this trip to start planning' })
        ]}
        turn={turnOf([])}
      />
    );
    await expect.element(page.getByText('Join this trip to start planning')).toBeVisible();
    await expect.element(page.getByTestId(testIds.homeTripCount)).not.toBeInTheDocument();
  });

  test('shows six trips at most and links to all of them', async () => {
    const trips = Array.from({ length: 8 }, (_, index) =>
      makeTrip({
        id: `trip-${index}` as TripListItem['id'],
        name: `Trip ${index + 1}`,
        shortId: undefined
      })
    );
    await render(<YourTrips trips={trips} turn={turnOf([])} />);
    expect(page.getByTestId(testIds.tripCard).elements()).toHaveLength(6);
    await expect.element(page.getByText('Trip 7')).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: /All trips/u }))
      .toHaveAttribute('href', '/trips');
  });
});
