import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { IssueListItem, WorkspaceIssue } from '@/types/issues';
import type { IssueDetailData } from './issue-detail-data';
import { IssueDetailView } from './issue-detail-view';

const listItem = {
  assignee: null,
  author: { name: 'Alex Morgan', userId: 'user-alex' },
  canAssign: true,
  canManage: true,
  condition: null,
  dueAt: null,
  id: 'issue-1' as Id<'tripIssues'>,
  idea: null,
  labels: [],
  rank: 0,
  shortId: 'isuabc',
  status: 'open',
  title: 'Coast day',
  updatedAt: Date.UTC(2026, 7, 17)
} satisfies Omit<IssueListItem, 'tripName'>;

const workspaceIssue = (over: Partial<WorkspaceIssue> = {}): WorkspaceIssue => ({
  ...listItem,
  body: 'Add a coast day near Lisbon.',
  closedAt: null,
  tripId: 'trip-1' as Id<'trips'>,
  tripName: 'Atlantic week',
  ...over
});

const issueDetail = (over: Partial<IssueDetailData> = {}): IssueDetailData => ({
  ...workspaceIssue(),
  canComment: true,
  comments: [],
  ...over
});

const mutations = vi.hoisted(() => ({ assign: vi.fn(), setStatus: vi.fn() }));

const state = vi.hoisted(() => ({
  issue: undefined as IssueDetailData | null | undefined,
  run: null as null | {
    error: string | null;
    headline: string | null;
    id: Id<'agentRuns'>;
    issueId: Id<'tripIssues'>;
    status: 'failed' | 'queued' | 'running';
  }
}));

vi.mock('@/features/research/research-links/linked-researches', () => ({
  LinkedResearches: () => null
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

vi.mock('@/features/agents/hooks/use-agent-waits', () => ({
  useCancelWait: () => vi.fn(),
  useRunWait: () => undefined
}));

vi.mock('@/features/issues/hooks/use-issue-mutations', () => ({
  useIssueMutations: () => ({ assign: mutations.assign, setStatus: mutations.setStatus })
}));

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssue: () => ({
    addComment: vi.fn(),
    implement: vi.fn(),
    issue: state.issue,
    setDueAt: vi.fn()
  })
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { name: 'Lea Demo' } } }),
  useWorkspace: () => ({
    activeOrganization: { members: [] }
  })
}));

const { id: issueId } = issueDetail();

beforeEach(() => {
  vi.clearAllMocks();
  state.issue = undefined;
  state.run = null;
  mutations.assign.mockResolvedValue(true);
  mutations.setStatus.mockResolvedValue(true);
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
    state.issue = issueDetail();
    await render(<IssueDetailView issueId={issueId} />);

    const back = page.getByRole('link', { name: 'All issues' }).element();
    const title = page.getByRole('heading', { name: /Coast day/u }).element();
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect
      .element(page.getByRole('combobox', { name: 'Issue status' }))
      .toHaveTextContent('To decide');
    expect(page.getByText(/opened by/u).element().textContent).toMatch(/Alex Morgan/u);
    await expect.element(page.getByRole('link', { name: 'Atlantic week' })).toBeInTheDocument();
    await expect.element(page.getByText(/Open · Atlantic week/u)).not.toBeInTheDocument();
  });

  test('renders the issue body as the opening timeline comment', async () => {
    state.issue = issueDetail();
    await render(<IssueDetailView issueId={issueId} />);
    await expect.element(page.getByText('Add a coast day near Lisbon.')).toBeInTheDocument();
    await expect.element(page.getByText('Author')).toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Discussion' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="timeline"]')).toBeTruthy();
  });

  test('renders the issue agent banner when Groam is assigned', async () => {
    state.issue = issueDetail({
      assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' }
    });
    state.run = {
      error: null,
      headline: 'Started working',
      id: 'run-1' as Id<'agentRuns'>,
      issueId,
      status: 'running'
    };
    await render(<IssueDetailView issueId={issueId} />);
    await expect.element(page.getByTestId(testIds.issueAgentBanner)).toBeInTheDocument();
  });

  test('changes the status through the select', async () => {
    state.issue = issueDetail();
    await render(<IssueDetailView issueId={issueId} />);

    await page.getByRole('combobox', { name: 'Issue status' }).click();
    await page.getByRole('option', { name: "Won't do" }).click();
    expect(mutations.setStatus).toHaveBeenCalledWith(issueId, 'wont_do');
  });

  test('shows a read-only status badge when the viewer cannot manage the issue', async () => {
    state.issue = issueDetail({ canAssign: false, canManage: false, status: 'in_progress' });
    await render(<IssueDetailView issueId={issueId} />);

    await expect.element(page.getByTestId(testIds.issueStatus)).toHaveTextContent('In progress');
    await expect
      .element(page.getByRole('combobox', { name: 'Issue status' }))
      .not.toBeInTheDocument();
  });
});
