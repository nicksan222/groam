import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { dashboardPoll } from '@/features/dashboard/testing/dashboard-activity-fixtures';
import { testIds } from '@/lib/test-ids';
import { OpenPollsSection } from './open-polls-section';

const state = vi.hoisted(() => ({
  isLoading: false,
  canLoadMore: false,
  isLoadingMore: false,
  loadMore: vi.fn(),
  polls: [] as unknown[]
}));
vi.mock('@/features/dashboard/hooks/use-dashboard-polls', () => ({
  useDashboardPolls: () => state
}));
vi.mock('@tanstack/react-router', async () => {
  const { mockRouterTargets } = await import('@/lib/testing/router-mock');
  return mockRouterTargets();
});

beforeEach(() => {
  state.isLoading = false;
  state.canLoadMore = false;
  state.isLoadingMore = false;
  state.loadMore.mockClear();
  state.polls = [];
});

describe('OpenPollsSection', () => {
  test('is hidden when empty or loading', async () => {
    await render(<OpenPollsSection />);
    await expect.element(page.getByTestId(testIds.dashboardOpenPolls)).not.toBeInTheDocument();
    state.isLoading = true;
    state.polls = [dashboardPoll()];
    await render(<OpenPollsSection />);
    await expect.element(page.getByTestId(testIds.dashboardOpenPolls)).not.toBeInTheDocument();
  });

  test('links a trip poll to the trip polls tab with trip and closing time', async () => {
    state.polls = [dashboardPoll({ closesAt: Date.now() + 3 * 3_600_000 })];
    await render(<OpenPollsSection />);
    const row = page.getByTestId(testIds.dashboardOpenPollsRow);
    await expect.element(row).toHaveAttribute('href', '/trips/trip-1/polls');
    await expect.element(row.getByText('Which beach day?')).toBeVisible();
    await expect
      .element(row.getByText(/Atlantic week · closes in 3 hours · 2 voted/u))
      .toBeVisible();
  });

  test('links a chat poll to its chat', async () => {
    state.polls = [
      dashboardPoll({ discussionId: 'chat-1' as never, tripId: null, tripName: null })
    ];
    await render(<OpenPollsSection />);
    await expect
      .element(page.getByTestId(testIds.dashboardOpenPollsRow))
      .toHaveAttribute('href', '/chat/chat-1');
  });

  test('renders a group poll as a row without a link', async () => {
    state.polls = [dashboardPoll({ tripId: null, tripName: null })];
    await render(<OpenPollsSection />);
    const row = page.getByTestId(testIds.dashboardOpenPollsRow);
    await expect.element(row.getByText(/Group · 2 voted/u)).toBeVisible();
    await expect.element(row).not.toHaveAttribute('href');
  });
});

test('an empty filtered page offers Load more and then shows accessible polls', async () => {
  state.canLoadMore = true;
  const screen = await render(<OpenPollsSection />);
  await page.getByRole('button', { name: 'Load more polls' }).click();
  expect(state.loadMore).toHaveBeenCalledOnce();
  state.polls = [dashboardPoll()];
  state.canLoadMore = false;
  await screen.rerender(<OpenPollsSection />);
  await expect.element(page.getByTestId(testIds.dashboardOpenPollsRow)).toBeVisible();
});
