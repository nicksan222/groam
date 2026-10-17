import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripListFilteredEmpty } from './trip-list-filtered-empty';

describe('TripListFilteredEmpty', () => {
  test('shows the filter message and resets filters on request', async () => {
    const onReset = vi.fn();
    const { container } = await render(
      <TripListFilteredEmpty
        message="No trips match “Lisbon”"
        onReset={onReset}
        searching={false}
      />
    );
    await expect.element(page.getByText('No trips match “Lisbon”')).toBeVisible();
    await expect
      .element(page.getByText('Try a different search or change your status filter.'))
      .toBeVisible();
    expect(
      container.querySelector('[data-slot="trip-list-filtered-empty"]')?.getAttribute('aria-busy')
    ).toBe('false');
    await page.getByRole('button', { name: 'Reset filters' }).click();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('says it is still searching instead of claiming nothing matches', async () => {
    const { container } = await render(
      <TripListFilteredEmpty message="No trips match" onReset={vi.fn()} searching />
    );
    await expect.element(page.getByText('Looking through more trips…')).toBeVisible();
    await expect.element(page.getByText('Nothing on the loaded trips matches yet.')).toBeVisible();
    await expect.element(page.getByText('No trips match')).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="trip-list-filtered-empty"]')?.getAttribute('aria-busy')
    ).toBe('true');
    await expect.element(page.getByRole('button', { name: 'Reset filters' })).toBeEnabled();
  });
});
