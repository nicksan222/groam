import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripEmptyItinerary } from './trip-empty-itinerary';

describe('TripEmptyItinerary', () => {
  test('offers to add the first destination when allowed', async () => {
    const onAddDestination = vi.fn();
    await render(<TripEmptyItinerary onAddDestination={onAddDestination} />);

    await expect.element(page.getByText('Start with your first destination')).toBeVisible();
    await page.getByRole('button', { name: 'Add first destination' }).click();
    expect(onAddDestination).toHaveBeenCalledTimes(1);
  });

  test('is read-only without an add handler', async () => {
    await render(<TripEmptyItinerary />);

    await expect.element(page.getByText('The itinerary is still wide open')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Add first destination' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByText('Experiences')).toBeVisible();
  });
});
