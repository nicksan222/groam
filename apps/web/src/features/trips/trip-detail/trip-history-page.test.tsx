import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { TripHistoryPage } from './trip-history-page';

// oxlint-disable-next-line groam/no-local-type-definitions -- test double shape
type RouteTarget = {
  params?: Record<string, string | number>;
  search?: Record<string, unknown>;
  to: string;
};

vi.mock('@tanstack/react-router', async () => {
  const navigate = vi.fn();
  const resolveHref = ({ params = {}, search = {}, to }: RouteTarget) => {
    const path = to.replace(/\$(\w+)/gu, (_, name: string) => String(params[name]));
    const query = new URLSearchParams(
      Object.entries(search).map(([key, value]) => [key, String(value)])
    ).toString();
    return query ? `${path}?${query}` : path;
  };
  return {
    ...(await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')),
    Link: ({ children, params, search, to, ...rest }: RouteTarget & { children?: ReactNode }) => (
      <a href={resolveHref({ params, search, to })} {...rest}>
        {children}
      </a>
    ),
    Navigate: (target: RouteTarget) => <div>navigate:{resolveHref(target)}</div>,
    useNavigate: () => navigate
  };
});

test('shows the history table without a subpage header or back link', async () => {
  await render(<TripHistoryPage trip={{ activity: [] } as unknown as TripDetail} />);
  await expect.element(page.getByTestId(testIds.tripHistoryPage)).toBeInTheDocument();
  await expect.element(page.getByRole('heading', { name: 'Trip history' })).not.toBeInTheDocument();
  await expect.element(page.getByText('Back to board')).not.toBeInTheDocument();
});
