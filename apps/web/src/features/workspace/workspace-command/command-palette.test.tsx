import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { useCommandPaletteChrome } from '@/features/workspace/hooks/command-palette-chrome';
import { CommandPalette } from './command-palette';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  useNavigate: () => navigate
}));

const idea = (id: string, title: string) => ({
  author: { name: 'Sam', userId: 'u-sam' },
  id,
  status: 'in_review',
  title,
  workingTripId: `wc-${id}`
});

const data = vi.hoisted(() => ({
  loadTrips: vi.fn(),
  onTrip: true,
  tripStatus: 'Exhausted' as 'CanLoadMore' | 'Exhausted' | 'LoadingMore',
  trips: [] as Array<{ id: string; name: string; shortId?: string }>
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({ loadMore: data.loadTrips, status: data.tripStatus, trips: data.trips })
}));

vi.mock('@/features/trips/hooks/use-current-trip', () => ({
  useCurrentTrip: () =>
    data.onTrip
      ? {
          isLoading: false,
          onTripRoute: true,
          reference: 'summer1',
          trip: { canParticipate: true, id: 'trip-coast', proposal: null, shortId: 'summer1' }
        }
      : { isLoading: false, onTripRoute: false, reference: null, trip: null }
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: (tripId?: string) => ({
    proposals: tripId ? [idea('idea-1', 'Coast day'), idea('idea-2', 'Harbor walk')] : undefined
  })
}));

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: (tripId?: string) => ({
    issues: tripId ? [{ id: 'issue-1', title: 'Which airline' }] : undefined
  })
}));

vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useDiscussions: () => ({ discussions: [] })
}));

beforeEach(() => {
  vi.clearAllMocks();
  useCommandPaletteChrome.getState().closeAndClear();
  data.onTrip = true;
  data.tripStatus = 'Exhausted';
  data.trips = [];
});

test('command palette jumps to the nested idea clone', async () => {
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await page.getByRole('option', { name: /Coast day/u }).click();
  expect(navigate).toHaveBeenCalledWith({
    params: { proposalId: 'idea-1', tripId: 'trip-coast', view: 'compare' },
    search: {},
    to: '/trips/$tripId/ideas/$proposalId/$view'
  });
});

test("command palette leads with this trip's sections, then its ideas and issues", async () => {
  data.trips = [
    { id: 'trip-coast', name: 'Summer trip', shortId: 'summer1' },
    { id: 'trip-alps', name: 'Alps', shortId: 'alps2' }
  ];
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  const options = page.getByRole('option');
  await expect.element(options.first()).toHaveTextContent('Plan');
  await expect.element(page.getByRole('group', { name: 'Go to' })).toBeVisible();
  const labels = ['Go to', 'Ideas', 'Issues', 'Switch to'];
  for (const label of labels) {
    await expect.element(page.getByRole('group', { name: label })).toBeVisible();
  }
  await expect.element(page.getByRole('option', { name: /Which airline/u })).toBeVisible();
  await expect.element(page.getByRole('option', { name: /Alps/u })).toBeVisible();
  await expect.element(page.getByRole('option', { name: /Summer trip/u })).not.toBeInTheDocument();
});

test('command palette ranks the Issues section first for "iss" and opens it', async () => {
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await userEvent.type(page.getByRole('combobox', { name: 'Search' }), 'iss');
  await expect.element(page.getByRole('option').first()).toHaveTextContent('Issues');
  await userEvent.keyboard('{Enter}');
  expect(navigate).toHaveBeenCalledWith({
    params: { section: 'issues', tripId: 'summer1' },
    to: '/trips/$tripId/$section'
  });
});

test('command palette moves through results with the keyboard and opens with Enter', async () => {
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  const search = page.getByRole('combobox', { name: 'Search' });
  await expect
    .element(page.getByRole('option', { name: /Plan/u }))
    .toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{ArrowDown}');
  await expect
    .element(page.getByRole('option', { name: /Calendar/u }))
    .toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{Enter}');
  expect(navigate).toHaveBeenCalledWith({
    params: { section: 'calendar', tripId: 'summer1' },
    to: '/trips/$tripId/$section'
  });
  await expect.element(search).not.toBeInTheDocument();
});

test('command palette lists every section while browsing', async () => {
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  const goTo = page.getByRole('group', { name: 'Go to' });
  for (const label of ['Plan', 'Calendar', 'Polls', 'Packing', 'Research', 'Activity', 'People']) {
    await expect.element(goTo.getByRole('option', { name: label })).toBeInTheDocument();
  }
});

test('Load more sits at the end of the trip list, and only when that list shows', async () => {
  data.tripStatus = 'CanLoadMore';
  data.trips = [{ id: 'trip-alps', name: 'Alps', shortId: 'alps2' }];
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  const loadMore = page.getByRole('group', { name: 'Switch to' }).getByRole('button', {
    name: 'Load more'
  });
  await expect.element(loadMore).toBeVisible();

  await userEvent.type(page.getByRole('combobox', { name: 'Search' }), 'iss');
  await expect.element(page.getByRole('option').first()).toHaveTextContent('Issues');
  await expect.element(page.getByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
});

test('command palette offers no sections or trip content off a trip', async () => {
  data.onTrip = false;
  data.trips = [{ id: 'trip-alps', name: 'Alps', shortId: 'alps2' }];
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await expect.element(page.getByRole('group', { name: 'Trips' })).toBeVisible();
  await expect.element(page.getByRole('group', { name: 'Go to' })).not.toBeInTheDocument();
  await expect.element(page.getByRole('option', { name: /Coast day/u })).not.toBeInTheDocument();
});

test('command palette explains when nothing matches', async () => {
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await userEvent.type(page.getByRole('combobox', { name: 'Search' }), 'zzz');
  await expect.element(page.getByText('No matches for “zzz”')).toBeInTheDocument();
  await expect.element(page.getByText('0 results')).toBeInTheDocument();
});

test('search can load more results to reach an older match', async () => {
  data.tripStatus = 'CanLoadMore';
  const view = await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  const search = page.getByRole('combobox', { name: 'Search' });
  await userEvent.type(search, 'Old Lisbon');
  await expect.element(page.getByText('No loaded matches for “Old Lisbon”')).toBeVisible();
  await expect.element(page.getByText('Load more to search older results.')).toBeVisible();

  const loadMore = page.getByRole('button', { name: 'Load more' });
  await userEvent.keyboard('{Tab}');
  await expect.element(loadMore).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(data.loadTrips).toHaveBeenCalledExactlyOnceWith(25);

  data.tripStatus = 'LoadingMore';
  await view.rerender(<CommandPalette />);
  await expect.element(loadMore).toHaveAttribute('aria-disabled', 'true');
  await userEvent.keyboard('{Enter}');
  expect(data.loadTrips).toHaveBeenCalledOnce();
  await expect.element(loadMore).toHaveFocus();

  data.tripStatus = 'Exhausted';
  data.trips = [{ id: 'trip-old', name: 'Old Lisbon' }];
  await view.rerender(<CommandPalette />);
  await expect.element(page.getByRole('option', { name: /Old Lisbon/u })).toBeVisible();
  await expect.element(loadMore).not.toBeInTheDocument();
  await expect.element(search).toHaveFocus();
});
