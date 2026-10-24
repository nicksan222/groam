import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripSidebarBlock } from './trip-sidebar-block';

const state = vi.hoisted(() => ({
  onTripRoute: true,
  params: {} as Record<string, string>
}));

vi.mock('@/features/trips/current-trip-preference', () => ({ isRememberableTrip: () => true }));
vi.mock('@/features/trips/hooks/use-current-trip', () => ({
  useCurrentTrip: () => ({
    isLoading: false,
    onTripRoute: state.onTripRoute,
    reference: 'abc123',
    trip: { archivedAt: null, id: 'trip-1' }
  })
}));
vi.mock('@/features/trips/hooks/use-trips', () => ({ useTrips: () => ({ trips: [] }) }));
vi.mock('@/lib/navigation/router', () => ({ useParams: () => state.params }));
vi.mock('./trip-switcher', () => ({ TRIP_SWITCHER_LIMIT: 5, TripSwitcher: () => null }));
vi.mock('./trip-sidebar-section-items', () => ({
  TripSidebarSectionItems: ({ active }: { active: string | null }) => (
    <li>active: {active ?? 'none'}</li>
  )
}));

beforeEach(() => {
  state.onTripRoute = true;
  state.params = {};
});

const mount = () =>
  render(
    <SidebarProvider>
      <TripSidebarBlock />
    </SidebarProvider>
  );

test('the Chats page, which is not a trip page, marks no trip section', async () => {
  state.onTripRoute = false;
  state.params = { discussionId: 'chat-1' };
  await mount();
  await expect.element(page.getByText('active: none')).toBeVisible();
});
