import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import type { Poll } from '@/types/polls';
import { TripPollsPanel } from './trip-polls-panel';

const state = vi.hoisted(() => ({
  actions: { close: vi.fn(), create: vi.fn(), retract: vi.fn(), vote: vi.fn() },
  canLoadMore: false,
  isLoading: false,
  loadMore: vi.fn(),
  polls: [] as Poll[]
}));

vi.mock('@/features/polls/hooks/use-polls', () => ({
  usePollActions: () => state.actions,
  useTripPolls: () => ({
    canLoadMore: state.canLoadMore,
    isLoading: state.isLoading,
    loadMore: state.loadMore,
    polls: state.polls
  })
}));

const tripId = 't1' as Id<'trips'>;
const trip = (archivedAt: null | number = null) => ({ archivedAt, id: tripId }) as TripDetail;

const poll = (id: Id<'polls'>): Poll => ({
  canClose: false,
  canVote: true,
  closedAt: null,
  closesAt: null,
  createdAt: 1,
  createdBy: { kind: 'user', name: 'Ana' },
  discussionId: null,
  eligibleCount: 2,
  id,
  multiSelect: false,
  myOptionIds: [],
  question: `Question ${id}`,
  status: 'open',
  tallies: [
    { count: 0, id: 'o1', label: 'A' },
    { count: 0, id: 'o2', label: 'B' }
  ],
  tripId,
  votedCount: 0,
  voters: []
});

beforeEach(() => {
  vi.clearAllMocks();
  state.isLoading = false;
  state.polls = [];
  state.canLoadMore = false;
});

test('shows a labeled loading state', async () => {
  state.isLoading = true;
  await render(<TripPollsPanel trip={trip()} />);
  await expect.element(page.getByRole('status', { name: 'Loading polls…' })).toBeVisible();
});

test('the empty state offers a new poll that creates on the trip', async () => {
  state.actions.create.mockResolvedValue('p1');
  await render(<TripPollsPanel trip={trip()} />);
  await expect.element(page.getByText('No polls yet')).toBeVisible();
  await page.getByTestId(testIds.tripPollsCreate).click();
  await expect.element(page.getByTestId(testIds.createPollDialog)).toBeVisible();
});

test('renders a card per poll and routes votes to that poll', async () => {
  state.polls = [poll('p1' as Id<'polls'>), poll('p2' as Id<'polls'>)];
  state.actions.vote.mockResolvedValue(true);
  await render(<TripPollsPanel trip={trip()} />);
  expect(page.getByTestId(testIds.pollCard).elements()).toHaveLength(2);
  await page
    .getByRole('article', { name: 'Poll: Question p2' })
    .getByRole('radio', { name: /B/ })
    .click();
  expect(state.actions.vote).toHaveBeenCalledWith('p2', ['o2']);
  await expect.element(page.getByTestId(testIds.tripPollsCreate)).toBeVisible();
  expect(page.getByRole('button', { name: 'Show older polls' }).elements()).toHaveLength(0);
});

test('older polls load on demand', async () => {
  state.polls = [poll('p1' as Id<'polls'>)];
  state.canLoadMore = true;
  await render(<TripPollsPanel trip={trip()} />);
  await page.getByRole('button', { name: 'Show older polls' }).click();
  expect(state.loadMore).toHaveBeenCalledOnce();
});

test('an archived trip hides the create button', async () => {
  await render(<TripPollsPanel trip={trip(1)} />);
  await expect.element(page.getByText('No polls yet')).toBeVisible();
  expect(page.getByTestId(testIds.tripPollsCreate).elements()).toHaveLength(0);
});
