import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
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

vi.mock('@groam/ai/ui/context/agent-context', () => ({
  useSetAgentContext: () => undefined
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
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

describe('IssueDetailView', () => {
  test('shows a loading state while the issue is unresolved', async () => {
    await render(<IssueDetailView issueId={issueId} />);
    await expect.element(page.getByRole('status', { name: 'Loading issue…' })).toBeInTheDocument();
  });

  test('shows a not-found state when the issue is missing', async () => {
    state.issue = null;
    await render(<IssueDetailView issueId={issueId} />);
    await expect.element(page.getByText('Issue not found')).toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'Back to issues' })).toBeInTheDocument();
  });

  test('puts the back link above a title hero and status badge', async () => {
    state.issue = loadedIssue();
    await render(<IssueDetailView issueId={issueId} />);

    const back = page.getByRole('link', { name: 'All issues' }).element();
    const title = page.getByRole('heading', { name: /Coast day/u }).element();
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect.element(page.getByText('Open')).toBeInTheDocument();
    expect(page.getByText(/opened by/u).element().textContent).toMatch(/Alex Morgan/u);
    await expect.element(page.getByRole('link', { name: 'Atlantic week' })).toBeInTheDocument();
    await expect.element(page.getByText(/Open · Atlantic week/u)).not.toBeInTheDocument();
  });

  test('renders the issue body as the opening timeline comment', async () => {
    state.issue = loadedIssue();
    await render(<IssueDetailView issueId={issueId} />);
    await expect.element(page.getByText('Add a coast day near Lisbon.')).toBeInTheDocument();
    await expect.element(page.getByText('Author')).toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Discussion' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="timeline"]')).toBeTruthy();
  });

  test('renders the issue agent banner when Groam is assigned', async () => {
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
    await render(<IssueDetailView issueId={issueId} />);
    await expect.element(page.getByTestId('issue-agent-banner')).toBeInTheDocument();
  });
});
