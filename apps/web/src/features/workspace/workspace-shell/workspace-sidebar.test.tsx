import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { useWorkspaceDialogs } from './workspace-dialog-state';
import { WorkspaceSidebar } from './workspace-sidebar';

const state = vi.hoisted(() => ({
  pathname: '/',
  role: 'owner',
  switchOrganization: vi.fn(),
  toastError: vi.fn()
}));
const navigate = vi.hoisted(() => vi.fn());

const organizations = [
  { id: 'org-acme', logo: null, name: 'Acme Labs' },
  { id: 'org-smith', logo: null, name: 'The Smiths' }
];

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: state.pathname }),
  useNavigate: () => navigate
}));
vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}));
vi.mock('@groam/ui/components/toast', () => ({ toast: { error: state.toastError } }));
vi.mock('./workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: organizations[0],
    activeRole: state.role,
    organizations,
    switchOrganization: state.switchOrganization
  })
}));
vi.mock('./account-menu', () => ({ AccountMenu: () => <p>Account menu</p> }));
vi.mock('@/features/agents/agents-sidebar-nav', () => ({
  AgentsSidebarNav: () => <li>Agents nav</li>
}));
vi.mock('@/features/discussions/chats-sidebar-nav', () => ({
  ChatsSidebarNav: () => <li>Chats nav</li>
}));
vi.mock('@/features/ideas/ideas-sidebar-nav', () => ({
  IdeasSidebarNav: () => <li>Ideas nav</li>
}));
vi.mock('@/features/inbox/inbox-sidebar-nav', () => ({
  InboxSidebarNav: () => <li>Inbox nav</li>
}));
vi.mock('@/features/issues/issues-sidebar-nav', () => ({
  IssuesSidebarNav: () => <li>Issues nav</li>
}));
vi.mock('@/features/trips/trips-sidebar-nav', () => ({
  TripsSidebarNav: () => <li>Trips nav</li>
}));

const mount = () =>
  render(
    <SidebarProvider>
      <WorkspaceSidebar />
    </SidebarProvider>
  );

beforeEach(() => {
  state.pathname = '/';
  state.role = 'owner';
  state.switchOrganization.mockReset();
  state.switchOrganization.mockResolvedValue(undefined);
  state.toastError.mockClear();
  navigate.mockClear();
  useWorkspaceDialogs.getState().closeDialog();
});

describe('WorkspaceSidebar navigation', () => {
  test('renders home, each section nav, settings and the account menu', async () => {
    await mount();
    await expect.element(page.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    for (const text of [
      'Trips nav',
      'Ideas nav',
      'Issues nav',
      'Chats nav',
      'Agents nav',
      'Inbox nav',
      'Account menu'
    ]) {
      await expect.element(page.getByText(text)).toBeVisible();
    }
    await expect
      .element(page.getByRole('link', { name: 'Settings' }))
      .toHaveAttribute('href', '/settings');
  });

  test.each([
    ['/', 'Home', 'true'],
    ['/settings/profile', 'Settings', 'true'],
    ['/settings', 'Home', undefined]
  ])('at %s the %s link active=%s', async (pathname, name, active) => {
    state.pathname = pathname;
    await mount();
    const link = page.getByRole('link', { name });
    if (active) await expect.element(link).toHaveAttribute('data-active', 'true');
    else await expect.element(link).not.toHaveAttribute('data-active', 'true');
  });
});

describe('WorkspaceSidebar group switcher', () => {
  test('shows the active group and role', async () => {
    state.role = 'admin';
    await mount();
    const trigger = page.getByTestId('group-switcher');
    await expect.element(trigger).toBeVisible();
    await expect.poll(() => trigger.element().textContent).toContain('Acme Labs');
    await expect.poll(() => trigger.element().textContent).toContain('admin');
  });

  test('switching groups activates it and goes home', async () => {
    await mount();
    await page.getByRole('button', { name: /Acme Labs/ }).click();
    await page.getByRole('menuitem', { name: /The Smiths/ }).click();
    await expect.poll(() => navigate.mock.calls).toEqual([[{ to: '/' }]]);
    expect(state.switchOrganization).toHaveBeenCalledWith('org-smith');
  });

  test.each([
    ['an Error', new Error('Forbidden'), 'Forbidden'],
    ['an unknown value', { code: 1 }, 'Unable to switch group']
  ])('toasts when switching fails with %s', async (_, failure, message) => {
    state.switchOrganization.mockRejectedValue(failure);
    await mount();
    await page.getByRole('button', { name: /Acme Labs/ }).click();
    await page.getByRole('menuitem', { name: /The Smiths/ }).click();
    await expect.poll(() => state.toastError.mock.calls).toEqual([[message]]);
    expect(navigate).not.toHaveBeenCalled();
  });

  test.each([
    ['Join with code', 'join'],
    ['New group', 'create-organization']
  ] as const)('%s opens the %s dialog', async (label, dialog) => {
    await mount();
    await page.getByRole('button', { name: /Acme Labs/ }).click();
    await page.getByRole('menuitem', { name: label }).click();
    expect(useWorkspaceDialogs.getState().dialog).toBe(dialog);
  });

  test('group settings navigates to the group section', async () => {
    await mount();
    await page.getByRole('button', { name: /Acme Labs/ }).click();
    await page.getByRole('menuitem', { name: 'Group settings' }).click();
    expect(navigate).toHaveBeenCalledWith({
      params: { section: 'group' },
      to: '/settings/$section'
    });
  });
});
