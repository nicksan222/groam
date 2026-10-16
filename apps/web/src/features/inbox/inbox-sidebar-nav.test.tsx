import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { InboxSidebarNav } from './inbox-sidebar-nav';

const state = vi.hoisted(() => ({ pathname: '/trips', unread: 0 }));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props} onClick={(event) => event.preventDefault()}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: state.pathname }),
  useNavigate: () => vi.fn()
}));

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props} onClick={(event) => event.preventDefault()}>
      {children}
    </a>
  )
}));

vi.mock('./hooks/use-workspace-notifications', () => ({
  useWorkspaceNotifications: () => ({ unread: state.unread })
}));

async function renderNav() {
  return render(
    <SidebarProvider>
      <ul>
        <InboxSidebarNav />
      </ul>
    </SidebarProvider>
  );
}

beforeEach(() => {
  state.pathname = '/trips';
  state.unread = 0;
});

describe('InboxSidebarNav', () => {
  test('links to the inbox without a badge when nothing is unread', async () => {
    await renderNav();
    const link = page.getByTestId(testIds.navInbox);
    await expect.element(link).toHaveAttribute('href', '/inbox');
    await expect.element(link).toHaveTextContent('Inbox');
    await expect.element(page.getByText('0')).not.toBeInTheDocument();
  });

  test.each([
    [1, '1'],
    [9, '9'],
    [10, '9+'],
    [42, '9+']
  ])('shows %i unread as %s', async (unread, label) => {
    state.unread = unread;
    await renderNav();
    await expect.element(page.getByTestId(testIds.navInbox)).toHaveTextContent(`Inbox${label}`);
  });

  test.each([
    ['/inbox', 'true'],
    ['/trips', null]
  ])('marks active state for %s', async (pathname, active) => {
    state.pathname = pathname;
    await renderNav();
    const button = page.getByTestId(testIds.navInbox);
    if (active) await expect.element(button).toHaveAttribute('data-active', active);
    else await expect.element(button).not.toHaveAttribute('data-active', 'true');
  });
});
