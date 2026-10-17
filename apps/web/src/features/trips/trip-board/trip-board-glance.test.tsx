import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripBoardGlance } from './trip-board-glance';
vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params = {},
    search,
    to,
    ...rest
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    to: string;
  }) => (
    <a
      {...rest}
      href={
        Object.entries(params).reduce((href, [key, value]) => href.replace(`$${key}`, value), to) +
        (search && Object.keys(search).length > 0
          ? `?${new URLSearchParams(search as Record<string, string>)}`
          : '')
      }
    >
      {children}
    </a>
  )
}));
const makeTrip = (over: Record<string, unknown> = {}) =>
  ({
    currency: 'USD',
    destinations: [{ name: 'Lisbon' }],
    id: 'trip-1' as Id<'trips'>,
    initialBudget: null,
    ...over
  }) as unknown as TripDetail;

const packing = vi.hoisted(() => ({
  isLoading: false,
  items: [] as { brought: number; id: string; label: string; quantity: number }[]
}));

vi.mock('@/features/trips/hooks/use-trip-packing', () => ({
  useTripPacking: () => packing
}));

beforeEach(() => {
  packing.isLoading = false;
  packing.items = [];
});

describe('TripBoardGlance', () => {
  test.each([
    ['no stops', [], 'No stops yet'],
    ['one stop', ['Kyoto'], '1 stop · Kyoto'],
    ['three stops', ['A', 'B', 'C'], '3 stops · A → B → C'],
    ['more than three', ['A', 'B', 'C', 'D', 'E'], '5 stops · A → B → C +2']
  ])('summarises the route for %s', async (_, names, text) => {
    await render(
      <TripBoardGlance trip={makeTrip({ destinations: names.map((name) => ({ name })) })} />
    );
    await expect
      .element(page.getByRole('link', { name: text }))
      .toHaveAttribute('href', '/trips/trip-1/overview');
  });

  test.each([
    ['no budget', null, false],
    ['a budget', 1500, true],
    ['a zero budget', 0, true]
  ])('with %s the budget chip shows: %s', async (_, initialBudget, shown) => {
    await render(<TripBoardGlance trip={makeTrip({ initialBudget })} />);
    const chip = page.getByText(/budget/);
    if (shown) await expect.element(chip).toBeVisible();
    else await expect.element(chip).not.toBeInTheDocument();
  });

  test.each([
    ['no gear', [], 'No group gear yet'],
    [
      'part covered',
      [
        { brought: 2, id: 'a', label: 'Hair dryer', quantity: 2 },
        { brought: 0, id: 'b', label: 'Tent', quantity: 1 }
      ],
      '1/2 gear covered'
    ]
  ])('shows gear coverage for %s', async (_, items, text) => {
    packing.items = items;
    await render(<TripBoardGlance trip={makeTrip()} />);
    await expect.element(page.getByText(text)).toBeVisible();
  });

  test('hides packing while it loads', async () => {
    packing.isLoading = true;
    await render(<TripBoardGlance trip={makeTrip()} />);
    await expect.element(page.getByText(/gear/)).not.toBeInTheDocument();
  });

  test('the gear chip links to the Packing tab', async () => {
    packing.items = [{ brought: 1, id: 'a', label: 'Tent', quantity: 1 }];
    await render(<TripBoardGlance trip={makeTrip()} />);
    await expect
      .element(page.getByRole('link', { name: '1/1 gear covered' }))
      .toHaveAttribute('href', '/trips/trip-1/packing');
  });
});
