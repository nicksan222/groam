import type { Id } from '@groam/backend/data-model';
import { expect, test } from 'vite-plus/test';
import type { WorkspaceIssue } from '@/types/issues';
import type { IssueListItem } from '@/types/issues';
import {
  filterOpenIssues,
  isIssuesIndexActive,
  showEmptyIssuePortfolio
} from './issues-sidebar-nav.helpers';

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

test('filterOpenIssues keeps active workspace issues, to decide and in progress', () => {
  expect(
    filterOpenIssues([
      workspaceIssue({ id: 'open' as WorkspaceIssue['id'], status: 'open', title: 'Open' }),
      workspaceIssue({
        id: 'doing' as WorkspaceIssue['id'],
        status: 'in_progress',
        title: 'Doing'
      }),
      workspaceIssue({ id: 'closed' as WorkspaceIssue['id'], status: 'closed', title: 'Closed' }),
      workspaceIssue({ id: 'dropped' as WorkspaceIssue['id'], status: 'wont_do', title: 'Dropped' })
    ]).map((item) => item.id)
  ).toEqual(['open', 'doing']);
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
