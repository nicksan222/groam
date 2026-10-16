import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripBoardHistoryLink } from './trip-board-history-link';

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

test('links to the trip activity history', async () => {
  await render(<TripBoardHistoryLink tripId={'trip-9' as Id<'trips'>} />);
  await expect
    .element(page.getByRole('link', { name: 'Full history' }))
    .toHaveAttribute('href', '/trips/trip-9/activity');
});
