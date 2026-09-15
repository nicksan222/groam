import type { IssueListFilters, IssueListItem, IssueStatusFilter } from '@/types/issues';

export type { IssueListFilters, IssueListItem, IssueStatusFilter };

export const DEFAULT_ISSUE_STATUS_FILTER = 'open';

export const issueStatusFilterLabels: Record<IssueStatusFilter, string> = {
  all: 'All',
  closed: 'Closed',
  open: 'Open'
};

function matchesIssueStatus(status: IssueListItem['status'], filter: IssueStatusFilter) {
  if (filter === 'all') return true;
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
