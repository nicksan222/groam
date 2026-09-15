import type { Id } from '@groam/backend/data-model';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { IssueDetailView } from './issue-detail-view';

const state = vi.hoisted(() => ({
  issue: undefined as
    | {
        author: { name: string; userId: string };
        body: string;
        canManage: boolean;
        comments: Array<{
          author: { name: string; userId: string };
          content: string;
          createdAt: number;
          id: string;
          kind: 'comment' | 'system';
          updatedAt: number;
        }>;
        dueAt: number | null;
        id: Id<'tripIssues'>;
        idea: null;
        status: 'closed' | 'open';
        title: string;
        tripId: Id<'trips'>;
        tripName: string;
        updatedAt: number;
        assignee: { agentId: string; kind: 'agent' } | null;
      }
    | null
    | undefined,
  run: null as null | {
    error: string | null;
    headline: string | null;
    id: Id<'agentRuns'>;
    issueId: Id<'tripIssues'>;
    status: 'failed' | 'queued' | 'running';
  }
}));

vi.mock('@groam/ui/ai/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn()
}));

vi.mock('@/features/agents/hooks/use-agent-run', () => ({
  useAgentRunControls: () => ({ retry: vi.fn(), start: vi.fn(), stop: vi.fn() }),
  useAgentRunEvents: () => ({ events: [], loadMore: vi.fn(), status: 'Exhausted' }),
  useIssueAgentRun: () => state.run,
  useStartQueuedAssignRuns: () => undefined
}));

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssue: () => ({
    addComment: vi.fn(),
    assignIssueAgent: vi.fn(),
    assignUser: vi.fn(),
    implement: vi.fn(),
    issue: state.issue,
    setDueAt: vi.fn(),
    setStatus: vi.fn(),
    unassign: vi.fn()
  })
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { name: 'Lea Demo' } } }),
  useWorkspace: () => ({
    activeOrganization: { members: [] }
  })
}));

const issueId = 'issue-1' as Id<'tripIssues'>;

function loadedIssue() {
  return {
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    body: 'Add a coast day near Lisbon.',
    canManage: true,
    comments: [],
    dueAt: null,
    id: issueId,
    idea: null,
    status: 'open' as const,
    title: 'Coast day',
    tripId: 'trip-1' as Id<'trips'>,
    tripName: 'Atlantic week',
    updatedAt: Date.UTC(2026, 7, 17)
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.issue = undefined;
  state.run = null;
});

afterEach(cleanup);

describe('IssueDetailView', () => {
  test('shows a loading state while the issue is unresolved', () => {
    render(<IssueDetailView issueId={issueId} />);
    expect(screen.getByRole('status', { name: 'Loading issue…' })).toBeTruthy();
  });

  test('shows a not-found state when the issue is missing', () => {
    state.issue = null;
    render(<IssueDetailView issueId={issueId} />);
    expect(screen.getByText('Issue not found')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to issues' })).toBeTruthy();
  });

  test('puts the back link above a title hero and status badge', () => {
    state.issue = loadedIssue();
    render(<IssueDetailView issueId={issueId} />);

    const back = screen.getByRole('link', { name: 'All issues' });
    const title = screen.getByRole('heading', { name: /Coast day/u });
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.getByText(/opened by/u).textContent).toMatch(/Alex Morgan/u);
    expect(screen.getByRole('link', { name: 'Atlantic week' })).toBeTruthy();
    expect(screen.queryByText(/Open · Atlantic week/u)).toBeNull();
  });

  test('renders the issue body as the opening timeline comment', () => {
    state.issue = loadedIssue();
    render(<IssueDetailView issueId={issueId} />);
    expect(screen.getByText('Add a coast day near Lisbon.')).toBeTruthy();
    expect(screen.getByText('Author')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Discussion' })).toBeNull();
    expect(document.querySelector('[data-slot="timeline"]')).toBeTruthy();
  });

  test('renders the issue agent banner when Groam is assigned', () => {
    state.issue = {
      ...loadedIssue(),
      assignee: { agentId: 'issue', kind: 'agent' }
    };
    state.run = {
      error: null,
      headline: 'Started working',
      id: 'run-1' as Id<'agentRuns'>,
      issueId,
      status: 'running'
    };
    render(<IssueDetailView issueId={issueId} />);
    expect(screen.getByTestId('issue-agent-banner')).toBeTruthy();
  });
});
