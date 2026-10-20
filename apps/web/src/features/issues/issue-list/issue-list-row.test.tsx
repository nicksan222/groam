import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { manualCondition } from '@/features/issues/issue-condition-fixtures';
import type { IssueListItem } from '@/types/issues';
import { IssueListRow } from './issue-list-row';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params = {},
    title,
    to
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    title?: string;
    to: string;
  }) => (
    <a
      href={Object.entries(params).reduce(
        (href, [key, value]) => href.replace(`$${key}`, value),
        to
      )}
      title={title}
    >
      {children}
    </a>
  )
}));

function makeIssue(overrides: Partial<IssueListItem> = {}): IssueListItem {
  return {
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
    tripName: 'Atlantic week',
    updatedAt: Date.now() - 86_400_000,
    ...overrides
  } as IssueListItem;
}

function renderTable(data: IssueListItem[], showTripName: boolean) {
  return render(
    <>
      {data.map((issue) => (
        <IssueListRow key={issue.id} issue={issue} showTripName={showTripName} />
      ))}
    </>
  );
}

describe('IssueListRow', () => {
  test('renders a row with link, author, assignee, status, and updated time', async () => {
    await renderTable(
      [
        makeIssue({
          assignee: { kind: 'user', name: 'Sam Planner', userId: 'user-sam' },
          labels: ['mandatory'],
          status: 'in_progress'
        })
      ],
      true
    );
    await expect
      .element(page.getByRole('link', { name: 'Coast day' }))
      .toHaveAttribute('href', '/issues/issue-1');
    await expect.element(page.getByText('Mandatory')).toBeInTheDocument();
    await expect.element(page.getByText('Atlantic week', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByText('Alex Morgan')).toBeInTheDocument();
    await expect.element(page.getByRole('img', { name: 'Sam Planner' })).toBeInTheDocument();
    await expect.element(page.getByText('In progress')).toBeInTheDocument();
    await expect.element(page.getByText(/updated yesterday/u)).toBeInTheDocument();
  });

  test.each<[string, Partial<IssueListItem>, string]>([
    [
      'a linked idea',
      {
        idea: {
          id: 'idea-1' as Id<'tripProposals'>,
          status: 'draft',
          title: 'Coast day draft',
          workingTripId: 'trip-2' as Id<'trips'>
        } as IssueListItem['idea']
      },
      'Idea: Draft'
    ]
  ])('subtitle for %s', async (_, overrides, subtitle) => {
    await renderTable([makeIssue(overrides)], false);
    await expect.element(page.getByText(subtitle)).toBeInTheDocument();
  });

  test('keeps the deadline visible without exposing internal references or placeholder noise', async () => {
    await renderTable([makeIssue({ shortId: 'isuabc', dueAt: Date.UTC(2020, 0, 12) })], false);
    await expect.element(page.getByText('#isuabc')).not.toBeInTheDocument();
    await expect.element(page.getByText(/Decide by.*overdue/u)).toBeInTheDocument();
    await expect.element(page.getByText('No linked idea')).not.toBeInTheDocument();
  });

  test('keeps author and trip in the issue context, with a readable closing condition', async () => {
    await renderTable([makeIssue({ shortId: 'isuabc', condition: manualCondition() })], true);
    await expect.element(page.getByText(/opened by Alex Morgan/u)).toBeVisible();
    await expect.element(page.getByText('Atlantic week', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Done when: Flights confirmed' }).hover();
    await expect
      .element(page.getByText('Done when: Flights confirmed', { exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByRole('columnheader', { name: 'Opened by' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('columnheader', { name: 'Trip' })).not.toBeInTheDocument();
  });

  test('reserves the title line for the title and puts labels below it', async () => {
    await renderTable([makeIssue({ labels: ['mandatory'], condition: manualCondition() })], true);
    const title = page.getByRole('link', { name: 'Coast day' }).element().getBoundingClientRect();
    const label = page.getByText('Mandatory', { exact: true }).element().getBoundingClientRect();
    expect(label.top).toBeGreaterThanOrEqual(title.bottom);
    await expect
      .element(page.getByRole('columnheader', { name: 'Status', exact: true }))
      .not.toBeInTheDocument();
  });

  test('does not repeat an unassigned placeholder on every row', async () => {
    await renderTable([makeIssue()], false);
    await expect.element(page.getByText('Unassigned')).not.toBeInTheDocument();
  });
});
