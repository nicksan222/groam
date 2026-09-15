import { DataTable } from '@groam/ui/components/data-table';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useNavigate } from '@tanstack/react-router';
import { type ReactNode, useMemo } from 'react';
import {
  type IssueListItem,
  type IssueStatusFilter,
  issueStatusFilterLabels
} from '@/features/issues/hooks/issue-list-filter';
import {
  issueStatusOptions,
  useIssueListFilters
} from '@/features/issues/hooks/use-issue-list-filters';
import { ListStatusFilterSelect } from '@/features/workspace/workspace-list/list-status-filter-select';
import { testIds } from '@/lib/test-ids';
import { issueColumns } from './issue-list-columns';

export type { IssueListItem };

const ISSUE_LIST_RESOURCE = { plural: 'issues', singular: 'issue' } as const;

export function IssueList({
  defaultStatus,
  emptyFilterMessage,
  filterPlaceholder,
  isLoading = false,
  issues,
  onRowActivate,
  showTripName = true,
  toolbarExtra
}: {
  defaultStatus?: IssueStatusFilter;
  emptyFilterMessage: (filter: IssueStatusFilter) => string;
  filterPlaceholder?: string;
  isLoading?: boolean;
  issues: IssueListItem[] | undefined;
  onRowActivate?: (issue: IssueListItem) => void;
  showTripName?: boolean;
  toolbarExtra?: ReactNode;
}) {
  const navigate = useNavigate();
  const listIssues = issues ?? [];

  const {
    clearStatusFilter,
    empty,
    hasExtraFilters,
    query,
    setQuery,
    setStatusFilter,
    statusFilter,
    visibleIssues
  } = useIssueListFilters({ defaultStatus, emptyFilterMessage, issues: listIssues });
  const columns = useMemo(() => issueColumns({ showTripName }), [showTripName]);

  const activate =
    onRowActivate ??
    ((issue: IssueListItem) => {
      void navigate({ params: { issueId: issue.id }, to: '/issues/$issueId' });
    });

  if (isLoading || !issues) {
    return <PageLoading label="Loading issues…" />;
  }

  return (
    <DataTable
      columns={columns}
      data={visibleIssues}
      empty={empty}
      externalFilter
      filterPlaceholder={filterPlaceholder}
      filterValue={query}
      getRowId={(issue) => issue.id}
      getRowProps={(issue) => ({
        'data-issue-id': issue.id,
        'data-issue-title': issue.title,
        'data-status': issue.status,
        'data-testid': testIds.issueRow
      })}
      hasExtraFilters={hasExtraFilters}
      onClear={clearStatusFilter}
      onFilterValueChange={setQuery}
      onRowActivate={activate}
      resourceLabel={ISSUE_LIST_RESOURCE}
      toolbarExtra={
        toolbarExtra ?? (
          <ListStatusFilterSelect
            ariaLabel="Filter issues by status"
            hasValue={hasExtraFilters}
            labels={issueStatusFilterLabels}
            onChange={setStatusFilter}
            optionTestId={testIds.issueStatusOption}
            options={issueStatusOptions}
            testId={testIds.issueStatusFilter}
            value={statusFilter}
          />
        )
      }
    />
  );
}
