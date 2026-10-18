import { isResolved } from '@groam/backend/convex/modules/travel/issues/status';
import { issueStatusMeta } from '@/features/issues/issue-status';
import type { IssueListFilters, IssueListItem, IssueStatusFilter } from '@/types/issues';

export const DEFAULT_ISSUE_STATUS_FILTER = 'open';

export const issueStatusFilterLabels: Record<IssueStatusFilter, string> = {
  all: 'All',
  closed: 'Closed',
  in_progress: issueStatusMeta.in_progress.label,
  open: 'Open',
  wont_do: issueStatusMeta.wont_do.label
};

function matchesIssueStatus(status: IssueListItem['status'], filter: IssueStatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'open') return !isResolved(status);
  if (filter === 'closed') return isResolved(status);
  return status === filter;
}

function issueMatchesQuery(issue: IssueListItem, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized === '') return true;

  return `${issue.title} ${issue.author.name} ${issue.tripName ?? ''} ${issue.assignee?.name ?? ''} ${issue.idea?.title ?? ''}`
    .toLocaleLowerCase()
    .includes(normalized);
}

export function filterWorkspaceIssues(issues: IssueListItem[], filters: IssueListFilters) {
  return issues.filter(
    (issue) =>
      matchesIssueStatus(issue.status, filters.status) && issueMatchesQuery(issue, filters.query)
  );
}
