import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripRouteSummary } from './trip-route-summary';

const destinations = [
  {
    id: 'lisbon',
    name: 'Lisbon',
    startDay: 1,
    endDay: 2,
    coverUrl: null,
    activities: [],
    stays: [],
    transferToNext: null
  }
] as unknown as TripDetail['destinations'];

const withLeg = [
  { ...destinations[0], transferToNext: { durationMinutes: 90, mode: 'train' }, activities: [{}] },
  {
    id: 'porto',
    name: 'Porto',
    startDay: 3,
    endDay: 4,
    activities: [],
    stays: [],
    transferToNext: null
  }
] as unknown as TripDetail['destinations'];

test('shows the trip facts, and the leg between stops', async () => {
  await render(<TripRouteSummary destinations={withLeg} />);
  await expect
    .element(page.getByText('2 stops · 1 activity · 1 h 30 min in transit'))
    .toBeVisible();
  await expect.element(page.getByText('Train · 1 h 30 min')).toBeVisible();
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
