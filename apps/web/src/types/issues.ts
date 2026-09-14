import type { api } from '@groam/backend/api';
import type { FunctionReturnType } from 'convex/server';

export type WorkspaceIssue = FunctionReturnType<
  typeof api.routes.trips.issues.workspace.list.run
>['page'][number];

export type IssueListItem = Pick<
  WorkspaceIssue,
  'assignee' | 'author' | 'id' | 'idea' | 'status' | 'title' | 'updatedAt'
> &
  Partial<Pick<WorkspaceIssue, 'tripName'>>;

export type IssueStatusFilter = 'all' | WorkspaceIssue['status'];

export type IssueListFilters = {
  query: string;
  status: IssueStatusFilter;
};

export type IssueDetailAgentContextInput = Pick<
  WorkspaceIssue,
  'id' | 'status' | 'title' | 'tripId' | 'tripName'
>;
