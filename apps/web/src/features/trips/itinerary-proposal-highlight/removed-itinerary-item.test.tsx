import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import { RemovedItineraryItem } from './removed-itinerary-item';

function makeChange(fields: ItineraryChange['fields']): ItineraryChange {
  return {
    change: 'removed',
    entity: 'activity',
    fields,
    key: 'activity:1',
    label: 'Fado night'
  } as ItineraryChange;
}

test('shows the removed label, badge and a summary of the removed values', async () => {
  await render(
    <RemovedItineraryItem
      change={makeChange([
        {
          after: null,
          before: 'Alfama',
          display: 'value',
          format: 'text',
          key: 'place',
          label: 'Place'
        }
      ] as ItineraryChange['fields'])}
    />
  );
  await expect.element(page.getByRole('heading', { name: 'Fado night' })).toBeVisible();
  await expect.element(page.getByText('Removed from shared trip')).toBeInTheDocument();
  await expect.element(page.getByText('Place: Alfama')).toBeVisible();
});

test('omits the summary when the change has no visible fields', async () => {
  await render(<RemovedItineraryItem change={makeChange([])} />);
  await expect.element(page.getByRole('heading', { name: 'Fado night' })).toBeVisible();
  await expect.element(page.getByText('Place: Alfama')).not.toBeInTheDocument();
});
