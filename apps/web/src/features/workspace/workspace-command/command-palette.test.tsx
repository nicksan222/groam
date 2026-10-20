import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { useCommandPaletteChrome } from '@/features/workspace/hooks/command-palette-chrome';
import { CommandPalette } from './command-palette';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
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

test.each(['ideas', 'issues'] as const)(
  'exact search can explicitly continue an empty filtered %s page to an older match',
  async (kind) => {
    data.ideas = [];
    data.ideaStatus = 'CanLoadMore';
    data.issueStatus = 'CanLoadMore';
    const view = await render(<CommandPalette />);
    await userEvent.keyboard('{Meta>}k{/Meta}');
    const search = page.getByRole('combobox', { name: 'Search' });
    await userEvent.type(search, 'Older accessible plan');
    await expect
      .element(page.getByText('No loaded matches for “Older accessible plan”'))
      .toBeVisible();
    const control = page.getByRole('button', { name: `Load more ${kind}` });
    await expect.element(control).toBeEnabled();
    expect(data.loadIdeas).not.toHaveBeenCalled();
    expect(data.loadIssues).not.toHaveBeenCalled();
    if (kind === 'ideas') {
      await userEvent.keyboard('{Tab}');
      await expect.element(control).toHaveFocus();
      await userEvent.keyboard('{Enter}');
    } else {
      await control.click();
    }
    const selected = kind === 'ideas' ? data.loadIdeas : data.loadIssues;
    const other = kind === 'ideas' ? data.loadIssues : data.loadIdeas;
    expect(selected).toHaveBeenCalledExactlyOnceWith(25);
    expect(other).not.toHaveBeenCalled();
    if (kind === 'ideas') {
      data.ideas = [
        {
          id: 'older-idea',
          sourceTripId: 'trip-old',
          sourceTripName: 'Old trip',
          title: 'Older accessible plan'
        }
      ];
      data.ideaStatus = 'Exhausted';
    } else {
      data.issues = [{ id: 'older-issue', tripName: 'Old trip', title: 'Older accessible plan' }];
      data.issueStatus = 'Exhausted';
    }
    await view.rerender(<CommandPalette />);
    await expect
      .element(page.getByRole('option', { name: /Older accessible plan/u }))
      .toBeVisible();
    await expect.element(control).not.toBeInTheDocument();
  }
);

test('continuation controls remain disabled while loading and disappear on exhaustion', async () => {
  data.ideaStatus = 'LoadingMore';
  data.issueStatus = 'LoadingMore';
  const view = await render(<CommandPalette />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await userEvent.type(page.getByRole('combobox', { name: 'Search' }), 'unmatched');
  for (const kind of ['ideas', 'issues'])
    await expect.element(page.getByRole('button', { name: `Load more ${kind}` })).toBeDisabled();
  expect(data.loadIdeas).not.toHaveBeenCalled();
  expect(data.loadIssues).not.toHaveBeenCalled();
  data.ideaStatus = 'Exhausted';
  data.issueStatus = 'Exhausted';
  await view.rerender(<CommandPalette />);
  for (const kind of ['ideas', 'issues'])
    await expect
      .element(page.getByRole('button', { name: `Load more ${kind}` }))
      .not.toBeInTheDocument();
  await expect.element(page.getByText('No matches for “unmatched”')).toBeVisible();
});
