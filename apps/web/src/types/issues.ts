import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';

export type WorkspaceIssue = FunctionReturnType<
  typeof api.routes.trips.issues.workspace.list.run
>['page'][number];

export type IssueStatus = WorkspaceIssue['status'];

/** What closes an issue: `auto` closes itself once met, `manual` is ticked by hand (`met` null). */
export type IssueCondition = NonNullable<WorkspaceIssue['condition']>;

export type IssueListItem = Pick<
  WorkspaceIssue,
  | 'assignee'
  | 'author'
  | 'canAssign'
  | 'canManage'
  | 'condition'
  | 'dueAt'
  | 'id'
  | 'idea'
  | 'labels'
  | 'rank'
  | 'status'
  | 'title'
  | 'updatedAt'
> &
  Partial<Pick<WorkspaceIssue, 'tripName'>>;

/** What an issue card needs to render; every issue list shape satisfies it. */
export type IssueCardData = Pick<
  IssueListItem,
  'assignee' | 'condition' | 'dueAt' | 'id' | 'idea' | 'labels' | 'status' | 'title' | 'updatedAt'
>;

export type IssueLabel = WorkspaceIssue['labels'][number];

/** Who an issue can be assigned to; `null` unassigns. */
export type IssueAssigneeInput = NonNullable<WorkspaceIssue['assignee']>;

/**
 * List filter keys. `open` groups the active statuses (to decide and in progress), `closed`
 * groups the resolved ones (done and won't do); `in_progress` and `wont_do` narrow to one.
 */
export type IssueStatusFilter = 'all' | 'closed' | 'in_progress' | 'open' | 'wont_do';

export type IssueListFilters = {
  query: string;
  status: IssueStatusFilter;
};

export type IssueDetailAgentContextInput = Pick<
  WorkspaceIssue,
  'id' | 'status' | 'title' | 'tripId' | 'tripName'
>;
