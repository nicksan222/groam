import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { issueDetailData as issueDetail } from '@/features/issues/issue-fixtures';
import { testIds } from '@/lib/test-ids';
import type { IssueDetailData } from './issue-detail-data';
import { IssueDetailView } from './issue-detail-view';

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

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Link: ({
    children,
    params,
    to
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    to: string;
  }) => <a href={to.replace(/\$(\w+)/gu, (_, key: string) => params?.[key] ?? '')}>{children}</a>,
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

vi.mock('@/features/trips/hooks/use-trip-record', () => ({
  useTripRecord: (tripId: string | undefined) =>
    tripId ? { canParticipate: true, proposal: null, shortId: 'atl123' } : undefined
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { name: 'Lea Demo' } } }),
  useWorkspace: () => ({
    activeOrganization: { id: 'org-a', members: [] },
    session: { user: { id: 'user-lea', name: 'Lea Demo' } }
  })
}));

const { id: issueId } = issueDetail();

beforeEach(() => {
  vi.clearAllMocks();
  state.issue = undefined;
  state.run = null;
  window.localStorage.clear();
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
    await expect.element(page.getByRole('link', { name: 'Back to Home' })).toBeInTheDocument();
  });

  test('puts the section link before the title, with the status select and facts under it', async () => {
    state.issue = issueDetail();
    await render(<IssueDetailView issueId={issueId} />);

    const back = page.getByRole('link', { name: 'Issues' }).last().element();
    const title = page.getByRole('heading', { name: /Coast day/u }).element();
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect
      .element(page.getByRole('combobox', { name: 'Issue status' }))
      .toHaveTextContent('To decide');
    // Who opened it is the timeline's first entry, not a fact in the header.
    await expect.element(page.getByText(/opened by/iu)).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: 'Issues' }).last())
      .toHaveAttribute('href', expect.stringMatching(/^\/trips\/.+\/issues$/u));
    await expect.element(page.getByRole('link', { name: 'Atlantic week' })).not.toBeInTheDocument();
    await expect.element(page.getByText(/Open · Atlantic week/u)).not.toBeInTheDocument();
  });

  test("remembers the issue's trip, since its URL names none", async () => {
    state.issue = issueDetail();
    await render(<IssueDetailView issueId={issueId} />);
    expect(window.localStorage.getItem('groam:current-trip:user-lea:org-a')).toBe('atl123');
  });

  test('renders the issue body as the opening timeline comment', async () => {
    state.issue = issueDetail();
    await render(<IssueDetailView issueId={issueId} />);
    await expect.element(page.getByText('Add a coast day near Lisbon.')).toBeInTheDocument();
    await expect.element(page.getByText(/opened this issue/u)).toBeInTheDocument();
    await expect.element(page.getByText('Author')).not.toBeInTheDocument();
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
