import type { Id } from '@groam/backend/data-model';
import { DataTable } from '@groam/ui/components/data-table';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { IssueListItem } from '@/types/issues';
import { issueColumns } from './issue-list-columns';

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
    <DataTable
      columns={issueColumns({ showTripName })}
      data={data}
      filterPlaceholder="Filter issues…"
    />
  );
}

describe('issueColumns', () => {
  test.each<[boolean, string[]]>([
    [false, ['Issue', 'Opened by', 'Assignee', 'Status', 'Updated']],
    [true, ['Issue', 'Trip', 'Opened by', 'Assignee', 'Status', 'Updated']]
  ])('showTripName=%s yields the expected headers', async (showTripName, headers) => {
    await renderTable([makeIssue()], showTripName);
    for (const header of headers) {
      await expect.element(page.getByText(header, { exact: true })).toBeInTheDocument();
    }
    if (!showTripName) {
      await expect.element(page.getByText('Trip', { exact: true })).not.toBeInTheDocument();
    }
  });

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
    await expect.element(page.getByRole('cell', { name: 'Atlantic week' })).toBeInTheDocument();
    await expect.element(page.getByText('Alex Morgan')).toBeInTheDocument();
    await expect.element(page.getByText('Sam Planner')).toBeInTheDocument();
    await expect.element(page.getByText('In progress')).toBeInTheDocument();
    await expect.element(page.getByText('yesterday')).toBeInTheDocument();
  });

  test.each<[string, Partial<IssueListItem>, string]>([
    ['no linked idea', {}, 'No linked idea'],
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
      'Idea · Coast day draft'
    ]
  ])('subtitle for %s', async (_, overrides, subtitle) => {
    await renderTable([makeIssue(overrides)], false);
    await expect.element(page.getByText(subtitle)).toBeInTheDocument();
  });

  test('shows Unassigned without an assignee', async () => {
    await renderTable([makeIssue()], false);
    await expect.element(page.getByText('Unassigned')).toBeInTheDocument();
  });
});
