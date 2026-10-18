import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import { RemovedItinerarySection } from './removed-itinerary-section';

vi.mock('@/features/trips/itinerary-proposal-highlight/removed-itinerary-item', () => ({
  RemovedItineraryItem: ({ change }: { change: { key: string } }) => <li>removed:{change.key}</li>
}));

const change = (key: string) => ({ key }) as unknown as ItineraryChange;

describe('RemovedItinerarySection', () => {
  test('renders nothing without removals', async () => {
    await render(<RemovedItinerarySection changes={[]} />);
    await expect
      .element(page.getByRole('region', { name: 'Removed from shared trip' }))
      .not.toBeInTheDocument();
  });

  test('lists every removed item under the heading', async () => {
    await render(<RemovedItinerarySection changes={[change('a'), change('b')]} />);
    await expect
      .element(page.getByRole('region', { name: 'Removed from shared trip' }))
      .toBeVisible();
    await expect.element(page.getByText('removed:a')).toBeVisible();
    await expect.element(page.getByText('removed:b')).toBeVisible();
  });
});
