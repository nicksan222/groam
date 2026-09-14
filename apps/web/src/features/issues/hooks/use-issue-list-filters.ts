import { useMemo } from 'react';
import { useQueryStatusFilter } from '@/features/workspace/hooks/use-query-status-filter';
import {
  DEFAULT_ISSUE_STATUS_FILTER,
  filterWorkspaceIssues,
  type IssueListItem,
  type IssueStatusFilter,
  issueStatusFilterLabels
} from './issue-list-filter';

export const issueStatusOptions = (
  ['open', 'closed', 'all'] as const satisfies readonly IssueStatusFilter[]
).map((value) => ({ label: issueStatusFilterLabels[value], value }));

export function useIssueListFilters({
  defaultStatus = DEFAULT_ISSUE_STATUS_FILTER,
  emptyFilterMessage,
  issues
}: {
  defaultStatus?: IssueStatusFilter;
  emptyFilterMessage: (filter: IssueStatusFilter) => string;
  issues: IssueListItem[] | undefined;
}) {
  const filters = useQueryStatusFilter({
    defaultStatus,
    emptyFilterMessage,
    noMatchMessage: 'No matching issues.'
  });
  const visibleIssues = useMemo(
    () =>
      filterWorkspaceIssues(issues ?? [], {
        query: filters.query,
        status: filters.statusFilter
      }),
    [filters.query, filters.statusFilter, issues]
  );

  return {
    ...filters,
    visibleIssues
  };
}
