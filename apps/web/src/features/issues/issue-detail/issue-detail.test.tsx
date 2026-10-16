import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  WorkspaceContext,
  type WorkspaceContextValue
} from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition, IssueListItem, WorkspaceIssue } from '@/types/issues';
import { IssueDetail } from './issue-detail';
import type { IssueDetailData } from './issue-detail-data';

const autoCondition = (
  met = false,
  refusal = met ? 'Settled by the trip.' : 'Closes once the trip has a destination.'
) =>
  ({
    check: 'destination',
    kind: 'auto',
    label: 'The trip has a destination',
    met,
    refusal
  }) satisfies IssueCondition;

const manualCondition = (label = 'Flights confirmed') =>
  ({ kind: 'manual', label, met: null }) satisfies IssueCondition;

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
  comments: [],
  ...over
});

/** A timeline entry; `kind: 'system'` makes it an assignment or status event. */
const issueComment = (
  id: string,
  over: Partial<IssueDetailData['comments'][number]> = {}
): IssueDetailData['comments'][number] => ({
  author: { name: 'Jordan Lee', userId: 'user-jordan' },
  content: 'Keep the afternoon free for the coast.',
  createdAt: Date.UTC(2026, 7, 18),
  id: id as Id<'tripIssueComments'>,
  kind: 'comment',
  updatedAt: Date.UTC(2026, 7, 18),
  ...over
});

const { id: issueId } = issueDetail();

const actions = vi.hoisted(() => ({
  addComment: vi.fn(),
  assign: vi.fn(),
  implement: vi.fn(),
  setDueAt: vi.fn()
}));

const state = vi.hoisted(() => ({ issue: null as IssueDetailData | null }));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn()
}));

vi.mock('@/features/issues/hooks/use-issue-mutations', () => ({
  useIssueMutations: () => ({ assign: actions.assign, setStatus: vi.fn() })
}));

const detail = () =>
  ({
    addComment: actions.addComment,
    implement: actions.implement,
    issue: state.issue,
    setDueAt: actions.setDueAt
  }) as unknown as ComponentProps<typeof IssueDetail>;

beforeEach(() => {
  vi.clearAllMocks();
  actions.addComment.mockResolvedValue(true);
  actions.assign.mockResolvedValue(true);
  actions.implement.mockResolvedValue(null);
  state.issue = issueDetail();
});

async function renderIssue(ui: ReactNode, viewerName = 'Lea Demo') {
  return render(
    <WorkspaceContext.Provider
      value={
        {
          activeOrganization: {
            members: [
              { user: { name: viewerName }, userId: 'user-lea' },
              { user: { name: 'Sam Planner' }, userId: 'user-sam' }
            ]
          },
          session: { user: { id: 'user-lea', name: viewerName } }
        } as unknown as WorkspaceContextValue
      }
    >
      {ui}
    </WorkspaceContext.Provider>
  );
}

function composerBadge() {
  const composer = page.getByLabelText('Issue comment').element();
  return composer
    .closest('[data-slot="timeline-item"]')
    ?.querySelector('[data-slot="timeline-badge"]');
}

describe('IssueDetail', () => {
  test('shows the sidebar sections for an issue nothing has happened to yet', async () => {
    await renderIssue(<IssueDetail {...detail()} />);
    expect(composerBadge()?.textContent).toBe('LD');

    await expect.element(page.getByText('No one')).toBeInTheDocument();
    await expect.element(page.getByText('None yet')).toBeInTheDocument();
    await expect.element(page.getByText('Choose a date')).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Comment' })).toBeInTheDocument();
  });

  test('sets a decide-by date from the calendar popover', async () => {
    state.issue = issueDetail({ dueAt: new Date(2026, 7, 23, 12).getTime() });
    await renderIssue(<IssueDetail {...detail()} />);

    await page.getByRole('button', { name: 'Decide by' }).click();
    await page.getByRole('button', { name: /August 24th, 2026/u }).click();
    expect(actions.setDueAt).toHaveBeenCalledWith(new Date(2026, 7, 24, 12).getTime());
  });

  test('clears an optional decide-by date', async () => {
    state.issue = issueDetail({ dueAt: new Date(2026, 7, 23, 12).getTime() });
    await renderIssue(<IssueDetail {...detail()} />);

    await page.getByRole('button', { name: 'Decide by' }).click();
    await page.getByRole('button', { name: 'Clear date' }).click();
    expect(actions.setDueAt).toHaveBeenCalledWith(null);
  });

  test('assigns the Issue agent from the assignees gear popover', async () => {
    await renderIssue(<IssueDetail {...detail()} />);
    await page.getByRole('button', { name: 'Edit assignees' }).click();
    await page.getByRole('button', { name: 'Assign Issue agent' }).click();
    expect(actions.assign).toHaveBeenCalledWith(issueId, {
      agentId: 'issue',
      kind: 'agent',
      name: 'Issue agent'
    });
  });

  test('suggests me first and assigns a teammate from the picker', async () => {
    await renderIssue(<IssueDetail {...detail()} />);
    await page.getByRole('button', { name: 'Edit assignees' }).click();
    await expect.element(page.getByRole('button', { name: 'Assign me' })).toBeInTheDocument();
    await page.getByRole('button', { name: 'Assign Sam Planner' }).click();
    expect(actions.assign).toHaveBeenCalledWith(issueId, {
      kind: 'user',
      name: 'Sam Planner',
      userId: 'user-sam'
    });

    await page.getByRole('button', { name: 'Edit assignees' }).click();
    await page.getByRole('button', { name: 'Assign me' }).click();
    expect(actions.assign).toHaveBeenLastCalledWith(issueId, {
      kind: 'user',
      name: 'Lea Demo',
      userId: 'user-lea'
    });
  });

  test('starts an idea from the idea gear popover', async () => {
    await renderIssue(<IssueDetail {...detail()} />);
    await page.getByRole('button', { name: 'Edit idea' }).click();
    await page.getByRole('button', { name: 'New idea' }).click();
    expect(actions.implement).toHaveBeenCalledOnce();
  });

  test('hides sidebar actions the viewer cannot take', async () => {
    state.issue = issueDetail({ canAssign: false, canManage: false });
    await renderIssue(<IssueDetail {...detail()} />);

    await expect.element(page.getByText('No one')).toBeInTheDocument();
    await expect.element(page.getByText('None yet')).toBeInTheDocument();
    await expect.element(page.getByText('No date yet')).toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Edit assignees' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Edit idea' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Decide by' })).not.toBeInTheDocument();
  });

  test('keeps assign available on a closed issue without starting an idea', async () => {
    state.issue = issueDetail({ status: 'closed' });
    await renderIssue(<IssueDetail {...detail()} />);

    await expect.element(page.getByRole('button', { name: 'Edit assignees' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Edit idea' })).not.toBeInTheDocument();
    await expect.element(page.getByText('None yet')).toBeInTheDocument();
  });

  test('renders later comments in the same thread as the opening body', async () => {
    state.issue = issueDetail({
      comments: [
        issueComment('comment-1', {
          content: 'Keep the afternoon free for the coast.',
          createdAt: Date.UTC(2026, 7, 18)
        })
      ]
    });
    await renderIssue(<IssueDetail {...detail()} />);

    await expect.element(page.getByText('Add a coast day near Lisbon.')).toBeInTheDocument();
    await expect.element(page.getByText('Jordan Lee')).toBeInTheDocument();
    await expect
      .element(page.getByText('Keep the afternoon free for the coast.'))
      .toBeInTheDocument();
    expect(composerBadge()?.textContent).toBe('LD');
  });

  test('renders assignment system events in the discussion thread', async () => {
    state.issue = issueDetail({
      comments: [
        issueComment('event-1', {
          author: { name: 'Alex Morgan', userId: 'user-alex' },
          content: 'Alex Morgan assigned this to Sam Planner',
          createdAt: Date.UTC(2026, 7, 18),
          kind: 'system'
        })
      ]
    });
    await renderIssue(<IssueDetail {...detail()} />);

    await expect
      .element(page.getByText('Alex Morgan assigned this to Sam Planner'))
      .toBeInTheDocument();
    // Opening body is the only comment card; the assign event is a compact system line.
    expect(page.getByText(/commented/u).elements()).toHaveLength(1);
  });

  test('clusters consecutive assignment events onto one quiet rail marker', async () => {
    state.issue = issueDetail({
      comments: [
        issueComment('event-1', {
          author: { name: 'Alex Morgan', userId: 'user-alex' },
          content: 'Alex Morgan assigned this to Sam Planner',
          createdAt: Date.UTC(2026, 7, 18),
          kind: 'system'
        }),
        issueComment('event-2', {
          author: { name: 'Alex Morgan', userId: 'user-alex' },
          content: 'Alex Morgan unassigned Sam Planner',
          createdAt: Date.UTC(2026, 7, 18, 1),
          kind: 'system',
          updatedAt: Date.UTC(2026, 7, 18, 1)
        }),
        issueComment('event-3', {
          author: { name: 'Alex Morgan', userId: 'user-alex' },
          content: 'Alex Morgan assigned this to Issue agent',
          createdAt: Date.UTC(2026, 7, 18, 2),
          kind: 'system',
          updatedAt: Date.UTC(2026, 7, 18, 2)
        })
      ]
    });
    await renderIssue(<IssueDetail {...detail()} />);

    await expect
      .element(page.getByText('Alex Morgan assigned this to Sam Planner'))
      .toBeInTheDocument();
    await expect.element(page.getByText('Alex Morgan unassigned Sam Planner')).toBeInTheDocument();
    await expect
      .element(page.getByText('Alex Morgan assigned this to Issue agent'))
      .toBeInTheDocument();

    const timelineItems = document.querySelectorAll('[data-slot="timeline-item"]');
    // Opening comment + one system cluster + composer.
    expect(timelineItems).toHaveLength(3);
    expect(timelineItems[1]?.querySelectorAll('[data-slot="timeline-badge"]')).toHaveLength(1);
  });

  test('shows a linked idea in the sidebar instead of starting a new one', async () => {
    state.issue = issueDetail({
      idea: {
        id: 'proposal-1' as Id<'tripProposals'>,
        status: 'in_review',
        title: 'Coast day draft',
        workingTripId: 'trip-work' as Id<'trips'>
      }
    });
    await renderIssue(<IssueDetail {...detail()} />);

    await expect.element(page.getByText('Coast day draft')).toBeInTheDocument();
    await expect.element(page.getByText('in review')).toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: /Coast day draft/u }))
      .toHaveAttribute('href', '/trips/$tripId/ideas/$proposalId/$view');
    await expect.element(page.getByRole('button', { name: 'Edit idea' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'New idea' })).not.toBeInTheDocument();
  });

  test('shows an assigned person as a compact row', async () => {
    state.issue = issueDetail({
      assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' }
    });
    await renderIssue(<IssueDetail {...detail()} />);

    await expect.element(page.getByText('Issue agent')).toBeInTheDocument();
    await expect.element(page.getByText('No one')).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Edit assignees' }).click();
    await page.getByRole('button', { name: 'Unassign Issue agent' }).click();
    expect(actions.assign).toHaveBeenCalledWith(issueId, null);
  });

  test('submits a comment from the thread composer', async () => {
    await renderIssue(<IssueDetail {...detail()} />);
    await page.getByLabelText('Issue comment').fill('Can we keep this flexible?');
    await page.getByRole('button', { name: 'Comment' }).click();
    expect(actions.addComment).toHaveBeenCalledWith('Can we keep this flexible?');
  });

  test('shows a manual Done when panel with its text and no explanation', async () => {
    state.issue = issueDetail({ condition: manualCondition() });
    await renderIssue(<IssueDetail {...detail()} />);

    await expect.element(page.getByRole('heading', { name: 'Done when' })).toBeInTheDocument();
    await expect
      .element(page.getByTestId(testIds.issueConditionPanel))
      .toHaveTextContent('Flights confirmed');
    await expect.element(page.getByText(/Closes automatically/u)).not.toBeInTheDocument();
  });

  test('explains an unmet auto condition and starts an idea from the one Idea control', async () => {
    state.issue = issueDetail({
      condition: autoCondition(false)
    });
    await renderIssue(<IssueDetail {...detail()} />);

    await expect.element(page.getByText(/Not met yet\./u)).toBeInTheDocument();
    await expect
      .element(
        page.getByText(/Closes automatically when the trip changes; start an idea to get there/u)
      )
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Start an idea' }))
      .not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Edit idea' }).click();
    await page.getByRole('button', { name: 'New idea' }).click();
    expect(actions.implement).toHaveBeenCalledOnce();
  });

  test('shows a met auto condition without the start action', async () => {
    state.issue = issueDetail({
      condition: autoCondition(true)
    });
    await renderIssue(<IssueDetail {...detail()} />);

    await expect
      .element(page.getByTestId(testIds.issueConditionPanel))
      .toHaveAttribute('data-met', 'true');
    await expect
      .element(page.getByRole('button', { name: 'Start an idea' }))
      .not.toBeInTheDocument();
  });

  test('omits the panel when the issue has no condition', async () => {
    await renderIssue(<IssueDetail {...detail()} />);
    await expect.element(page.getByRole('heading', { name: 'Done when' })).not.toBeInTheDocument();
  });
});
