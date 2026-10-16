import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripRouteSummary } from './trip-route-summary';

vi.mock('@/features/trips/trip-destinations/trip-destinations-map', () => ({
  TripDestinationsMap: () => <section aria-label="Interactive route map" />
}));

const destinations = [
  {
    id: 'lisbon',
    name: 'Lisbon',
    startDay: 1,
    endDay: 2,
    coverUrl: null
  }
] as unknown as TripDetail['destinations'];

test('only loads the map when requested and allows closing it', async () => {
  await render(<TripRouteSummary destinations={destinations} />);
  await expect.element(page.getByLabelText('Interactive route map')).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Show route map' }).click();
  await expect.element(page.getByLabelText('Interactive route map')).toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Hide route map' }))
    .toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Hide route map' }).click();
  await expect.element(page.getByLabelText('Interactive route map')).not.toBeInTheDocument();
});

test('moves keyboard focus and scrolls to the chosen destination', async () => {
  await render(
    <>
      <article id="itinerary-stop-lisbon" tabIndex={-1}>
        Lisbon plans
      </article>
      <TripRouteSummary destinations={destinations} />
    </>
  );
  const destination = page.getByText('Lisbon plans');
  const scrollIntoView = vi.spyOn(destination.element(), 'scrollIntoView');
  await page.getByRole('button', { name: 'Jump to Lisbon' }).click();
  await expect.element(destination).toHaveFocus();
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
});
