import { expect, test } from 'vitest';
import type { WorkspaceIssue } from './hooks/use-workspace-issues';
import {
  filterOpenIssues,
  isIssuesIndexActive,
  showEmptyIssuePortfolio
} from './issues-sidebar-nav.helpers';

function issue(
  value: Partial<WorkspaceIssue> & Pick<WorkspaceIssue, 'id' | 'status' | 'title'>
): WorkspaceIssue {
  return {
    assignee: null,
    author: { name: 'Alex Morgan', userId: 'user-alex' },
    body: 'Add a coast day.',
    closedAt: null,
    dueAt: null,
    idea: null,
    tripId: 'trip-1' as WorkspaceIssue['tripId'],
    tripName: 'Atlantic week',
    updatedAt: 1,
    ...value
  };
}

test('filterOpenIssues keeps only open workspace issues', () => {
  expect(
    filterOpenIssues([
      issue({ id: 'open' as WorkspaceIssue['id'], status: 'open', title: 'Open' }),
      issue({ id: 'closed' as WorkspaceIssue['id'], status: 'closed', title: 'Closed' })
    ]).map((item) => item.id)
  ).toEqual(['open']);
});

test('isIssuesIndexActive matches the issues listing only', () => {
  expect(isIssuesIndexActive('/issues')).toBe(true);
  expect(isIssuesIndexActive('/issues/')).toBe(true);
  expect(isIssuesIndexActive('/issues/abc')).toBe(false);
  expect(isIssuesIndexActive('/trips')).toBe(false);
});

test('showEmptyIssuePortfolio waits until pagination is exhausted', () => {
  expect(showEmptyIssuePortfolio(0, true)).toBe(false);
  expect(showEmptyIssuePortfolio(0, false)).toBe(true);
  expect(showEmptyIssuePortfolio(1, false)).toBe(false);
});
