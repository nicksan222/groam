import { SidebarProvider } from '@groam/ui/components/sidebar';
import { useSidebar } from '@groam/ui/hooks/use-sidebar';
import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { type MouseEvent, type ReactNode, useEffect } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { useWorkspaceDialogs } from './workspace-dialog-state';
import { WorkspaceSidebar } from './workspace-sidebar';

const state = vi.hoisted(() => ({
  current: {
    isLoading: false,
    onTripRoute: false,
    reference: null as string | null,
    trip: null as null | Record<string, unknown>
  },
  params: {} as Record<string, string>,
  pathname: '/',
  discussions: [] as Array<{ tripId: string | null; unread: boolean }>,
  trips: [] as Array<Record<string, unknown>>,
  role: 'owner',
  switchOrganization: vi.fn(),
  toastError: vi.fn()
}));
const navigate = vi.hoisted(() => vi.fn());

const organizations = [
  { id: 'org-acme', logo: null, name: 'Acme Labs' },
  { id: 'org-smith', logo: null, name: 'The Smiths' }
];

const sharedTrip = {
  canParticipate: true,
  favorite: false,
  shortId: 'atl123',
  coverUrl: null,
  dateNotes: null,
  destination: { name: 'Lisbon', status: 'known' },
  id: 'trip-1',
  name: 'Atlantic week',
  permissions: { canArchive: true },
  proposal: null
};

vi.mock('@/lib/navigation/router', () => ({
  useLocation: () => ({
    hash: '',
    pathname: state.pathname,
    search: '',
    searchParams: new URLSearchParams()
  }),
  useNavigate: () => navigate,
  useParams: () => state.params
}));
vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    onClick,
    params,
    to,
    viewTransition: _viewTransition,
    ...props
  }: {
    children?: ReactNode;
    onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    params?: Record<string, string>;
    to: string;
    viewTransition?: boolean;
  }) => (
    <a
      href={to.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? '')}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
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
vi.mock('@/features/inbox/hooks/use-workspace-notifications', () => ({
  useWorkspaceNotifications: () => ({ unread: 3 })
}));
vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useDiscussions: () => ({ discussions: state.discussions, isLoading: false })
}));
vi.mock('@/features/trips/hooks/use-current-trip', () => ({
  useCurrentTrip: () => state.current
}));
vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({ createTrip: vi.fn(), trips: state.trips })
}));
vi.mock('@/features/trips/hooks/use-trip-sidebar-actions', () => ({
  useTripSidebarActions: () => ({ pendingTripId: null, toggleFavorite: vi.fn() })
}));
vi.mock('@/features/trips/hooks/use-trip-section-counts', () => ({
  useTripSectionCounts: () => ({ ideas: { count: 3, waiting: true }, research: 0 })
}));

function OpenSheet() {
  const { setOpenMobile } = useSidebar();
  useEffect(() => setOpenMobile(true), [setOpenMobile]);
  return null;
}

const mount = () =>
  render(
    <SidebarProvider>
      <WorkspaceSidebar />
    </SidebarProvider>
  );

beforeEach(() => {
  state.current = { isLoading: false, onTripRoute: false, reference: null, trip: null };
  state.params = {};
  state.trips = [];
  state.discussions = [];
  state.pathname = '/';
  state.role = 'owner';
  state.switchOrganization.mockReset();
  state.switchOrganization.mockResolvedValue(undefined);
  state.toastError.mockClear();
  navigate.mockClear();
  useWorkspaceDialogs.getState().closeDialog();
});

const rowIds = () =>
  page
    .getByRole('link')
    .elements()
    .map((link) => link.getAttribute('data-section') ?? link.getAttribute('data-testid'));

const sectionIds = [
  'plan',
  'calendar',
  'map',
  'ideas',
  'issues',
  'polls',
  'packing',
  'research',
  'activity',
  'people'
];

describe('WorkspaceSidebar navigation', () => {
  test('keeps only the account links in the footer, each with its own id', async () => {
    await mount();
    await expect.element(page.getByText('Account menu')).toBeVisible();
    expect(rowIds()).toEqual([
      testIds.navHome,
      testIds.navInbox,
      testIds.navChats,
      testIds.navSettings
    ]);
    await expect
      .element(page.getByTestId(testIds.navSettings))
      .toHaveAttribute('href', '/settings');
    expect(page.getByTestId(testIds.navInbox).element().closest('li')?.textContent).toBe('Inbox3');
  });

  test('Chats counts every unread chat, trip chats included', async () => {
    state.discussions = [
      { tripId: null, unread: true },
      { tripId: null, unread: false },
      { tripId: 'trip-1', unread: true }
    ];
    await mount();
    expect(page.getByTestId(testIds.navChats).element().closest('li')?.textContent).toBe('Chats2');
  });

  test('Chats has no badge when nothing is unread', async () => {
    state.discussions = [{ tripId: null, unread: false }];
    await mount();
    expect(page.getByTestId(testIds.navChats).element().closest('li')?.textContent).toBe('Chats');
  });

  test.each([
    ['/', 'Home', 'true'],
    ['/settings/profile', 'Settings', 'true'],
    ['/chat', 'Chats', 'true'],
    ['/chat/abc', 'Chats', 'true'],
    ['/settings', 'Home', undefined]
  ])('at %s the %s link active=%s', async (pathname, name, active) => {
    state.pathname = pathname;
    await mount();
    const link = page.getByRole('link', { name });
    if (active) await expect.element(link).toHaveAttribute('data-active', 'true');
    else await expect.element(link).not.toHaveAttribute('data-active', 'true');
  });
});

describe('WorkspaceSidebar trip block', () => {
  const switcherText = () => page.getByTestId(testIds.tripSwitcher).element().textContent;
  const plan = () => page.getByRole('link', { name: 'Plan' });

  test('lists the trip switcher and every section above the account links', async () => {
    state.current = { ...state.current, reference: 'atl123', trip: sharedTrip };
    await mount();
    await expect.poll(switcherText).toContain('Atlantic week');
    expect(rowIds()).toEqual([
      ...sectionIds,
      testIds.navHome,
      testIds.navInbox,
      testIds.navChats,
      testIds.navSettings
    ]);
  });

  test('never scrolls at 900px tall with all twelve sections', async () => {
    await useViewport(1280, 900);
    state.current = { ...state.current, reference: 'atl123', trip: sharedTrip };
    await mount();
    await expect.element(page.getByRole('link', { name: 'People' })).toBeVisible();
    const content = document.querySelector('[data-slot="sidebar-content"]');
    expect(content).not.toBeNull();
    expect(content!.scrollHeight).toBeLessThanOrEqual(content!.clientHeight);
    const container = document.querySelector('[data-slot="sidebar-inner"]');
    expect(container!.getBoundingClientRect().bottom).toBeLessThanOrEqual(900);
  });

  test('hides the sections and invites a choice when there is no current trip', async () => {
    await mount();
    await expect.poll(switcherText).toContain('Choose a trip');
    await expect.element(plan()).not.toBeInTheDocument();
  });

  test('hides the sections for a trip the viewer cannot plan in', async () => {
    state.current = {
      ...state.current,
      reference: 'atl123',
      trip: { ...sharedTrip, canParticipate: false }
    };
    await mount();
    await expect.element(page.getByTestId(testIds.tripSwitcher)).toBeVisible();
    await expect.element(plan()).not.toBeInTheDocument();
  });

  test('on a phone the sheet shows the same sidebar, sections included', async () => {
    await useViewport(390, 844);
    state.current = { ...state.current, reference: 'atl123', trip: sharedTrip };
    await render(
      <SidebarProvider>
        <OpenSheet />
        <WorkspaceSidebar />
      </SidebarProvider>
    );
    await expect.element(page.getByTestId(testIds.tripSwitcher)).toBeVisible();
    await expect.element(plan()).toBeVisible();
    await expect.element(page.getByTestId(testIds.navSettings)).toBeVisible();
  });

  describe('on a phone the sheet closes after a choice', () => {
    beforeEach(() => useViewport(390, 844));

    async function openSheet() {
      state.current = { ...state.current, reference: 'atl123', trip: sharedTrip };
      state.trips = [
        {
          coverUrl: null,
          favorite: false,
          id: 'trip-2',
          name: 'Alps',
          shortId: 'alp456'
        }
      ];
      await render(
        <SidebarProvider>
          <OpenSheet />
          <WorkspaceSidebar />
        </SidebarProvider>
      );
      await expect.element(page.getByTestId(testIds.tripSwitcher)).toBeVisible();
    }

    test('after a section', async () => {
      await openSheet();
      await plan().click();
      await expect.element(page.getByTestId(testIds.tripSwitcher)).not.toBeInTheDocument();
    });

    test('after a footer link', async () => {
      await openSheet();
      await page.getByTestId(testIds.navSettings).click();
      await expect.element(page.getByTestId(testIds.tripSwitcher)).not.toBeInTheDocument();
    });

    test('after a choice in the Group submenu', async () => {
      await openSheet();
      await page.getByTestId(testIds.tripSwitcher).click();
      await page.getByTestId(testIds.groupSwitcher).click();
      await page.getByTestId(testIds.groupSwitcherSettings).click();
      await expect.element(page.getByTestId(testIds.tripSwitcher)).not.toBeInTheDocument();
    });

    test('after picking another trip', async () => {
      await openSheet();
      await page.getByTestId(testIds.tripSwitcher).click();
      await page.getByRole('menuitem', { name: /Alps/ }).click();
      await expect.element(page.getByTestId(testIds.tripSwitcher)).not.toBeInTheDocument();
    });
  });

  test('marks the section on screen active', async () => {
    state.current = {
      ...state.current,
      onTripRoute: true,
      reference: 'trip-1',
      trip: sharedTrip
    };
    state.params = { section: 'packing', tripId: 'trip-1' };
    state.pathname = '/trips/trip-1/packing';
    await mount();
    await expect
      .element(page.getByRole('link', { name: 'Packing' }))
      .toHaveAttribute('data-active', 'true');
    await expect.element(plan()).not.toHaveAttribute('data-active', 'true');
  });
});

const switcherText = () => page.getByTestId(testIds.tripSwitcher).element().textContent;

async function openGroupMenu() {
  await page.getByTestId(testIds.tripSwitcher).click();
  await page.getByTestId(testIds.groupSwitcher).click();
}

describe('WorkspaceSidebar group switcher', () => {
  test('keeps no group switcher in the header; the trip switcher names the group', async () => {
    await mount();
    await expect.element(page.getByTestId(testIds.groupSwitcher)).not.toBeInTheDocument();
    await expect
      .element(page.getByTestId(testIds.tripSwitcher))
      .toHaveAttribute('data-group-name', 'Acme Labs');
  });

  test('the trip switcher menu ends with a group submenu naming the active group and role', async () => {
    await mount();
    await page.getByTestId(testIds.tripSwitcher).click();
    const group = () => page.getByTestId(testIds.groupSwitcher).element().textContent;
    await expect.poll(group).toContain('Acme Labs');
    await expect.poll(group).toContain('Group · Owner');
  });

  test('lists only the other groups, and switching one activates it and goes home', async () => {
    await mount();
    await openGroupMenu();
    await expect
      .element(page.getByTestId(testIds.groupSwitcherItem))
      .toHaveAttribute('data-group-name', 'The Smiths');
    expect(page.getByTestId(testIds.groupSwitcherItem).elements()).toHaveLength(1);
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
    await openGroupMenu();
    await page.getByRole('menuitem', { name: /The Smiths/ }).click();
    await expect.poll(() => state.toastError.mock.calls).toEqual([[message]]);
  });

  test.each([
    ['Join with code', 'join'],
    ['New group', 'create-organization']
  ] as const)('%s opens the %s dialog', async (label, dialog) => {
    await mount();
    await openGroupMenu();
    await page.getByRole('menuitem', { name: label }).click();
    expect(useWorkspaceDialogs.getState().dialog).toBe(dialog);
  });

  test('group settings navigates to the group section', async () => {
    await mount();
    await openGroupMenu();
    await page.getByTestId(testIds.groupSwitcherSettings).click();
    expect(navigate).toHaveBeenCalledWith({
      params: { section: 'group' },
      to: '/settings/$section'
    });
  });

  test('the keyboard opens the Group submenu with ArrowRight', async () => {
    await mount();
    await page.getByTestId(testIds.tripSwitcher).click();
    const group = page.getByTestId(testIds.groupSwitcher);
    (group.element() as HTMLElement).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(page.getByTestId(testIds.groupSwitcherNew)).toBeVisible();
  });

  test('names the active group and role at rest, inside the trip switcher', async () => {
    state.role = 'admin';
    await mount();
    await expect.poll(switcherText).toContain('Acme Labs · Admin');
  });

  test('is still offered when no trip is chosen', async () => {
    await mount();
    await expect.poll(switcherText).toContain('Choose a trip');
    await openGroupMenu();
    await expect.element(page.getByRole('menuitem', { name: 'New group' })).toBeVisible();
  });
});
