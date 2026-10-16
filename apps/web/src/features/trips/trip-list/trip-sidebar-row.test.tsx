import { SidebarProvider } from '@groam/ui/components/sidebar';
import { SidebarMenuSub } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { TripSidebarRow } from './trip-sidebar-row';

vi.mock('@/features/workspace/navigation/router', () => ({
  CanonicalLink: ({
    children,
    params,
    to,
    ...rest
  }: ComponentProps<'a'> & { params?: Record<string, string>; search?: unknown; to: string }) => (
    <a
      href={String(to)
        .replace('$tripId', params?.tripId ?? '')
        .replace('$section', params?.section ?? '')}
      {...rest}
    >
      {children}
    </a>
  )
}));

function makeTrip(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    archivedAt: null,
    coverUrl: null,
    destination: null,
    favorite: false,
    id: 'trip-1',
    name: 'Atlantic week',
    ...overrides
  } as unknown as TripListItem;
}

function makeHandlers() {
  return {
    onArchive: vi.fn(),
    onCopyLink: vi.fn(),
    onFavorite: vi.fn(),
    onMenuOpenChange: vi.fn(),
    onOpen: vi.fn(),
    onOpenMobile: vi.fn()
  };
}

async function renderRow(
  props: Partial<Parameters<typeof TripSidebarRow>[0]> = {},
  handlers = makeHandlers()
) {
  await render(
    <SidebarProvider>
      <SidebarMenuSub>
        <TripSidebarRow
          active={false}
          menuOpen={false}
          pending={false}
          trip={makeTrip()}
          {...handlers}
          {...props}
        />
      </SidebarMenuSub>
    </SidebarProvider>
  );
  return handlers;
}

describe('TripSidebarRow', () => {
  test('links to the trip board and notifies mobile navigation', async () => {
    const handlers = await renderRow({ trip: makeTrip({ shortId: 'atl' } as never) });
    const link = page.getByRole('link', { name: 'Atlantic week' });
    await expect.element(link).toHaveAttribute('href', '/trips/atl/board');
    await link.click();
    expect(handlers.onOpenMobile).toHaveBeenCalled();
  });

  test.each([
    ['plain', {}, 'Atlantic week'],
    ['with a destination', { destination: 'Lisbon' }, 'Atlantic week · Lisbon'],
    ['favourite', { favorite: true }, 'Favourite · Atlantic week'],
    [
      'favourite with a destination',
      { destination: 'Lisbon', favorite: true },
      'Favourite · Atlantic week · Lisbon'
    ]
  ] as const)('titles a %s trip', async (_, overrides, title) => {
    await renderRow({ trip: makeTrip(overrides as Partial<TripListItem>) });
    await expect
      .element(page.getByRole('link', { name: 'Atlantic week' }))
      .toHaveAttribute('title', title);
  });

  test('shows the cover image when there is one', async () => {
    await renderRow({ trip: makeTrip({ coverUrl: 'https://example.test/cover.png' }) });
    await expect
      .element(page.getByRole('link', { name: 'Atlantic week' }).getByRole('img'))
      .not.toBeInTheDocument();
    expect(document.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.test/cover.png'
    );
  });

  test('reports menu open changes from the actions button', async () => {
    const handlers = await renderRow();
    await page.getByRole('button', { name: 'Actions for Atlantic week' }).click({ force: true });
    expect(handlers.onMenuOpenChange).toHaveBeenCalledWith(true);
  });

  test('disables the actions button while a change is pending', async () => {
    await renderRow({ pending: true });
    await expect
      .element(page.getByRole('button', { name: 'Actions for Atlantic week' }))
      .toBeDisabled();
  });

  test.each([
    ['Favourite', 'onFavorite'],
    ['Open', 'onOpen'],
    ['Copy link', 'onCopyLink'],
    ['Archive', 'onArchive']
  ] as const)('menu item %s fires its handler', async (label, handler) => {
    const handlers = await renderRow({ menuOpen: true });
    await page.getByRole('menuitem', { name: label }).click();
    expect(handlers[handler]).toHaveBeenCalledTimes(1);
    if (handler === 'onOpen') expect(handlers.onOpen).toHaveBeenCalledWith('board');
  });

  test('offers to remove a favourite', async () => {
    await renderRow({ menuOpen: true, trip: makeTrip({ favorite: true }) });
    await expect.element(page.getByRole('menuitem', { name: 'Remove favourite' })).toBeVisible();
  });

  test('disables favourite and archive while pending', async () => {
    await renderRow({ menuOpen: true, pending: true });
    await expect
      .element(page.getByRole('menuitem', { name: 'Favourite' }))
      .toHaveAttribute('data-disabled');
    await expect
      .element(page.getByRole('menuitem', { name: 'Archive' }))
      .toHaveAttribute('data-disabled');
    await expect
      .element(page.getByRole('menuitem', { name: 'Copy link' }))
      .not.toHaveAttribute('data-disabled');
  });
});
