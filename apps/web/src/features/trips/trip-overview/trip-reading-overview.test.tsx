import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripReadingOverview } from './trip-reading-overview';

describe('TripReadingOverview', () => {
  test('composes the section header, itinerary, and no packing', async () => {
    const trip = {
      currency: 'USD',
      id: 'idea-1',
      initialBudget: 1000,
      permissions: { canEdit: false },
      totalPlannedCost: 200
    } as unknown as TripDetail;
    await render(<TripReadingOverview itinerary={<p>Itinerary slot</p>} trip={trip} />);
    await expect.element(page.getByRole('region', { name: 'Plan' })).toBeInTheDocument();
    // Plan's header carries the budget, so the shared plan has no floating line of its own.
    await expect.element(page.getByText(/planned/u)).not.toBeInTheDocument();
    await expect.element(page.getByText('Itinerary slot')).toBeVisible();
    await expect.element(page.getByText('Packing')).not.toBeInTheDocument();
    await expect.element(page.getByText(/what to pack/u)).not.toBeInTheDocument();
  });

  test('places the lead between the badge and the days', async () => {
    const trip = {
      currency: 'USD',
      id: 'trip-1',
      initialBudget: null,
      permissions: { canEdit: false },
      totalPlannedCost: 0
    } as unknown as TripDetail;
    await render(
      <TripReadingOverview itinerary={<p>Itinerary slot</p>} lead={<p>Lead slot</p>} trip={trip} />
    );
    const text = page.getByRole('region', { name: 'Plan' }).element().textContent;
    expect(text).toBe('Lead slotItinerary slot');
  });

  test('reads as the whole trip an idea would become', async () => {
    const trip = {
      currency: 'USD',
      id: 'idea-1',
      initialBudget: null,
      permissions: { canEdit: true },
      proposal: { sourceTripId: 'trip-1' },
      totalPlannedCost: 0
    } as unknown as TripDetail;
    await render(<TripReadingOverview itinerary={null} trip={trip} />);
    await expect
      .element(page.getByRole('region', { name: 'The trip with this idea' }))
      .toBeInTheDocument();
    await expect.element(page.getByText(/what to pack/u)).not.toBeInTheDocument();
  });

  test("an idea's plan carries no floating budget line; the page header holds it", async () => {
    const trip = {
      currency: 'USD',
      id: 'idea-1',
      initialBudget: 100,
      permissions: { canEdit: false },
      proposal: { sourceTripId: 'trip-1' },
      totalPlannedCost: 150
    } as unknown as TripDetail;
    await render(<TripReadingOverview itinerary={null} trip={trip} />);
    await expect
      .element(page.getByRole('region', { name: 'The trip with this idea' }))
      .toBeInTheDocument();
    await expect.element(page.getByText(/budget|planned/)).not.toBeInTheDocument();
  });
});
