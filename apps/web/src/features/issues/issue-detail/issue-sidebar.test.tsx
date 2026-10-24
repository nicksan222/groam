import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { IssueDetailData } from './issue-detail-data';
import { IssueSidebar } from './issue-sidebar';

vi.mock('@/features/research/research-links/linked-researches', () => ({
  LinkedResearches: () => null
}));

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params = {},
    search,
    to,
    ...rest
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    search?: Record<string, number | string>;
    to: string;
  }) => (
    <a
      data-testid={(rest as { 'data-testid'?: string })['data-testid']}
      href={
        Object.entries(params).reduce((href, [key, value]) => href.replace(`$${key}`, value), to) +
        (search && Object.keys(search).length > 0
          ? `?${new URLSearchParams(Object.entries(search).map(([k, v]) => [k, String(v)]))}`
          : '')
      }
    >
      {children}
    </a>
  )
}));

vi.mock('@/features/issues/shared/issue-assignee-picker', () => ({
  IssueAssigneePicker: ({
    children,
    onAssign
  }: {
    children: ReactNode;
    onAssign: (value: null) => void;
  }) => (
    <>
      {children}
      <button onClick={() => onAssign(null)} type="button">
        pick-no-one
      </button>
    </>
  )
}));

function makeIssue(overrides: Partial<IssueDetailData> = {}): IssueDetailData {
  return {
    about: null,
    subjectMissing: false,
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    body: '',
    canAssign: true,
    canManage: true,
    closedAt: null,
    comments: [],
    condition: null,
    dueAt: null,
    id: 'issue-1' as Id<'tripIssues'>,
    idea: null,
    labels: [],
    rank: 0,
    status: 'open',
    title: 'Coast day',
    tripId: 'trip-1' as Id<'trips'>,
    tripName: 'Atlantic week',
    updatedAt: Date.now(),
    ...overrides
  } as IssueDetailData;
}

const idea = (status: string) =>
  ({
    id: 'idea-1' as Id<'tripProposals'>,
    status,
    title: 'Coast day draft',
    workingTripId: 'trip-2' as Id<'trips'>
  }) as IssueDetailData['idea'];

function renderSidebar(issue: IssueDetailData, pending = false) {
  const handlers = { onAssign: vi.fn(), onSetDueAt: vi.fn(), onStartIdea: vi.fn() };
  const view = render(<IssueSidebar issue={issue} pending={pending} {...handlers} />);
  return { handlers, view };
}

describe('IssueSidebar assignees', () => {
  test('says no one when unassigned', async () => {
    await renderSidebar(makeIssue()).view;
    await expect.element(page.getByText('No one')).toBeVisible();
  });

  test('shows a person assignee as plain text', async () => {
    await renderSidebar(
      makeIssue({ assignee: { kind: 'user', name: 'Sam Planner', userId: 'user-sam' } })
    ).view;
    await expect.element(page.getByText('Sam Planner')).toBeVisible();
    await expect.element(page.getByRole('link', { name: /Sam Planner/u })).not.toBeInTheDocument();
  });

  test('links an agent assignee to its page', async () => {
    await renderSidebar(
      makeIssue({
        assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' }
      } as unknown as Partial<IssueDetailData>)
    ).view;
    await expect
      .element(page.getByRole('link', { name: /Issue agent/u }))
      .toHaveAttribute('href', '/agents/issue');
  });

  test('reports an assignee choice', async () => {
    const { handlers, view } = renderSidebar(makeIssue());
    await view;
    await page.getByRole('button', { name: 'pick-no-one' }).click();
    expect(handlers.onAssign).toHaveBeenCalledWith(null);
  });

  test.each<[string, Partial<IssueDetailData>, boolean, boolean]>([
    ['assignable', {}, false, true],
    ['not assignable', { canAssign: false }, false, false],
    ['pending', {}, true, true]
  ])('edit assignees control when %s', async (_, overrides, pending, present) => {
    await renderSidebar(makeIssue(overrides), pending).view;
    const button = page.getByRole('button', { name: 'Edit assignees' });
    if (!present) await expect.element(button).not.toBeInTheDocument();
    else if (pending) await expect.element(button).toBeDisabled();
    else await expect.element(button).toBeEnabled();
  });
});

describe('IssueSidebar decide by', () => {
  test('managers get a date picker', async () => {
    await renderSidebar(makeIssue()).view;
    await expect.element(page.getByTestId(testIds.issueDecideBy)).toBeVisible();
    await expect.element(page.getByText('Choose a date')).toBeVisible();
  });

  test.each<[string, number | null, string]>([
    ['no date', null, 'No date yet'],
    ['a date', Date.UTC(2026, 5, 15, 12), 'Jun 15, 2026']
  ])('read-only viewers see %s', async (_, dueAt, text) => {
    await renderSidebar(makeIssue({ canManage: false, dueAt })).view;
    await expect.element(page.getByText(text, { exact: true })).toBeVisible();
    await expect.element(page.getByTestId(testIds.issueDecideBy)).not.toBeInTheDocument();
  });

  test('a past date on an open issue reads only "Overdue", since the date shows above', async () => {
    await renderSidebar(makeIssue({ dueAt: Date.now() - 3 * 86_400_000, status: 'open' })).view;
    await expect
      .poll(() => page.getByTestId(testIds.issueDueChip).element().textContent)
      .toMatch(/^Decide by Overdue$/u);
  });
});

describe('IssueSidebar condition', () => {
  test('shows the done-when panel only with a condition', async () => {
    await renderSidebar(makeIssue()).view;
    await expect.element(page.getByText('Done when')).not.toBeInTheDocument();
  });

  test('renders the condition', async () => {
    await renderSidebar(
      makeIssue({ condition: { kind: 'manual', label: 'Flights confirmed', met: null } })
    ).view;
    await expect.element(page.getByText('Flights confirmed')).toBeVisible();
  });
});

describe('IssueSidebar idea', () => {
  test('says none yet without an idea', async () => {
    await renderSidebar(makeIssue()).view;
    await expect.element(page.getByText('None yet')).toBeVisible();
  });

  test('managers of an unresolved issue start an idea from an inline text button, not a gear', async () => {
    const { handlers, view } = renderSidebar(makeIssue());
    await view;
    await page.getByRole('button', { name: 'Start an idea' }).click();
    expect(handlers.onStartIdea).toHaveBeenCalledTimes(1);
  });

  test.each<[string, Partial<IssueDetailData>]>([
    ['viewers who cannot manage', { canManage: false }],
    ['resolved issues', { status: 'closed' }],
    ['issues that already have an idea', { idea: idea('draft') }]
  ])('hides the start control for %s', async (_, overrides) => {
    await renderSidebar(makeIssue(overrides)).view;
    await expect
      .element(page.getByRole('button', { name: 'Start an idea' }))
      .not.toBeInTheDocument();
  });

  test.each<[string, string]>([
    ['draft', 'overview'],
    ['in_review', 'compare']
  ])('links a %s idea to its %s view', async (status, view) => {
    await renderSidebar(makeIssue({ idea: idea(status) })).view;
    const link = page.getByTestId(testIds.issueLinkedIdea);
    await expect.element(link.getByText('Coast day draft')).toBeVisible();
    await expect.element(link).toHaveAttribute('href', `/trips/trip-1/ideas/idea-1/${view}`);
  });

  test('spells out the idea status', async () => {
    await renderSidebar(makeIssue({ idea: idea('in_review') })).view;
    await expect.element(page.getByText('in review')).toBeVisible();
  });
});

describe('IssueSidebar about', () => {
  test('links the item the issue is about to its day on Plan', async () => {
    await renderSidebar(
      makeIssue({
        about: { day: 2, id: 'a-1' as never, label: 'Fado night', type: 'activity' }
      })
    ).view;
    await expect.element(page.getByTestId(testIds.issueAbout)).toHaveTextContent('Fado night');
    await expect
      .element(page.getByTestId(testIds.issueAbout))
      .toHaveAttribute('href', '/trips/trip-1/plan?day=2');
  });

  test('links an item with no day to Plan without a day', async () => {
    await renderSidebar(
      makeIssue({
        about: { day: null, id: 'a-1' as never, label: 'Train', type: 'activity' }
      })
    ).view;
    await expect
      .element(page.getByTestId(testIds.issueAbout))
      .toHaveAttribute('href', '/trips/trip-1/plan');
  });

  test('says so when the item has been deleted', async () => {
    await renderSidebar(makeIssue({ subjectMissing: true })).view;
    await expect
      .element(page.getByTestId(testIds.issueAbout))
      .toHaveTextContent('No longer on the plan');
  });

  test('has no About section when the issue is not about an item', async () => {
    await renderSidebar(makeIssue()).view;
    await expect.element(page.getByTestId(testIds.issueAbout)).not.toBeInTheDocument();
  });
});
