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

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({ trips: [] })
}));

const data = vi.hoisted(() => ({
  ideas: [] as Array<{ id: string; sourceTripId: string; sourceTripName: string; title: string }>,
  issues: [] as Array<{ id: string; tripName: string; title: string }>,
  ideaStatus: 'Exhausted' as 'CanLoadMore' | 'Exhausted' | 'LoadingMore',
  issueStatus: 'Exhausted' as 'CanLoadMore' | 'Exhausted' | 'LoadingMore',
  loadIdeas: vi.fn(),
  loadIssues: vi.fn()
}));

vi.mock('@/features/ideas/hooks/use-workspace-ideas', () => ({
  useWorkspaceIdeas: () => ({
    proposals: data.ideas,
    status: data.ideaStatus,
    loadMore: data.loadIdeas
  })
}));

vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({
  useWorkspaceIssues: () => ({
    issues: data.issues,
    status: data.issueStatus,
    loadMore: data.loadIssues
  })
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
  data.ideas = [
    { id: 'idea-1', sourceTripId: 'trip-coast', sourceTripName: 'Summer trip', title: 'Coast day' }
  ];
  data.issues = [];
  data.ideaStatus = 'Exhausted';
  data.issueStatus = 'Exhausted';
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

test('search can load more ideas and issues to reach an older match', async () => {
  data.ideas = [];
  data.ideaStatus = 'CanLoadMore';
  data.issueStatus = 'CanLoadMore';
  const view = await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await userEvent.type(page.getByRole('combobox', { name: 'Search' }), 'Older plan');
  await expect.element(page.getByText('No loaded matches for “Older plan”')).toBeVisible();

  await page.getByRole('button', { name: 'Load more' }).click();
  expect(data.loadIdeas).toHaveBeenCalledExactlyOnceWith(25);
  expect(data.loadIssues).toHaveBeenCalledExactlyOnceWith(25);

  data.ideaStatus = 'LoadingMore';
  data.issueStatus = 'Exhausted';
  await view.rerender(<CommandPalette />);
  await expect.element(page.getByRole('button', { name: 'Load more' })).toBeDisabled();

  data.issues = [{ id: 'older-issue', tripName: 'Old trip', title: 'Older plan' }];
  data.ideaStatus = 'Exhausted';
  await view.rerender(<CommandPalette />);
  await expect.element(page.getByRole('option', { name: /Older plan/u })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
});
