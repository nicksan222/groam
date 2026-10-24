import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { testIds } from '@/lib/test-ids';
import { TripSwitcher } from './trip-switcher';

const navigate = vi.hoisted(() => vi.fn());
const actions = vi.hoisted(() => ({ toggleFavorite: vi.fn() }));

vi.mock('@/lib/navigation/router', () => ({ useNavigate: () => navigate }));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { id: 'org-acme', logo: null, name: 'Acme Labs' },
    activeRole: 'owner',
    organizations: [{ id: 'org-acme', logo: null, name: 'Acme Labs' }],
    switchOrganization: vi.fn()
  })
}));
vi.mock('@/features/trips/hooks/use-trip-sidebar-actions', () => ({
  useTripSidebarActions: () => ({ ...actions, pendingTripId: null })
}));

function listItem(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    archivedAt: null,
    canParticipate: true,
    coverUrl: null,
    dateNotes: null,
    destination: null,
    favorite: false,
    id: 'trips:1' as TripListItem['id'],
    lastUpdatedAt: 100,
    name: 'Atlantic week',
    nextAction: '',
    outstandingActionCount: 0,
    shortId: 'atl123',
    ...overrides
  };
}

const trips = [
  listItem({
    favorite: true,
    id: 'trips:2' as TripListItem['id'],
    name: 'Alps',
    shortId: 'alp456'
  }),
  listItem(),
  listItem({ id: 'trips:3' as TripListItem['id'], name: 'Recent', shortId: 'rec789' })
];

const current = {
  canParticipate: true,
  coverUrl: null,
  dateNotes: 'Late September',
  destination: { name: 'Lisbon', status: 'known' },
  favorite: false,
  id: 'trips:1',
  name: 'Atlantic week',
  proposal: null,
  shortId: 'atl123'
} as never;

function mount(props: Partial<Parameters<typeof TripSwitcher>[0]> = {}) {
  return render(
    <SidebarProvider>
      <ul>
        <TripSwitcher
          isLoading={false}
          reference="atl123"
          section="packing"
          trip={current}
          trips={trips}
          {...props}
        />
      </ul>
    </SidebarProvider>
  );
}

const trigger = () => page.getByTestId(testIds.tripSwitcher);
const text = () => trigger().element().textContent;

beforeEach(() => {
  vi.clearAllMocks();
  useWorkspaceDialogs.getState().closeDialog();
});

describe('TripSwitcher', () => {
  test('names the active group and role on the trigger, and keeps the trip name', async () => {
    await mount();
    await expect.poll(text).toContain('Acme Labs · Owner');
    await expect.element(trigger()).toHaveAccessibleName(/Acme Labs/u);
  });

  test('shows the current trip name with its dates, not its place', async () => {
    await mount();
    await expect.poll(text).toContain('Atlantic week');
    await expect.poll(text).toContain('Late September');
    expect(text()).not.toContain('Lisbon');
  });

  test('lists favourites and recent trips under their own labels, at most eight', async () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      listItem({ id: `trips:m${index}` as TripListItem['id'], name: `Trip ${index}` })
    );
    await mount({ trips: [trips[0]!, ...many] });
    await trigger().click();
    await expect.element(page.getByText('Favourites')).toBeVisible();
    await expect.element(page.getByText('Recent', { exact: true })).toBeVisible();
    const names = page
      .getByTestId(testIds.tripSwitcherItem)
      .elements()
      .map((element) => element.getAttribute('data-trip-name'));
    expect(names).toHaveLength(8);
    expect(names[0]).toBe('Alps');
  });

  test('gives every item its full name as a title', async () => {
    await mount();
    await trigger().click();
    await expect
      .element(page.getByRole('menuitem', { name: /Alps/ }))
      .toHaveAttribute('title', 'Alps');
  });

  test('opens another trip in the section the traveler is on', async () => {
    await mount();
    await trigger().click();
    await page.getByRole('menuitem', { name: /Alps/ }).click();
    expect(navigate).toHaveBeenCalledWith({
      params: { section: 'packing', tripId: 'alp456' },
      to: '/trips/$tripId/$section'
    });
  });

  test('opens the plan when no section is on screen', async () => {
    await mount({ section: null });
    await trigger().click();
    await page.getByRole('menuitem', { name: /Alps/ }).click();
    expect(navigate).toHaveBeenCalledWith({
      params: { section: 'plan', tripId: 'alp456' },
      to: '/trips/$tripId/$section'
    });
  });

  test('All trips opens the trip list and New trip opens the create dialog', async () => {
    await mount();
    await trigger().click();
    await page.getByTestId(testIds.navTrips).click();
    expect(navigate).toHaveBeenCalledWith({ to: '/trips' });
    await trigger().click();
    await page.getByTestId(testIds.tripSwitcherNew).click();
    expect(useWorkspaceDialogs.getState().dialog).toBe('create-trip');
  });

  test('without a current trip it invites a choice and still offers All trips and New trip', async () => {
    await mount({ reference: null, section: null, trip: null, trips: [] });
    await expect.poll(text).toContain('Choose a trip');
    await expect.poll(text).toContain('Pick a trip to see its sections');
    await trigger().click();
    await expect.element(page.getByTestId(testIds.navTrips)).toBeVisible();
    await expect.element(page.getByTestId(testIds.tripSwitcherNew)).toBeVisible();
    await expect.element(page.getByRole('menuitem', { name: 'Copy link' })).not.toBeInTheDocument();
  });

  test('ends with a Group submenu, with or without a trip, and marks the group on its trigger', async () => {
    await mount({ reference: null, section: null, trip: null, trips: [] });
    await expect.element(trigger()).toHaveAttribute('data-group-name', 'Acme Labs');
    await trigger().click();
    const group = () => page.getByTestId(testIds.groupSwitcher).element().textContent;
    await expect.poll(group).toContain('Acme Labs');
    await expect.poll(group).toContain('Group · Owner');
  });

  test('favourites the current trip', async () => {
    await mount();
    await trigger().click();
    await page.getByRole('menuitem', { name: 'Favourite' }).click();
    expect(actions.toggleFavorite).toHaveBeenCalledWith('trips:1', false);
  });

  test('offers Unfavourite for a favourite trip', async () => {
    await mount({ trips: [{ ...trips[1]!, favorite: true, id: 'trips:1' as TripListItem['id'] }] });
    await trigger().click();
    await expect.element(page.getByRole('menuitem', { name: 'Unfavourite' })).toBeVisible();
  });

  test('hides Favourite when the current trip is not in the list', async () => {
    await mount({ trips: [] });
    await trigger().click();
    await expect.element(page.getByRole('menuitem', { name: 'Copy link' })).toBeVisible();
    await expect.element(page.getByRole('menuitem', { name: 'Favourite' })).not.toBeInTheDocument();
  });

  test('copies a link to the trip plan', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
    await mount();
    await trigger().click();
    await page.getByRole('menuitem', { name: 'Copy link' }).click();
    await vi.waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/trips/atl123/plan`)
    );
  });
});
