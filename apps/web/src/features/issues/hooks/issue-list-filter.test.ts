import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vite-plus/test';
import type { IssueStatusFilter } from '@/types/issues';
import type { IssueListItem } from '@/types/issues';
import { DEFAULT_ISSUE_STATUS_FILTER, filterWorkspaceIssues } from './issue-list-filter';

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

const issueListItem = (over: Partial<IssueListItem> = {}): IssueListItem => ({
  ...listItem,
  tripName: 'Atlantic week',
  ...over
});

const issues = [
  issueListItem({
    id: 'issue-open' as Id<'tripIssues'>,
    status: 'open',
    title: 'Coast day'
  }),
  issueListItem({
    assignee: { kind: 'user', name: 'Sam Planner', userId: 'user-sam' },
    author: { name: 'Sam Planner', userId: 'user-sam' },
    id: 'issue-closed' as Id<'tripIssues'>,
    status: 'closed',
    title: 'Museum morning',
    tripName: 'City break'
  })
];

const defaultFilters = { query: '', status: DEFAULT_ISSUE_STATUS_FILTER } as const;

describe('filterWorkspaceIssues', () => {
  test('defaults to open issues', () => {
    expect(filterWorkspaceIssues(issues, defaultFilters).map(({ id }) => id)).toEqual([
      'issue-open'
    ]);
  });

  test('filters closed issues', () => {
    expect(
      filterWorkspaceIssues(issues, { query: '', status: 'closed' }).map(({ id }) => id)
    ).toEqual(['issue-closed']);
  });

  test('includes every issue when the status filter is all', () => {
    expect(filterWorkspaceIssues(issues, { query: '', status: 'all' }).map(({ id }) => id)).toEqual(
      ['issue-open', 'issue-closed']
    );
  });

  test('searches title, author, trip, and assignee case-insensitively', () => {
    expect(
      filterWorkspaceIssues(issues, { query: 'MUSEUM', status: 'all' }).map(({ id }) => id)
    ).toEqual(['issue-closed']);
    expect(
      filterWorkspaceIssues(issues, { query: 'sam planner', status: 'all' }).map(({ id }) => id)
    ).toEqual(['issue-closed']);
    expect(
      filterWorkspaceIssues(issues, { query: 'atlantic', status: 'all' }).map(({ id }) => id)
    ).toEqual(['issue-open']);
  });

  test('combines search with the status filter', () => {
    expect(filterWorkspaceIssues(issues, { query: 'museum', status: 'open' })).toEqual([]);
    expect(
      filterWorkspaceIssues(issues, { query: 'museum', status: 'closed' }).map(({ id }) => id)
    ).toEqual(['issue-closed']);
  });

  test('groups active and resolved statuses under Open and Closed', () => {
    const lifecycle = [
      issueListItem({ id: 'a' as Id<'tripIssues'>, status: 'open', title: 'Decide' }),
      issueListItem({ id: 'b' as Id<'tripIssues'>, status: 'in_progress', title: 'Working' }),
      issueListItem({ id: 'c' as Id<'tripIssues'>, status: 'closed', title: 'Done' }),
      issueListItem({ id: 'd' as Id<'tripIssues'>, status: 'wont_do', title: 'Dropped' })
    ];
    const ids = (status: IssueStatusFilter) =>
      filterWorkspaceIssues(lifecycle, { query: '', status }).map(({ id }) => id);

    expect(ids('open')).toEqual(['a', 'b']);
    expect(ids('closed')).toEqual(['c', 'd']);
    expect(ids('in_progress')).toEqual(['b']);
    expect(ids('wont_do')).toEqual(['d']);
    expect(ids('all')).toEqual(['a', 'b', 'c', 'd']);
  });
});
