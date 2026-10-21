import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { WorkspaceShell } from './workspace-shell';

const route = vi.hoisted(() => ({ pathname: '/trips' }));

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Link: ({ children, to, ...props }: ComponentProps<'a'> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({
    hash: '',
    pathname: route.pathname,
    search: '',
    searchParams: new URLSearchParams()
  })
}));

vi.mock('./workspace-state', () => ({
  useWorkspace: () => ({ activeOrganization: { id: 'org-acme', name: 'Acme Labs' } })
}));

vi.mock('./workspace-sidebar', () => ({
  WorkspaceSidebar: () => {
    const { openMobile } = useSidebar();
    return <aside aria-label="Sidebar">{openMobile ? 'Sidebar open' : 'Sidebar closed'}</aside>;
  }
}));

vi.mock('./workspace-assistant-widget', () => ({ WorkspaceAssistantWidget: () => null }));
vi.mock('./workspace-dialogs', () => ({ WorkspaceDialogs: () => null }));
vi.mock('@/features/workspace/workspace-command/command-palette', () => ({
  CommandPalette: () => null
}));

const pageContent = <main>Page content</main>;

const areas = ['Home', 'Trips', 'Ideas', 'Chat'];

const mobileNav = () => page.getByRole('navigation', { name: 'Mobile navigation' });

beforeEach(() => {
  route.pathname = '/trips';
});

describe('mobile navigation on a phone', () => {
  beforeEach(() => useViewport(390, 844));

  test('offers the four planning areas, the assistant and a menu', async () => {
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    for (const [label, href] of [
      ['Home', '/'],
      ['Trips', '/trips'],
      ['Ideas', '/ideas'],
      ['Chat', '/chat']
    ]) {
      await expect
        .element(mobileNav().getByRole('link', { name: label }))
        .toHaveAttribute('href', href);
    }
    await expect.element(mobileNav().getByRole('button', { name: 'Open Groam AI' })).toBeVisible();
    await expect.element(mobileNav().getByRole('button', { name: 'More' })).toBeVisible();
  });

  test.each([
    ['/', 'Home'],
    ['/trips', 'Trips'],
    ['/trips/trip-1/itinerary', 'Trips'],
    ['/ideas', 'Ideas'],
    ['/ideas/idea-1', 'Ideas'],
    ['/chat', 'Chat'],
    ['/settings', null],
    ['/issues', null],
    ['/trips-archive', null]
  ])('on %s the current area is %s', async (pathname, current) => {
    route.pathname = pathname;
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    for (const label of areas) {
      const link = mobileNav().getByRole('link', { name: label });
      if (label === current) await expect.element(link).toHaveAttribute('aria-current', 'page');
      else await expect.element(link).not.toHaveAttribute('aria-current');
    }
  });

  test('hides itself inside a chat thread so the composer owns the bottom edge', async () => {
    route.pathname = '/chat/thread-1';
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    await expect.element(page.getByText('Page content')).toBeVisible();
    await expect.element(mobileNav()).not.toBeInTheDocument();
  });

  test('sits on the bottom edge across the full width without scrolling the page sideways', async () => {
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    const box = mobileNav().element().getBoundingClientRect();
    expect(box.left).toBe(0);
    expect(box.width).toBe(document.documentElement.clientWidth);
    expect(box.bottom).toBe(window.innerHeight);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    );
  });

  test('"More" opens the sidebar menu', async () => {
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    await expect.element(page.getByText('Sidebar closed')).toBeVisible();
    await mobileNav().getByRole('button', { name: 'More' }).click();
    await expect.element(page.getByText('Sidebar open')).toBeVisible();
  });

  test('the AI button asks the shell to open the assistant', async () => {
    const opened = vi.fn();
    window.addEventListener('groam:open-assistant', opened);
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    await mobileNav().getByRole('button', { name: 'Open Groam AI' }).click();
    window.removeEventListener('groam:open-assistant', opened);
    expect(opened).toHaveBeenCalledOnce();
  });
});

test('the desktop shell has no bottom navigation', async () => {
  await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
  await expect.element(page.getByText('Page content')).toBeVisible();
  await expect.element(mobileNav()).not.toBeInTheDocument();
});
