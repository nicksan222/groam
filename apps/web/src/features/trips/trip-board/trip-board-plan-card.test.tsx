import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { AgreedCard } from '@/types/trip-board';
import { TripBoardPlanCard } from './trip-board-plan-card';
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
const card = (over: Partial<AgreedCard> = {}): AgreedCard => ({
  day: 2,
  detail: null,
  key: 'k1',
  kind: 'plan',
  label: 'Morning',
  title: 'Walk the old town',
  ...over
});

describe('TripBoardPlanCard', () => {
  test('links the title to its day on the plan page', async () => {
    await render(<TripBoardPlanCard card={card()} tripId={'trip-1' as Id<'trips'>} />);
    await expect
      .element(page.getByRole('link', { name: 'Walk the old town' }))
      .toHaveAttribute('href', '/trips/trip-1/overview?day=2');
    await expect.element(page.getByText('Morning')).toBeVisible();
  });

  test.each([
    ['a different detail', 'Meet at the square', true],
    ['the same detail as the title', 'Walk the old town', false],
    ['no detail', null, false]
  ])('with %s the description shows: %s', async (_, detail, shown) => {
    await render(<TripBoardPlanCard card={card({ detail })} tripId={'trip-1' as Id<'trips'>} />);
    if (detail && shown) await expect.element(page.getByText(detail)).toBeVisible();
    else await expect.element(page.getByText('Meet at the square')).not.toBeInTheDocument();
  });

  test.each([
    ['a stop', 'stop', 1],
    ['a plan entry', 'plan', 0]
  ])('%s shows a map pin icon: %s', async (_, kind, pins) => {
    await render(
      <TripBoardPlanCard
        card={card({ kind } as Partial<AgreedCard>)}
        tripId={'trip-1' as Id<'trips'>}
      />
    );
    await expect.poll(() => document.querySelectorAll('svg.lucide-map-pin').length).toBe(pins);
  });
});
