import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { resetSidebarChromeStore, useSidebarChromeStore } from '@/lib/stores/sidebar-chrome-store';
import { TripsSidebarNav } from './trips-sidebar-nav';

function trip(overrides: Partial<TripListItem> = {}): TripListItem {
  return {
    archivedAt: null,
    coverUrl: null,
    dateNotes: 'Late September',
    destination: 'Lisbon',
    favorite: false,
    id: 'trips:trip-1' as TripListItem['id'],
    lastUpdatedAt: Date.UTC(2026, 7, 17),
    name: 'Atlantic week',
    nextAction: 'Continue planning together',
    outstandingActionCount: 0,
    ...overrides
  };
}

const state = vi.hoisted(() => ({
  isLoading: false,
  pathname: '/trips',
  status: 'Exhausted' as 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore',
  trips: [] as TripListItem[]
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: state.pathname }),
  useNavigate: () => vi.fn(),
  useParams: () => ({})
}));

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
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

async function renderNav() {
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
});

test('offers a new trip item when the portfolio is empty', async () => {
  await renderNav();
  await expect.element(page.getByText('New trip')).toBeInTheDocument();
  await page.getByText('New trip').click();
  await expect.element(page.getByText('Create trip dialog')).toBeInTheDocument();
});

test('lists trips and collapses them from the parent action without leaving the index link', async () => {
  state.trips = [trip({ name: 'Atlantic week' })];

  await renderNav();
  await expect.element(page.getByText('Atlantic week')).toBeInTheDocument();
  await expect.element(page.getByRole('link', { name: 'Trips' })).toHaveAttribute('href', '/trips');
  await expect.element(page.getByRole('button', { name: 'Create trip' })).not.toBeInTheDocument();

  await page.getByRole('link', { name: 'Trips' }).click();
  await expect.element(page.getByText('Atlantic week')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Collapse trips' }).click();
  await expect.element(page.getByText('Atlantic week')).not.toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Expand trips' })).toBeInTheDocument();
});
