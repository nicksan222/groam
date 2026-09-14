import type { Id } from '@groam/backend/data-model';
import { stubPopoverEnvironment } from '@groam/ui/lib/stub-popover-environment';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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

vi.mock('@tanstack/react-router', () => ({
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
  stubPopoverEnvironment();
  actions.addComment.mockResolvedValue(true);
  actions.assignIssueAgent.mockResolvedValue(true);
  actions.implement.mockResolvedValue(null);
  actions.setStatus.mockResolvedValue(true);
  actions.unassign.mockResolvedValue(true);
  state.issue = issue();
});

afterEach(cleanup);

function renderIssue(ui: ReactNode, viewerName = 'Lea Demo') {
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
  const composer = screen.getByLabelText('Issue comment');
  return composer
    .closest('[data-slot="timeline-item"]')
    ?.querySelector('[data-slot="timeline-badge"]');
}

describe('IssueDetail', () => {
  test('keeps metadata in the sidebar and close next to comment', () => {
    renderIssue(<IssueDetail issueId={issueId} />);
    expect(composerBadge()?.textContent).toBe('LD');

    expect(screen.getByRole('heading', { name: 'Assignees' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Idea' })).toBeTruthy();
    expect(screen.getByText('No one')).toBeTruthy();
    expect(screen.getByText('None yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit assignees' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit idea' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Assign Issue agent' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New idea' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Close issue' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Comment' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Discussion' })).toBeNull();
    expect(document.querySelector('[data-slot="shell-two-columns"]')?.className).toContain(
      'xl:grid-cols-[minmax(0,1fr)_20rem]'
    );
    expect(document.querySelector('[data-slot="shell-right-column"]')?.className).toContain(
      'xl:sticky'
    );
    expect(screen.getByRole('heading', { name: 'Decide by' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Decide by' })).toBeTruthy();
    expect(screen.getByText('Choose a date')).toBeTruthy();
    expect(document.querySelector('input[type="date"]')).toBeNull();
  });

  test('sets a decide-by date from the calendar popover', () => {
    state.issue = issue({ dueAt: new Date(2026, 7, 23, 12).getTime() });
    renderIssue(<IssueDetail issueId={issueId} />);

    fireEvent.click(screen.getByRole('button', { name: 'Decide by' }));
    const next = new Date(2026, 7, 24);
    const day = document.querySelector(
      `[data-slot="calendar"] [data-day="${next.toLocaleDateString()}"]`
    );
    expect(day).toBeTruthy();
    fireEvent.click(day as Element);
    expect(actions.setDueAt).toHaveBeenCalledWith(new Date(2026, 7, 24, 12).getTime());
  });

  test('clears an optional decide-by date', () => {
    state.issue = issue({ dueAt: new Date(2026, 7, 23, 12).getTime() });
    renderIssue(<IssueDetail issueId={issueId} />);

    fireEvent.click(screen.getByRole('button', { name: 'Decide by' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear date' }));
    expect(actions.setDueAt).toHaveBeenCalledWith(null);
  });

  test('assigns the Issue agent from the assignees gear popover', () => {
    renderIssue(<IssueDetail issueId={issueId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit assignees' }));
    fireEvent.click(screen.getByRole('button', { name: 'Assign Issue agent' }));
    expect(actions.assignIssueAgent).toHaveBeenCalledOnce();
  });

  test('starts an idea from the idea gear popover', () => {
    renderIssue(<IssueDetail issueId={issueId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit idea' }));
    fireEvent.click(screen.getByRole('button', { name: 'New idea' }));
    expect(actions.implement).toHaveBeenCalledOnce();
  });

  test('hides sidebar actions the viewer cannot take', () => {
    state.issue = issue({ canManage: false });
    renderIssue(<IssueDetail issueId={issueId} />);

    expect(screen.getByText('No one')).toBeTruthy();
    expect(screen.getByText('None yet')).toBeTruthy();
    expect(screen.getByText('No date yet')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit assignees' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit idea' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close issue' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Decide by' })).toBeNull();
  });

  test('keeps assign available on a closed issue without starting an idea', () => {
    state.issue = issue({ status: 'closed' });
    renderIssue(<IssueDetail issueId={issueId} />);

    expect(screen.getByRole('button', { name: 'Edit assignees' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit idea' })).toBeNull();
    expect(screen.getByText('None yet')).toBeTruthy();
  });

  test('renders later comments in the same thread as the opening body', () => {
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
    renderIssue(<IssueDetail issueId={issueId} />);

    expect(screen.getByText('Add a coast day near Lisbon.')).toBeTruthy();
    expect(screen.getByText('Jordan Lee')).toBeTruthy();
    expect(screen.getByText('Keep the afternoon free for the coast.')).toBeTruthy();
    expect(composerBadge()?.textContent).toBe('LD');
  });

  test('renders assignment system events in the discussion thread', () => {
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
    renderIssue(<IssueDetail issueId={issueId} />);

    expect(screen.getByText('Alex Morgan assigned this to Sam Planner')).toBeTruthy();
    // Opening body is the only comment card; the assign event is a compact system line.
    expect(screen.getAllByText(/commented/u)).toHaveLength(1);
  });

  test('clusters consecutive assignment events onto one quiet rail marker', () => {
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
    renderIssue(<IssueDetail issueId={issueId} />);

    expect(screen.getByText('Alex Morgan assigned this to Sam Planner')).toBeTruthy();
    expect(screen.getByText('Alex Morgan unassigned Sam Planner')).toBeTruthy();
    expect(screen.getByText('Alex Morgan assigned this to Issue agent')).toBeTruthy();

    const timelineItems = document.querySelectorAll('[data-slot="timeline-item"]');
    // Opening comment + one system cluster + composer.
    expect(timelineItems).toHaveLength(3);
    expect(timelineItems[1]?.querySelectorAll('[data-slot="timeline-badge"]')).toHaveLength(1);
  });

  test('shows a linked idea in the sidebar instead of starting a new one', () => {
    state.issue = issue({
      idea: { id: 'proposal-1', status: 'in_review', title: 'Coast day draft' }
    });
    renderIssue(<IssueDetail issueId={issueId} />);

    expect(screen.getByText('Coast day draft')).toBeTruthy();
    expect(screen.getByText('in review')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Coast day draft/u }).getAttribute('href')).toBe(
      '/trips/$tripId/ideas/$proposalId/$view'
    );
    expect(screen.queryByRole('button', { name: 'Edit idea' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New idea' })).toBeNull();
  });

  test('shows an assigned person as a compact row', () => {
    state.issue = issue({
      assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' }
    });
    renderIssue(<IssueDetail issueId={issueId} />);

    expect(screen.getByText('Issue agent')).toBeTruthy();
    expect(screen.queryByText('No one')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit assignees' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unassign Issue agent' }));
    expect(actions.unassign).toHaveBeenCalledOnce();
  });

  test('submits a comment from the thread composer', () => {
    renderIssue(<IssueDetail issueId={issueId} />);
    fireEvent.change(screen.getByLabelText('Issue comment'), {
      target: { value: 'Can we keep this flexible?' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Comment' }));
    expect(actions.addComment).toHaveBeenCalledWith('Can we keep this flexible?');
  });
});
