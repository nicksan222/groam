import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripReadingOverview } from './trip-reading-overview';

vi.mock('@/features/trips/hooks/use-trip-packing', () => ({
  useTripPacking: () => ({
    add: vi.fn(),
    draft: '',
    isLoading: false,
    isPending: false,
    items: [{ id: 'i1', label: 'Passport', packed: false }],
    remove: vi.fn(),
    setDraft: vi.fn(),
    toggle: vi.fn()
  })
}));

describe('TripReadingOverview', () => {
  test('composes the section header, itinerary and packing', async () => {
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
    await expect.element(page.getByText('Passport')).toBeVisible();
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
