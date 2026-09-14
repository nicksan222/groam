import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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

vi.mock('@groam/ui/ai/context/agent-context', () => ({
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

vi.mock('@tanstack/react-router', async () => {
  const { createAgentTestRouterMock } = await import('@/features/agents/agent-test-router-mock');
  return createAgentTestRouterMock(vi.fn(), { preventDefault: true });
});

beforeEach(() => {
  vi.clearAllMocks();
  state.agent = null;
  state.runs = [];
  state.status = 'Exhausted';
});

afterEach(cleanup);

describe('AgentDetailView', () => {
  test('puts the back link above the title hero and status badges', () => {
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
    render(<AgentDetailView agentId="issue" />);

    const back = screen.getByRole('link', { name: 'All agents' });
    const title = screen.getByTestId('agent-detail-title');
    expect(back.getAttribute('href')).toBe('/agents');
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.textContent).toContain('Issue agent');
    expect(screen.getByText('Works assigned issues')).toBeTruthy();
    expect(screen.getByText('Worker')).toBeTruthy();
  });

  test('lists this agent’s runs as links to the run page, not a split detail pane', () => {
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
    render(<AgentDetailView agentId="issue" />);
    expect(screen.getByRole('heading', { name: 'Runs' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Rainy-day option/u }).getAttribute('href')).toBe(
      '/agents/issue/run-rain'
    );
    expect(screen.getByRole('link', { name: /Coast day/u }).getAttribute('href')).toBe(
      '/agents/issue/run-coast'
    );
    expect(screen.queryByTestId(testIds.agentRunDetail)).toBeNull();
    expect(screen.queryByText('Assigned issues')).toBeNull();
    expect(screen.getByTestId(testIds.agentsRoster).className).not.toMatch(/max-h-\[50%\]/u);
  });
});
