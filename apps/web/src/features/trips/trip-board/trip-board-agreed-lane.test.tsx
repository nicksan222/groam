import { DndContext } from '@dnd-kit/core';
import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { AgreedDay } from '@/types/trip-board';
import { TripBoardAgreedLane } from './trip-board-agreed-lane';
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
  items: [] as { id: string; label: string; packed: boolean }[]
}));

vi.mock('@/features/trips/hooks/use-trip-packing', () => ({
  useTripPacking: () => packing
}));

beforeEach(() => {
  packing.isLoading = false;
  packing.items = [];
});

const days: AgreedDay[] = [
  {
    cards: [
      { day: 1, detail: null, key: 'a', kind: 'stop', label: 'Stop', title: 'Arrive in Lisbon' },
      { day: 1, detail: 'Pastel de nata', key: 'b', kind: 'plan', label: 'Morning', title: 'Cafe' }
    ],
    day: 1
  },
  {
    cards: [{ day: 2, detail: null, key: 'c', kind: 'plan', label: 'Evening', title: 'Dinner' }],
    day: 2
  }
];

function renderLane(agreed: AgreedDay[]) {
  return render(
    <DndContext>
      <TripBoardAgreedLane days={agreed} trip={makeTrip()} />
    </DndContext>
  );
}

describe('TripBoardAgreedLane', () => {
  test('groups agreed cards under day headings after the glance card', async () => {
    await renderLane(days);
    await expect.element(page.getByRole('heading', { name: 'Day 1' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Day 2' })).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Arrive in Lisbon' })).toBeVisible();
    await expect.element(page.getByRole('link', { name: 'Dinner' })).toBeVisible();
    await expect.element(page.getByRole('link', { name: '1 stop · Lisbon' })).toBeVisible();
    await expect.element(page.getByText('3 cards')).toBeInTheDocument();
  });

  test('says nothing is agreed yet when there are no days', async () => {
    await renderLane([]);
    await expect.element(page.getByText(/Nothing agreed yet/)).toBeVisible();
    await expect.element(page.getByRole('heading', { name: /Day / })).not.toBeInTheDocument();
    await expect.element(page.getByText('0 cards')).toBeInTheDocument();
  });

  test('links to the full plan from the footer', async () => {
    await renderLane(days);
    await expect
      .element(page.getByTestId('trip-board-plan-link'))
      .toHaveAttribute('href', '/trips/trip-1/overview');
  });
});
