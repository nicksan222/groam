import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { testIds } from '@/lib/test-ids';
import { AgentDetailView } from './agent-detail-view';

const retry = vi.hoisted(() => vi.fn());

const state = vi.hoisted(() => ({
  agent: null as null | {
    activeRunCount: number;
    assignedIssueCount: number;
    description: string;
    id: 'groam' | 'issue' | 'reviewer';
    label: string;
    lastActivityAt: number | null;
    status: 'failed' | 'idle' | 'working';
    surface: 'chat' | 'standalone';
  },
  runs: [] as AgentRun[],
  status: 'Exhausted' as 'CanLoadMore' | 'Done' | 'Exhausted' | 'LoadingFirstPage' | 'LoadingMore'
}));

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: { name: 'Acme Labs' }
  })
}));

vi.mock('@/features/agents/hooks/use-agent', () => ({
  useAgent: () => ({
    agent: state.agent ?? undefined,
    loadMore: vi.fn(),
    runs: state.runs,
    status: state.status
  })
}));

vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRunControls: () => ({ retry, start: vi.fn(), stop: vi.fn() }),
  useStartQueuedAssignRuns: () => undefined
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { createAgentTestRouterMock } = await import('@/features/agents/agent-test-router-mock');
  return {
    ...(await importOriginal<typeof import('@tanstack/react-router')>()),
    ...createAgentTestRouterMock(vi.fn(), { preventDefault: true })
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  state.agent = null;
  state.runs = [];
  state.status = 'Exhausted';
});

describe('AgentDetailView', () => {
  test('puts the back link above the title hero and status badges', async () => {
    state.agent = {
      activeRunCount: 1,
      assignedIssueCount: 1,
      description: 'Works assigned issues',
      id: 'issue',
      label: 'Issue agent',
      lastActivityAt: 1,
      status: 'working',
      surface: 'standalone'
    };
    await render(<AgentDetailView agentId="issue" />);

    const back = page.getByRole('link', { name: 'All agents' });
    const title = page.getByTestId('agent-detail-title');
    await expect.element(back).toHaveAttribute('href', '/agents');
    expect(
      back.element().compareDocumentPosition(title.element()) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(title.element().textContent).toContain('Issue agent');
    await expect.element(page.getByText('Works assigned issues')).toBeInTheDocument();
    await expect.element(page.getByText('Worker')).toBeInTheDocument();
  });

  test('lists this agent’s runs as links to the run page, not a split detail pane', async () => {
    state.agent = {
      activeRunCount: 0,
      assignedIssueCount: 2,
      description: 'Works assigned issues',
      id: 'issue',
      label: 'Issue agent',
      lastActivityAt: 2,
      status: 'idle',
      surface: 'standalone'
    };
    state.runs = [
      {
        agentId: 'issue',
        completedAt: 2,
        createdBy: { name: 'Lea', userId: 'user-1' },
        discussionId: null,
        error: null,
        headline: 'Finished',
        id: 'run-rain' as AgentRun['id'],
        issueId: 'issue-rain' as AgentRun['issueId'],
        kickoff: 'assign',
        proposalId: null,
        related: {
          chatTitle: null,
          ideaTitle: null,
          issueTitle: null,
          tripName: null
        },
        report: null,
        startedAt: 1,
        status: 'complete',
        surface: 'standalone',
        threadId: null,
        title: 'Rainy-day option',
        tripId: 'trip-1' as AgentRun['tripId'],
        updatedAt: 2
      },
      {
        agentId: 'issue',
        completedAt: 1,
        createdBy: { name: 'Lea', userId: 'user-1' },
        discussionId: null,
        error: null,
        headline: 'Finished',
        id: 'run-coast' as AgentRun['id'],
        issueId: 'issue-coast' as AgentRun['issueId'],
        kickoff: 'assign',
        proposalId: null,
        related: {
          chatTitle: null,
          ideaTitle: null,
          issueTitle: null,
          tripName: null
        },
        report: null,
        startedAt: 1,
        status: 'complete',
        surface: 'standalone',
        threadId: null,
        title: 'Coast day',
        tripId: 'trip-1' as AgentRun['tripId'],
        updatedAt: 1
      }
    ];
    await render(<AgentDetailView agentId="issue" />);
    await expect.element(page.getByRole('heading', { name: 'Runs' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: /Rainy-day option/u }))
      .toHaveAttribute('href', '/agents/issue/run-rain');
    await expect
      .element(page.getByRole('link', { name: /Coast day/u }))
      .toHaveAttribute('href', '/agents/issue/run-coast');
    await expect.element(page.getByTestId(testIds.agentRunDetail)).not.toBeInTheDocument();
    await expect.element(page.getByText('Assigned issues')).not.toBeInTheDocument();
    expect(page.getByTestId(testIds.agentsRoster).element().className).not.toMatch(
      /max-h-\[50%\]/u
    );
  });
});
