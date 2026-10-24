import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import type { TripsTurn } from '@/types/dashboard';
import { TripCard } from './trip-card';

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
    destination: 'Oaxaca',
    id: 'trip-1',
    name: 'Oaxaca escape',
    nextAction: 'Continue planning together',
    shortId: 'oax123',
    ...overrides
  } as unknown as TripListItem;
}

const turn = (counts: Partial<TripsTurn['trips'][number]>) =>
  ({
    items: [],
    total: 0,
    trips: [{ ideas: 0, issues: 0, polls: 0, tripId: 'trip-1', ...counts }]
  }) as unknown as TripsTurn;

function Card(props: Partial<Parameters<typeof TripCard>[0]> & { trip: TripListItem }) {
  return (
    <ul>
      <TripCard turn={null} {...props} />
    </ul>
  );
}

describe('TripCard', () => {
  test('without a cover the tile shows the initial', async () => {
    await render(<Card trip={makeTrip()} />);
    await expect.element(page.getByText('O', { exact: true })).toBeVisible();
    expect(document.querySelector('img')).toBeNull();
  });

  test('with a cover the same 40px tile holds the image, so every card has one shape', async () => {
    await render(<Card trip={makeTrip({ coverUrl: 'https://example.com/cover.jpg' })} />);
    const image = document.querySelector('img');
    expect(image).not.toBeNull();
    const tile = image?.closest('[class*="size-10"]');
    expect(tile).not.toBeNull();
    expect(tile?.getBoundingClientRect().width).toBe(40);
    await expect.element(page.getByText('O', { exact: true })).not.toBeInTheDocument();
  });

  test('names the trip and the noun, singular or plural, in each count link', async () => {
    const counts = {
      ideas: 1,
      issues: 3,
      polls: 0,
      tripId: 'trip-1'
    } as TripsTurn['trips'][number];
    await render(<Card counts={counts} trip={makeTrip()} turn={turn(counts)} />);
    await expect
      .element(page.getByRole('link', { name: '1 idea waiting on you in Oaxaca escape' }))
      .toHaveAttribute('href', '/trips/oax123/ideas');
    await expect
      .element(page.getByRole('link', { name: '3 issues waiting on you in Oaxaca escape' }))
      .toHaveAttribute('href', '/trips/oax123/issues');
  });

  test('says archived instead of counting for an archived trip', async () => {
    await render(<Card trip={makeTrip({ archivedAt: 5 })} turn={undefined} />);
    await expect.element(page.getByText('Archived')).toBeVisible();
    expect(page.getByTestId(testIds.tripCard).element().getAttribute('data-archived')).toBe('true');
  });
});
