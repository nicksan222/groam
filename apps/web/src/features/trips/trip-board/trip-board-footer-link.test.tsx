import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripBoardContextValue } from '@/types/trip-board';
import { TripBoardContext } from './trip-board-context';
import { TripBoardFooterLink } from './trip-board-footer-link';

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

const context: TripBoardContextValue = {
  links: new Map(),
  rights: { archived: false, canPropose: true },
  tripId: 'trip-1' as Id<'trips'>,
  viewerUserId: 'user-alex'
};

describe('TripBoardFooterLink', () => {
  test.each<['ideas' | 'issues', string]>([
    ['ideas', '/trips/trip-1/ideas'],
    ['issues', '/trips/trip-1/issues']
  ])('links the %s section of the trip', async (section, href) => {
    await render(
      <TripBoardContext.Provider value={context}>
        <TripBoardFooterLink section={section} testId="footer-link">
          See all
        </TripBoardFooterLink>
      </TripBoardContext.Provider>
    );
    const link = page.getByRole('link', { name: 'See all' });
    await expect.element(link).toHaveAttribute('href', href);
    await expect.element(link).toHaveAttribute('data-testid', 'footer-link');
  });

  test('refuses to render outside the board', async () => {
    await expect(
      render(<TripBoardFooterLink section="ideas">x</TripBoardFooterLink>)
    ).rejects.toThrow();
  });
});
