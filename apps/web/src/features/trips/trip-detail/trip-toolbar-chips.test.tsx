import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { TripToolbarFacts } from '@/types/trips';
import { TripToolbarChips } from './trip-toolbar-chips';

function makeFacts(overrides: Partial<TripToolbarFacts> = {}): TripToolbarFacts {
  return { destination: 'Lisbon', length: '5 days', window: 'May 2026', ...overrides } as never;
}

describe('TripToolbarChips', () => {
  test('shows destination, window and length', async () => {
    await render(<TripToolbarChips destinationStatus="known" facts={makeFacts()} />);
    await expect.element(page.getByTestId(testIds.tripDestination)).toHaveTextContent('Lisbon');
    await expect
      .element(page.getByTestId(testIds.tripDestination))
      .toHaveAttribute('data-destination-status', 'known');
    await expect.element(page.getByText('May 2026')).toBeVisible();
    await expect.element(page.getByText('5 days')).toBeVisible();
  });

  test('omits an empty length chip', async () => {
    await render(
      <TripToolbarChips destinationStatus="known" facts={makeFacts({ length: '' as never })} />
    );
    await expect.element(page.getByText('5 days')).not.toBeInTheDocument();
  });

  test.each([
    [1, '1 traveler'],
    [4, '4 travelers'],
    [0, '0 travelers']
  ])('opens the roster with %i travelers', async (count, label) => {
    const onOpenRoster = vi.fn();
    await render(
      <TripToolbarChips
        destinationStatus="known"
        facts={makeFacts()}
        onOpenRoster={onOpenRoster}
        travelerCount={count}
      />
    );
    await page.getByRole('button', { name: label }).click();
    expect(onOpenRoster).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['no handler', undefined, 3],
    ['no count', () => undefined, undefined]
  ])('hides the roster button with %s', async (_, onOpenRoster, travelerCount) => {
    await render(
      <TripToolbarChips
        destinationStatus="known"
        facts={makeFacts()}
        onOpenRoster={onOpenRoster}
        travelerCount={travelerCount}
      />
    );
    await expect.element(page.getByRole('button')).not.toBeInTheDocument();
  });
});
