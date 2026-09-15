import { SidebarProvider } from '@groam/ui/components/sidebar';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { resetSidebarChromeStore, useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { stubMatchMedia } from '@/testing/stub-match-media';
import { tripListItem } from './test-fixtures';
import { TripsSidebarNav } from './trips-sidebar-nav';

const state = vi.hoisted(() => ({
  isLoading: false,
  pathname: '/trips',
  status: 'Exhausted' as 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore',
  trips: [] as ReturnType<typeof tripListItem>[]
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: state.pathname }),
  useNavigate: () => vi.fn(),
  useParams: () => ({})
}));

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn()
}));

vi.mock('@/features/trips/trip-create/create-trip-dialog', () => ({
  CreateTripDialog: () => <div>Create trip dialog</div>
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({
    createTrip: vi.fn(),
    isLoading: state.isLoading,
    loadMore: vi.fn(),
    status: state.status,
    trips: state.trips
  })
}));

function renderNav() {
  return render(
    <SidebarProvider>
      <ul>
        <TripsSidebarNav />
      </ul>
    </SidebarProvider>
  );
}

beforeEach(() => {
  resetSidebarChromeStore();
  useSidebarChromeStore.getState().setSectionOpen('trips', true);
  vi.clearAllMocks();
  state.isLoading = false;
  state.pathname = '/trips';
  state.status = 'Exhausted';
  state.trips = [];
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('offers a new trip item when the portfolio is empty', () => {
  renderNav();
  expect(screen.getByText('New trip')).toBeTruthy();
  fireEvent.click(screen.getByText('New trip'));
  expect(screen.getByText('Create trip dialog')).toBeTruthy();
});

test('lists trips and collapses them from the parent action without leaving the index link', () => {
  state.trips = [tripListItem({ name: 'Atlantic week' })];

  renderNav();
  expect(screen.getByText('Atlantic week')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Trips' }).getAttribute('href')).toBe('/trips');
  expect(screen.queryByRole('button', { name: 'Create trip' })).toBeNull();

  fireEvent.click(screen.getByRole('link', { name: 'Trips' }));
  expect(screen.getByText('Atlantic week')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Collapse trips' }));
  expect(screen.queryByText('Atlantic week')).toBeNull();
  expect(screen.getByRole('button', { name: 'Expand trips' })).toBeTruthy();
});
