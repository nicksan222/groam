import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import {
  WorkspaceContext,
  type WorkspaceContextValue
} from '@/features/workspace/workspace-shell/workspace-state';
import { IssueDetail } from './issue-detail';

const issueId = 'issue-1' as Id<'tripIssues'>;
const tripId = 'trip-1' as Id<'trips'>;

const actions = vi.hoisted(() => ({
  addComment: vi.fn(),
  assignIssueAgent: vi.fn(),
  assignUser: vi.fn(),
  implement: vi.fn(),
  setDueAt: vi.fn(),
  setStatus: vi.fn(),
  unassign: vi.fn()
}));

const state = vi.hoisted(() => ({
  issue: null as null | Record<string, unknown>
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssue: () => ({
    addComment: actions.addComment,
    assignIssueAgent: actions.assignIssueAgent,
    assignUser: actions.assignUser,
    implement: actions.implement,
    issue: state.issue,
    setDueAt: actions.setDueAt,
    setStatus: actions.setStatus,
    unassign: actions.unassign
  })
}));

function issue(overrides: Record<string, unknown> = {}) {
  return {
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    body: 'Add a coast day near Lisbon.',
    canManage: true,
    comments: [],
    dueAt: null,
    id: issueId,
    idea: null,
    status: 'open',
    title: 'Coast day',
    tripId,
    tripName: 'Atlantic week',
    updatedAt: Date.UTC(2026, 7, 17),
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  actions.addComment.mockResolvedValue(true);
  actions.assignIssueAgent.mockResolvedValue(true);
  actions.implement.mockResolvedValue(null);
  actions.setStatus.mockResolvedValue(true);
  actions.unassign.mockResolvedValue(true);
  state.issue = issue();
});

async function renderIssue(ui: ReactNode, viewerName = 'Lea Demo') {
  return render(
    <WorkspaceContext.Provider
      value={
        {
          activeOrganization: { members: [] },
          session: { user: { name: viewerName } }
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
  test('keeps metadata in the sidebar and close next to comment', async () => {
    await renderIssue(<IssueDetail issueId={issueId} />);
    expect(composerBadge()?.textContent).toBe('LD');

    await expect.element(page.getByRole('heading', { name: 'Assignees' })).toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Idea' })).toBeInTheDocument();
    await expect.element(page.getByText('No one')).toBeInTheDocument();
    await expect.element(page.getByText('None yet')).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Edit assignees' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Edit idea' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Assign Issue agent' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'New idea' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Close issue' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Comment' })).toBeInTheDocument();
    await expect.element(page.getByRole('heading', { name: 'Discussion' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="shell-two-columns"]')?.className).toContain(
      'xl:grid-cols-[minmax(0,1fr)_20rem]'
    );
    expect(document.querySelector('[data-slot="shell-right-column"]')?.className).toContain(
      'xl:sticky'
    );
    await expect.element(page.getByRole('heading', { name: 'Decide by' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Decide by' })).toBeInTheDocument();
    await expect.element(page.getByText('Choose a date')).toBeInTheDocument();
    expect(document.querySelector('input[type="date"]')).toBeNull();
  });

  test('sets a decide-by date from the calendar popover', async () => {
    state.issue = issue({ dueAt: new Date(2026, 7, 23, 12).getTime() });
    await renderIssue(<IssueDetail issueId={issueId} />);

    await page.getByRole('button', { name: 'Decide by' }).click();
    await page.getByRole('button', { name: /August 24th, 2026/u }).click();
    expect(actions.setDueAt).toHaveBeenCalledWith(new Date(2026, 7, 24, 12).getTime());
  });

  test('clears an optional decide-by date', async () => {
    state.issue = issue({ dueAt: new Date(2026, 7, 23, 12).getTime() });
    await renderIssue(<IssueDetail issueId={issueId} />);

    await page.getByRole('button', { name: 'Decide by' }).click();
    await page.getByRole('button', { name: 'Clear date' }).click();
    expect(actions.setDueAt).toHaveBeenCalledWith(null);
  });

  test('assigns the Issue agent from the assignees gear popover', async () => {
    await renderIssue(<IssueDetail issueId={issueId} />);
    await page.getByRole('button', { name: 'Edit assignees' }).click();
    await page.getByRole('button', { name: 'Assign Issue agent' }).click();
    expect(actions.assignIssueAgent).toHaveBeenCalledOnce();
  });

  test('starts an idea from the idea gear popover', async () => {
    await renderIssue(<IssueDetail issueId={issueId} />);
    await page.getByRole('button', { name: 'Edit idea' }).click();
    await page.getByRole('button', { name: 'New idea' }).click();
    expect(actions.implement).toHaveBeenCalledOnce();
  });

  test('hides sidebar actions the viewer cannot take', async () => {
    state.issue = issue({ canManage: false });
    await renderIssue(<IssueDetail issueId={issueId} />);

    await expect.element(page.getByText('No one')).toBeInTheDocument();
    await expect.element(page.getByText('None yet')).toBeInTheDocument();
    await expect.element(page.getByText('No date yet')).toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Edit assignees' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Edit idea' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Close issue' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Decide by' })).not.toBeInTheDocument();
  });

  test('keeps assign available on a closed issue without starting an idea', async () => {
    state.issue = issue({ status: 'closed' });
    await renderIssue(<IssueDetail issueId={issueId} />);

    await expect.element(page.getByRole('button', { name: 'Edit assignees' })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Edit idea' })).not.toBeInTheDocument();
    await expect.element(page.getByText('None yet')).toBeInTheDocument();
  });

  test('renders later comments in the same thread as the opening body', async () => {
    state.issue = issue({
      comments: [
        {
          author: { name: 'Jordan Lee', userId: 'user-jordan' },
          content: 'Keep the afternoon free for the coast.',
          createdAt: Date.UTC(2026, 7, 18),
          id: 'comment-1',
          kind: 'comment',
          updatedAt: Date.UTC(2026, 7, 18)
        }
      ]
    });
    await renderIssue(<IssueDetail issueId={issueId} />);

    await expect.element(page.getByText('Add a coast day near Lisbon.')).toBeInTheDocument();
    await expect.element(page.getByText('Jordan Lee')).toBeInTheDocument();
    await expect
      .element(page.getByText('Keep the afternoon free for the coast.'))
      .toBeInTheDocument();
    expect(composerBadge()?.textContent).toBe('LD');
  });

  test('renders assignment system events in the discussion thread', async () => {
    state.issue = issue({
      comments: [
        {
          author: { name: 'Alex Morgan', userId: 'user-alex' },
          content: 'Alex Morgan assigned this to Sam Planner',
          createdAt: Date.UTC(2026, 7, 18),
          id: 'event-1',
          kind: 'system',
          updatedAt: Date.UTC(2026, 7, 18)
        }
      ]
    });
    await renderIssue(<IssueDetail issueId={issueId} />);

    await expect
      .element(page.getByText('Alex Morgan assigned this to Sam Planner'))
      .toBeInTheDocument();
    // Opening body is the only comment card; the assign event is a compact system line.
    expect(page.getByText(/commented/u).elements()).toHaveLength(1);
  });

  test('clusters consecutive assignment events onto one quiet rail marker', async () => {
    state.issue = issue({
      comments: [
        {
          author: { name: 'Alex Morgan', userId: 'user-alex' },
          content: 'Alex Morgan assigned this to Sam Planner',
          createdAt: Date.UTC(2026, 7, 18),
          id: 'event-1',
          kind: 'system',
          updatedAt: Date.UTC(2026, 7, 18)
        },
        {
          author: { name: 'Alex Morgan', userId: 'user-alex' },
          content: 'Alex Morgan unassigned Sam Planner',
          createdAt: Date.UTC(2026, 7, 18, 1),
          id: 'event-2',
          kind: 'system',
          updatedAt: Date.UTC(2026, 7, 18, 1)
        },
        {
          author: { name: 'Alex Morgan', userId: 'user-alex' },
          content: 'Alex Morgan assigned this to Issue agent',
          createdAt: Date.UTC(2026, 7, 18, 2),
          id: 'event-3',
          kind: 'system',
          updatedAt: Date.UTC(2026, 7, 18, 2)
        }
      ]
    });
    await renderIssue(<IssueDetail issueId={issueId} />);

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
    state.issue = issue({
      idea: { id: 'proposal-1', status: 'in_review', title: 'Coast day draft' }
    });
    await renderIssue(<IssueDetail issueId={issueId} />);

    await expect.element(page.getByText('Coast day draft')).toBeInTheDocument();
    await expect.element(page.getByText('in review')).toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: /Coast day draft/u }))
      .toHaveAttribute('href', '/trips/$tripId/ideas/$proposalId/$view');
    await expect.element(page.getByRole('button', { name: 'Edit idea' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'New idea' })).not.toBeInTheDocument();
  });

  test('shows an assigned person as a compact row', async () => {
    state.issue = issue({
      assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' }
    });
    await renderIssue(<IssueDetail issueId={issueId} />);

    await expect.element(page.getByText('Issue agent')).toBeInTheDocument();
    await expect.element(page.getByText('No one')).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Edit assignees' }).click();
    await page.getByRole('button', { name: 'Unassign Issue agent' }).click();
    expect(actions.unassign).toHaveBeenCalledOnce();
  });

  test('submits a comment from the thread composer', async () => {
    await renderIssue(<IssueDetail issueId={issueId} />);
    await page.getByLabelText('Issue comment').fill('Can we keep this flexible?');
    await page.getByRole('button', { name: 'Comment' }).click();
    expect(actions.addComment).toHaveBeenCalledWith('Can we keep this flexible?');
  });
});
