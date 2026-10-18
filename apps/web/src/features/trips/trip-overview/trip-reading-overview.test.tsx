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
    await expect.element(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect.element(page.getByText('$200.00 / $1,000.00 budget')).toBeVisible();
    await expect.element(page.getByText('Itinerary slot')).toBeVisible();
    await expect.element(page.getByText('Packing')).not.toBeInTheDocument();
    await expect.element(page.getByText(/what to pack/u)).not.toBeInTheDocument();
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
      .element(page.getByRole('heading', { name: 'The trip with this idea' }))
      .toBeVisible();
    await expect.element(page.getByText(/whole shared trip becomes/u)).toBeVisible();
    await expect.element(page.getByText(/what to pack/u)).not.toBeInTheDocument();
  });

  test.each<[string, number | null, number, string | null]>([
    ['no budget and nothing planned', null, 0, null],
    ['planned cost without a budget', null, 150, '$150.00 planned'],
    ['over budget', 100, 150, '$150.00 / $100.00 over budget']
  ])('shows the badge for %s', async (_case, initialBudget, totalPlannedCost, badge) => {
    const trip = {
      currency: 'USD',
      id: 'idea-1',
      initialBudget,
      permissions: { canEdit: false },
      totalPlannedCost
    } as unknown as TripDetail;
    await render(<TripReadingOverview itinerary={null} trip={trip} />);
    await expect.element(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    if (badge) await expect.element(page.getByText(badge)).toBeVisible();
    else await expect.element(page.getByText(/budget|planned/)).not.toBeInTheDocument();
  });
});
