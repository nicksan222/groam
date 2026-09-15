import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { WorkspaceAgentRun } from '@/features/agents/hooks/use-workspace-agent-runs';
import { testIds } from '@/lib/test-ids';
import { AgentsListView } from './agents-list-view';

const state = vi.hoisted(() => ({
  isLoading: false,
  loadMore: vi.fn(),
  runs: [] as WorkspaceAgentRun[],
  status: 'Exhausted' as 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore'
}));

vi.mock('@groam/ui/ai/context/agent-context', () => ({
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

vi.mock('@tanstack/react-router', async () => {
  const { createAgentTestRouterMock } = await import('@/features/agents/agent-test-router-mock');
  return createAgentTestRouterMock(navigate);
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

afterEach(cleanup);

describe('AgentsListView', () => {
  test('shows a labeled loading state while runs load', () => {
    state.isLoading = true;
    render(<AgentsListView />);
    expect(screen.getByRole('status', { name: 'Loading agent runs…' })).toBeTruthy();
  });

  test('shows an empty state when the group has no runs', () => {
    render(<AgentsListView />);
    expect(screen.getByText('Nothing running yet')).toBeTruthy();
    expect(screen.queryByText('Latest run from each agent.')).toBeNull();
    expect(screen.queryByTestId(testIds.agentsRoster)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Background activity' })).toBeTruthy();
  });

  test('lists every run sequentially instead of one latest row per agent', () => {
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
    render(<AgentsListView />);
    expect(screen.getByRole('heading', { name: 'Background activity' })).toBeTruthy();
    expect(
      screen.getByText(
        'Work Groam is doing for your group. Continue planning in chat while it runs.'
      )
    ).toBeTruthy();
    const roster = screen.getByTestId(testIds.agentsRoster);
    expect(roster).toBeTruthy();
    expect(roster.className).not.toContain('dashboard-lift-card');
    expect(roster.className).not.toContain('rounded-2xl');
    expect(roster.className).toContain('bg-card');
    const tableContainer = roster.querySelector('[data-slot="table-container"]');
    expect(tableContainer?.getAttribute('data-variant')).toBe('list');
    expect(roster.querySelector('table')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Run' })).toBeTruthy();
    expect(screen.getByText('Agent')).toBeTruthy();
    expect(screen.getByText('Called by')).toBeTruthy();
    expect(screen.getByText('Status')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Updated' })).toBeTruthy();
    expect(screen.getAllByTestId(testIds.agentCard)).toHaveLength(4);
    expect(screen.getByRole('link', { name: /Rainy-day option/u }).getAttribute('href')).toBe(
      '/agents/issue/run-issue-new'
    );
    expect(screen.getByRole('link', { name: /Packing help/u }).getAttribute('href')).toBe(
      '/agents/groam/run-chat'
    );
    expect(screen.getAllByText(/Issue agent/u)).toHaveLength(2);
    expect(screen.getByText('Groam', { exact: true })).toBeTruthy();
    expect(screen.getByText(/Idea reviewer/u)).toBeTruthy();
    expect(screen.getByText('Packing help')).toBeTruthy();
    expect(screen.getByText('Rainy-day option')).toBeTruthy();
    expect(screen.getByText('Coast day')).toBeTruthy();
    expect(screen.getByText('Kyoto food crawl')).toBeTruthy();
    expect(screen.getAllByText('Running')).toHaveLength(2);
    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    expect(screen.getByText(/The model timed out/u)).toBeTruthy();
    const runCells = screen.getAllByTestId(testIds.agentRunFeedRunCell);
    expect(runCells).toHaveLength(4);
    for (const cell of runCells) {
      expect(cell.className).toContain('min-w-0');
      const title = cell.querySelector('a');
      expect(title?.className).toContain('truncate');
      expect(title?.className).toContain('font-semibold');
    }
    const rosterRow = screen.getAllByTestId(testIds.agentCard)[0];
    expect(rosterRow?.tagName).toBe('TR');
    expect(rosterRow?.className).toContain('cursor-pointer');
    expect(screen.queryByText('Nothing running yet')).toBeNull();
    expect(screen.queryByText('Idle')).toBeNull();
    expect(screen.queryByText('Latest run from each agent.')).toBeNull();
    expect(screen.queryByText('Latest run')).toBeNull();
    const retry = screen.getByRole('button', { name: 'Retry from zero' });
    expect(retry.textContent).toBe('');
    expect(screen.queryByText('Retry from zero')).toBeNull();
  });

  test('loads the next page of runs', () => {
    state.status = 'CanLoadMore';
    state.runs = [
      run({
        id: 'run-one' as WorkspaceAgentRun['id'],
        title: 'First page run'
      })
    ];
    render(<AgentsListView />);
    fireEvent.click(screen.getByTestId(testIds.agentsLoadMore));
    expect(state.loadMore).toHaveBeenCalledWith(25);
  });

  test('filters the loaded runs without hiding the table chrome', () => {
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
    render(<AgentsListView />);
    fireEvent.change(screen.getByTestId(testIds.agentsRunsFilter), {
      target: { value: 'packing' }
    });
    expect(screen.getByText('Packing help')).toBeTruthy();
    expect(screen.queryByText('Rainy-day option')).toBeNull();
  });
});
