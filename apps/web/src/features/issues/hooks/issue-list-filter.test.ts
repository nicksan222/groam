import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
import { DEFAULT_ISSUE_STATUS_FILTER, filterWorkspaceIssues } from './issue-list-filter';
import type { IssueListItem } from './issue-list-item';

function issue(
  value: Partial<IssueListItem> & Pick<IssueListItem, 'id' | 'status' | 'title'>
): IssueListItem {
  return {
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    idea: null,
    tripName: 'Atlantic week',
    updatedAt: 1,
    ...value
  };
}

const issues = [
  issue({
    id: 'issue-open' as Id<'tripIssues'>,
    status: 'open',
    title: 'Coast day'
  }),
  issue({
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
});
