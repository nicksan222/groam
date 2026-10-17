import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripBoardContext } from './trip-board-context';
import { TripBoardIssuesFooter } from './trip-board-issues-footer';

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

test('offers a new issue and the list of all issues', async () => {
  const onNewIssue = vi.fn();
  await render(
    <TripBoardContext.Provider
      value={{
        rights: { archived: false, canPropose: true },
        tripId: 'trip-1' as Id<'trips'>,
        viewerUserId: undefined
      }}
    >
      <TripBoardIssuesFooter onNewIssue={onNewIssue} />
    </TripBoardContext.Provider>
  );
  await page.getByRole('button', { name: 'New issue' }).click();
  expect(onNewIssue).toHaveBeenCalledTimes(1);
  await expect
    .element(page.getByRole('link', { name: 'All issues' }))
    .toHaveAttribute('href', '/trips/trip-1/issues');
});

test('offers no new issue on an archived trip', async () => {
  await render(
    <TripBoardContext.Provider
      value={{
        rights: { archived: true, canPropose: true },
        tripId: 'trip-1' as Id<'trips'>,
        viewerUserId: undefined
      }}
    >
      <TripBoardIssuesFooter onNewIssue={vi.fn()} />
    </TripBoardContext.Provider>
  );
  await expect.element(page.getByRole('link', { name: 'All issues' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'New issue' })).not.toBeInTheDocument();
});
