import { OPEN_ASSISTANT_EVENT } from '@groam/ai/ui/chat/ai-assistant-widget';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { WorkspaceShell } from './workspace-shell';

const route = vi.hoisted(() => ({
  current: {
    onTripRoute: false,
    reference: null as string | null,
    trip: null as { id: string; name: string } | null
  },
  pathname: '/trips'
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Link: ({
    children,
    params,
    to,
    ...props
  }: ComponentProps<'a'> & { params?: Record<string, string>; to: string }) => (
    <a href={to.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? '')} {...props}>
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

vi.mock('@/features/trips/hooks/use-current-trip', () => ({
  useCurrentTrip: () => route.current
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

const topBar = () => page.getByTestId(testIds.mobileTopBar);

beforeEach(() => {
  route.current = { onTripRoute: false, reference: null, trip: null };
  route.pathname = '/trips';
});

describe('mobile top bar on a phone', () => {
  beforeEach(() => useViewport(390, 844));

  test('offers the menu, the title and the assistant', async () => {
    route.pathname = '/inbox';
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    await expect.element(page.getByTestId(testIds.mobileMenu)).toBeVisible();
    await expect.poll(() => topBar().element().textContent).toContain('Inbox');
    await expect.element(topBar().getByRole('button', { name: 'Open Groam AI' })).toBeVisible();
  });

  test('names the page, not a remembered trip, off a trip route', async () => {
    route.pathname = '/inbox';
    route.current = {
      onTripRoute: false,
      reference: 'atl123',
      trip: { id: 'trip-1', name: 'Atlantic week' }
    };
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    await expect.poll(() => topBar().element().textContent).toContain('Inbox');
    expect(topBar().element().textContent).not.toContain('Atlantic week');
  });

  test('names the current trip on a trip page', async () => {
    route.pathname = '/trips/atl123/plan';
    route.current = {
      onTripRoute: true,
      reference: 'atl123',
      trip: { id: 'trip-1', name: 'Atlantic week' }
    };
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    await expect.poll(() => topBar().element().textContent).toContain('Atlantic week');
  });

  test('the menu button opens the sidebar sheet', async () => {
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    await expect.element(page.getByText('Sidebar closed')).toBeVisible();
    await page.getByTestId(testIds.mobileMenu).click();
    await expect.element(page.getByText('Sidebar open')).toBeVisible();
  });

  test('the sparkle asks the shell to open the assistant', async () => {
    const opened = vi.fn();
    window.addEventListener(OPEN_ASSISTANT_EVENT, opened);
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    await topBar().getByRole('button', { name: 'Open Groam AI' }).click();
    window.removeEventListener(OPEN_ASSISTANT_EVENT, opened);
    expect(opened).toHaveBeenCalledOnce();
  });

  test('leaves no bottom navigation behind', async () => {
    await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
    await expect
      .element(page.getByRole('navigation', { name: 'Mobile navigation' }))
      .not.toBeInTheDocument();
  });
});

test('the desktop shell has no mobile top bar', async () => {
  await render(<WorkspaceShell>{pageContent}</WorkspaceShell>);
  await expect.element(page.getByText('Page content')).toBeVisible();
  await expect.element(topBar()).not.toBeInTheDocument();
});
