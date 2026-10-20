import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { WorkspaceAgentRun } from '@/features/agents/hooks/use-workspace-agent-runs';
import { testIds } from '@/lib/test-ids';
import { AgentsListView } from './agents-list-view';

const state = vi.hoisted(() => ({
  isLoading: false,
  loadMore: vi.fn(),
  runs: [] as WorkspaceAgentRun[],
  status: 'Exhausted' as 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore'
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { id: 'org-acme', name: 'Acme Labs' }
  })
}));

vi.mock('@/features/agents/hooks/use-workspace-agent-runs', () => ({
  useWorkspaceAgentRuns: () => ({
    isLoading: state.isLoading,
    loadMore: state.loadMore,
    runs: state.runs,
    status: state.status
  })
}));

vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRunControls: () => ({ retry: vi.fn() })
}));

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal, navigate);
});

function run(
  overrides: Partial<WorkspaceAgentRun> & Pick<WorkspaceAgentRun, 'id' | 'title'>
): WorkspaceAgentRun {
  return {
    agentId: 'issue',
    completedAt: null,
    createdBy: { name: 'Alex', userId: 'user-alex' },
    discussionId: null,
    error: null,
    headline: null,
    issueId: null,
    kickoff: 'assign',
    proposalId: null,
    shortId: 'runabc',
    related: {
      chatTitle: null,
      ideaTitle: null,
      issueTitle: null,
      tripName: null
    },
    report: null,
    startedAt: null,
    status: 'queued',
    surface: 'standalone',
    threadId: null,
    tripId: null,
    updatedAt: Date.now(),
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.isLoading = false;
  state.loadMore = vi.fn();
  state.runs = [];
  state.status = 'Exhausted';
});

describe('AgentsListView', () => {
  test('shows a labeled loading state while runs load', async () => {
    state.isLoading = true;
    await render(<AgentsListView />);
    await expect
      .element(page.getByRole('status', { name: 'Loading agent runs…' }))
      .toBeInTheDocument();
  });

  test('shows an empty state when the group has no runs', async () => {
    await render(<AgentsListView />);
    await expect.element(page.getByText('Nothing running yet')).toBeInTheDocument();
    await expect.element(page.getByText('Latest run from each agent.')).not.toBeInTheDocument();
    await expect.element(page.getByTestId(testIds.agentsRoster)).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('heading', { name: 'Background activity' }))
      .toBeInTheDocument();
  });

  test('lists every run sequentially instead of one latest row per agent', async () => {
    state.runs = [
      run({
        agentId: 'issue',
        headline: 'Working the issue',
        id: 'run-issue-new' as WorkspaceAgentRun['id'],
        status: 'running',
        title: 'Rainy-day option',
        updatedAt: Date.now()
      }),
      run({
        agentId: 'groam',
        discussionId: 'discussion-1' as WorkspaceAgentRun['discussionId'],
        headline: 'Responding',
        id: 'run-chat' as WorkspaceAgentRun['id'],
        kickoff: 'assign',
        status: 'running',
        surface: 'chat',
        title: 'Packing help',
        updatedAt: Date.now() - 60_000
      }),
      run({
        agentId: 'reviewer',
        error: 'The model timed out.',
        headline: 'Reviewing',
        id: 'run-review' as WorkspaceAgentRun['id'],
        issueId: 'issue-kyoto' as WorkspaceAgentRun['issueId'],
        status: 'failed',
        title: 'Kyoto food crawl',
        updatedAt: Date.now() - 5 * 60_000
      }),
      run({
        agentId: 'issue',
        id: 'run-issue-old' as WorkspaceAgentRun['id'],
        status: 'complete',
        title: 'Coast day',
        updatedAt: Date.now() - 10 * 60_000
      })
    ];
    await render(<AgentsListView />);
    await expect
      .element(page.getByRole('heading', { name: 'Background activity' }))
      .toBeInTheDocument();
    await expect
      .element(
        page.getByText(
          'Work Groam is doing for your group. Continue planning in chat while it runs.'
        )
      )
      .toBeInTheDocument();
    const roster = page.getByTestId(testIds.agentsRoster);
    await expect.element(roster.getByRole('list', { name: 'Runs' })).toBeInTheDocument();
    await expect.element(page.getByRole('table')).not.toBeInTheDocument();
    await expect.element(page.getByLabelText('Sort runs')).toBeInTheDocument();
    expect(page.getByTestId(testIds.agentCard).elements()).toHaveLength(4);
    await expect
      .element(page.getByRole('link', { name: /Rainy-day option/u }))
      .toHaveAttribute('href', '/agents/issue/run-issue-new');
    await expect
      .element(page.getByRole('link', { name: /Packing help/u }))
      .toHaveAttribute('href', '/agents/groam/run-chat');
    expect(page.getByText(/Issue agent/u).elements()).toHaveLength(2);
    await expect.element(page.getByText('Groam')).toBeInTheDocument();
    await expect.element(page.getByText(/Idea reviewer/u)).toBeInTheDocument();
    await expect.element(page.getByText('Packing help')).toBeInTheDocument();
    await expect.element(page.getByText('Rainy-day option')).toBeInTheDocument();
    await expect.element(page.getByText('Coast day')).toBeInTheDocument();
    await expect.element(page.getByText('Kyoto food crawl')).toBeInTheDocument();
    expect(page.getByText('Running').elements()).toHaveLength(2);
    await expect.element(page.getByText('Failed')).toBeInTheDocument();
    await expect.element(page.getByText('Done')).toBeInTheDocument();
    await expect.element(page.getByText(/Groam AI lost connection/u)).toBeInTheDocument();
    const runCells = page.getByTestId(testIds.agentRunFeedRunCell).elements();
    expect(runCells).toHaveLength(4);
    for (const cell of runCells) {
      expect(cell.className).toContain('min-w-0');
      const title = cell.querySelector('a');
      expect(title?.className).toContain('font-semibold');
    }
    const rosterRow = page.getByTestId(testIds.agentCard).elements()[0];
    expect(rosterRow?.tagName).toBe('ARTICLE');
    await expect.element(page.getByText('Nothing running yet')).not.toBeInTheDocument();
    await expect.element(page.getByText('Idle')).not.toBeInTheDocument();
    await expect.element(page.getByText('Latest run from each agent.')).not.toBeInTheDocument();
    await expect.element(page.getByText('Latest run')).not.toBeInTheDocument();
    const retry = page.getByRole('button', { name: 'Retry from zero' }).element();
    expect(retry.textContent).toBe('');
    await expect.element(page.getByText('Retry from zero')).not.toBeInTheDocument();
  });

  test('loads the next page of runs', async () => {
    state.status = 'CanLoadMore';
    state.runs = [
      run({
        id: 'run-one' as WorkspaceAgentRun['id'],
        title: 'First page run'
      })
    ];
    await render(<AgentsListView />);
    await page.getByTestId(testIds.agentsLoadMore).click();
    expect(state.loadMore).toHaveBeenCalledWith(25);
  });

  test('filters the loaded runs without hiding the table chrome', async () => {
    state.runs = [
      run({
        id: 'run-rain' as WorkspaceAgentRun['id'],
        title: 'Rainy-day option'
      }),
      run({
        agentId: 'groam',
        id: 'run-chat' as WorkspaceAgentRun['id'],
        surface: 'chat',
        title: 'Packing help'
      })
    ];
    await render(<AgentsListView />);
    await page.getByTestId(testIds.agentsRunsFilter).fill('packing');
    await expect.element(page.getByText('Packing help')).toBeInTheDocument();
    await expect.element(page.getByText('Rainy-day option')).not.toBeInTheDocument();
  });

  describe.each([
    ['desktop', 1280],
    ['phone', 390]
  ])('layout on a %s', (_device, width) => {
    const fits = (element: Element) => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= document.documentElement.clientWidth;
    };

    test('puts the title above its description and the empty state below, inside the page', async () => {
      await useViewport(width, 844);
      await render(<AgentsListView />);
      const title = page.getByTestId(testIds.agentsTitle);
      const description = page.getByText(/^Work Groam is doing for your group/u);
      const empty = page.getByText('Nothing running yet');
      await expect.element(empty).toBeVisible();
      const titleBox = title.element().getBoundingClientRect();
      const descriptionBox = description.element().getBoundingClientRect();
      const emptyBox = empty.element().getBoundingClientRect();
      expect(titleBox.bottom).toBeLessThanOrEqual(descriptionBox.top);
      expect(descriptionBox.bottom).toBeLessThanOrEqual(emptyBox.top);
      for (const element of [title, description, empty]) expect(fits(element.element())).toBe(true);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth
      );
    });

    test('wraps the full run title above its badges without overflowing', async () => {
      await useViewport(width, 844);
      state.runs = [
        run({
          id: 'run-long' as WorkspaceAgentRun['id'],
          title:
            'A very long run title that wraps naturally and keeps every planning detail readable. '.repeat(
              4
            )
        })
      ];
      await render(<AgentsListView />);
      await expect
        .element(page.getByRole('link', { name: /A very long run title/u }))
        .toBeInTheDocument();
      const link = page.getByRole('link', { name: /A very long run title/u }).element();
      const title = link.closest('[data-slot="record-list-title"]')!;
      const context = page
        .getByTestId(testIds.agentCard)
        .element()
        .querySelector('[data-slot="record-list-context"]')!;
      expect(link.getBoundingClientRect().height).toBeGreaterThan(
        Number.parseFloat(getComputedStyle(link).lineHeight)
      );
      expect(title.scrollHeight).toBeLessThanOrEqual(title.clientHeight);
      expect(context.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        title.getBoundingClientRect().bottom
      );
      expect(fits(page.getByTestId(testIds.agentsRoster).element())).toBe(true);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth
      );
    });
  });
});
