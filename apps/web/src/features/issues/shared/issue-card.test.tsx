import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { starterCondition } from '@/features/issues/issue-condition-fixtures';
import { testIds } from '@/lib/test-ids';
import type { IssueCardData } from '@/types/issues';
import type { IssueListItem } from '@/types/issues';
import { IssueCard } from './issue-card';

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

const issueListItem = (over: Partial<IssueListItem> = {}): IssueListItem => ({
  ...listItem,
  tripName: 'Atlantic week',
  ...over
});

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Link: ({ children, className, to }: { children?: ReactNode; className?: string; to: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  )
}));

function issue(overrides: Partial<IssueCardData> = {}): IssueCardData {
  return issueListItem({
    assignee: { kind: 'user', name: 'Sam Planner', userId: 'user-sam' },
    dueAt: Date.now() + 5 * 86_400_000,
    idea: {
      id: 'idea-1' as Id<'tripProposals'>,
      status: 'draft',
      title: 'Coast day draft',
      workingTripId: 'trip-2' as Id<'trips'>
    },
    labels: ['mandatory'],
    status: 'in_progress',
    title: 'Pick the coast day',
    ...overrides
  });
}

const bare = { assignee: null, dueAt: null, idea: null, labels: [] };

describe('IssueCard', () => {
  test('renders status, title, labels, assignee, due date, and idea', async () => {
    await render(<IssueCard issue={issue()} />);

    await expect
      .element(page.getByTestId(testIds.issueCard))
      .toHaveAttribute('data-status', 'in_progress');
    await expect
      .element(page.getByRole('link', { name: 'Pick the coast day' }))
      .toHaveAttribute('href', '/issues/$issueId');
    await expect.element(page.getByText('Mandatory')).toBeInTheDocument();
    await expect
      .element(page.getByText('Idea drafted'))
      .toHaveAttribute('title', 'Coast day draft');
    await expect.element(page.getByRole('img', { name: 'Sam Planner' })).toBeInTheDocument();
    await expect
      .element(page.getByTestId(testIds.issueDueChip))
      .not.toHaveAttribute('data-overdue');
  });

  test('marks an active issue past its date as overdue but not a resolved one', async () => {
    const past = Date.now() - 3 * 86_400_000;
    await render(
      <>
        <IssueCard issue={issue({ dueAt: past, id: 'a' as Id<'tripIssues'> })} />
        <IssueCard issue={issue({ dueAt: past, id: 'b' as Id<'tripIssues'>, status: 'closed' })} />
      </>
    );
    const chips = page.getByTestId(testIds.issueDueChip).all();
    await expect.element(chips[0]!).toHaveAttribute('data-overdue', 'true');
    await expect.element(chips[1]!).not.toHaveAttribute('data-overdue');
  });

  test('renders the assignee slot in place of the avatar', async () => {
    await render(
      <IssueCard assigneeSlot={<button type="button">Pick assignee</button>} issue={issue(bare)} />
    );
    await expect.element(page.getByRole('button', { name: 'Pick assignee' })).toBeInTheDocument();
  });

  test('renders the assignee slot among the chips', async () => {
    await render(
      <IssueCard
        assigneeAt="chips"
        assigneeSlot={<button type="button">Pick who’s handling it</button>}
        issue={issue(bare)}
      />
    );
    await expect
      .element(page.getByRole('button', { name: 'Pick who’s handling it' }))
      .toBeInTheDocument();
  });

  test('shows no avatar and no chip row for a bare unassigned card', async () => {
    await render(<IssueCard issue={issue(bare)} />);
    await expect.element(page.getByRole('img')).not.toBeInTheDocument();
    await expect.element(page.getByTitle('Unassigned')).not.toBeInTheDocument();
    const row = page.getByTestId(testIds.issueCard).element().querySelector('div.empty\\:hidden');
    expect(row && getComputedStyle(row).display).toBe('none');
  });

  test('reveals a hover slot only on hover or focus, without changing the card’s height', async () => {
    const trigger = <button type="button">Assign someone</button>;
    await render(
      <>
        <div data-testid="plain">
          <IssueCard issue={issue(bare)} />
        </div>
        <div data-testid="hover">
          <IssueCard assigneeAt="hover" assigneeSlot={trigger} issue={issue(bare)} />
        </div>
      </>
    );
    const slot = page.getByRole('button', { name: 'Assign someone' });
    expect(getComputedStyle(slot.element().parentElement!).opacity).toBe('0');
    const height = (id: string) => page.getByTestId(id).element().getBoundingClientRect().height;
    expect(height('hover')).toBe(height('plain'));
    slot.element().focus();
    await expect.poll(() => getComputedStyle(slot.element().parentElement!).opacity).toBe('1');
  });

  test('says what is still needed while a condition is pending, and the label once met', async () => {
    await render(
      <>
        <IssueCard issue={issue({ condition: starterCondition(false) })} />
        <IssueCard
          issue={issue({ condition: starterCondition(true), id: 'b' as Id<'tripIssues'> })}
        />
      </>
    );
    await expect.element(page.getByText('No destination yet')).toBeInTheDocument();
    await expect.element(page.getByText('The trip has a destination')).toBeInTheDocument();
  });
});
