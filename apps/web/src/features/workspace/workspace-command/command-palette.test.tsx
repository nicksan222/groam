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

const data = vi.hoisted(() => ({
  loadTrips: vi.fn(),
  tripStatus: 'Exhausted' as 'CanLoadMore' | 'Exhausted' | 'LoadingMore',
  trips: [] as Array<{ id: string; name: string }>
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({ loadMore: data.loadTrips, status: data.tripStatus, trips: data.trips })
}));

vi.mock('@/features/ideas/hooks/use-workspace-ideas', () => ({
  useWorkspaceIdeas: () => ({
    proposals: [
      {
        id: 'idea-1',
        sourceTripId: 'trip-coast',
        sourceTripName: 'Summer trip',
        title: 'Coast day'
      }
    ]
  })
}));

vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({
  useWorkspaceIssues: () => ({ issues: [] })
}));

vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useDiscussions: () => ({ discussions: [] })
}));

vi.mock('@/features/agents/hooks/use-agent-roster', () => ({
  useAgentRoster: () => ({ agents: [] })
}));

beforeEach(() => {
  vi.clearAllMocks();
  useCommandPaletteChrome.getState().closeAndClear();
  data.tripStatus = 'Exhausted';
  data.trips = [];
});

test('command palette jumps to the nested idea clone', async () => {
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await page.getByRole('option', { name: /Coast day/u }).click();
  expect(navigate).toHaveBeenCalledWith({
    params: { proposalId: 'idea-1', tripId: 'trip-coast', view: 'overview' },
    search: {},
    to: '/trips/$tripId/ideas/$proposalId/$view'
  });
});

test('command palette moves through results with the keyboard and opens with Enter', async () => {
  await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  const search = page.getByRole('combobox', { name: 'Search' });
  await expect
    .element(page.getByRole('option', { name: /Coast day/u }))
    .toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{ArrowDown}');
  await expect
    .element(page.getByRole('option', { name: /All agents/u }))
    .toHaveAttribute('aria-selected', 'true');
  await userEvent.keyboard('{ArrowDown}{Enter}');
  expect(navigate).toHaveBeenCalledWith(
    expect.objectContaining({ to: '/trips/$tripId/ideas/$proposalId/$view' })
  );
  await expect.element(search).not.toBeInTheDocument();
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
