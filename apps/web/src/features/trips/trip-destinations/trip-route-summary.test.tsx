import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { stubMatchMedia } from '@/testing/stub-match-media';
import { TripRouteSummary } from './trip-route-summary';

vi.mock('@/features/trips/trip-destinations/trip-destinations-map', () => ({
  TripDestinationsMap: () => <section aria-label="Interactive route map" />
}));

afterEach(cleanup);

const destinations = [
  {
    id: 'lisbon',
    name: 'Lisbon',
    startDay: 1,
    endDay: 2,
    coverUrl: null
  }
] as unknown as TripDetail['destinations'];

test('only loads the map when requested and allows closing it', () => {
  render(<TripRouteSummary destinations={destinations} />);
  expect(screen.queryByLabelText('Interactive route map')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show route map' }));
  expect(screen.getByLabelText('Interactive route map')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Hide route map' }).getAttribute('aria-expanded')).toBe(
    'true'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Hide route map' }));
  expect(screen.queryByLabelText('Interactive route map')).toBeNull();
});

test('moves keyboard focus and scrolls to the chosen destination', () => {
  stubMatchMedia();
  render(
    <>
      <article id="itinerary-stop-lisbon" tabIndex={-1}>
        Lisbon plans
      </article>
      <TripRouteSummary destinations={destinations} />
    </>
  );
  const destination = screen.getByText('Lisbon plans');
  const scrollIntoView = vi.fn();
  destination.scrollIntoView = scrollIntoView;
  fireEvent.click(screen.getByRole('button', { name: 'Jump to Lisbon' }));
  expect(document.activeElement).toBe(destination);
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
});
