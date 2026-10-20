import { PageLoading } from '@groam/ui/components/page-loading';
import { RecordList } from '@groam/ui/components/record-list';
import { type ReactNode, useMemo } from 'react';
import { issueStatusFilterLabels } from '@/features/issues/hooks/issue-list-filter';
import {
  issueStatusOptions,
  useIssueListFilters
} from '@/features/issues/hooks/use-issue-list-filters';
import { useLoadWhileFilteredEmpty } from '@/features/workspace/hooks/use-load-while-filtered-empty';
import { ListStatusFilterSelect } from '@/features/workspace/workspace-list/list-status-filter-select';
import { recordListSorts } from '@/features/workspace/workspace-list/record-list-sorts';
import { testIds } from '@/lib/test-ids';
import type { IssueListItem, IssueStatusFilter } from '@/types/issues';
import type { PaginatedListStatus } from '@/types/workspace';
import { IssueListRow } from './issue-list-row';

const ISSUE_LIST_RESOURCE = { plural: 'issues', singular: 'issue' } as const;

function noop() {}

export function IssueList({
  defaultStatus,
  emptyFilterMessage,
  filterPlaceholder,
  isLoading = false,
  issues,
  onRowActivate,
  pagination,
  showTripName = true,
  toolbarExtra
}: {
  defaultStatus?: IssueStatusFilter;
  emptyFilterMessage: (filter: IssueStatusFilter) => string;
  filterPlaceholder?: string;
  isLoading?: boolean;
  issues: IssueListItem[] | undefined;
  onRowActivate?: (issue: IssueListItem) => void;
  /** Paged sources: keep loading while the filter hides every loaded issue. */
  pagination?: { loadMore: (count: number) => void; status: PaginatedListStatus };
  showTripName?: boolean;
  toolbarExtra?: ReactNode;
}) {
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
  const searching = useLoadWhileFilteredEmpty({
    isFilteredEmpty: Boolean(pagination) && visibleIssues.length === 0,
    loadMore: pagination?.loadMore ?? noop,
    status: pagination?.status
  });
  const sortOptions = useMemo(() => recordListSorts<IssueListItem>(), []);

  if (isLoading || !issues) {
    return <PageLoading label="Loading issues…" />;
  }

  return (
    <RecordList
      empty={searching ? 'Looking through more issues…' : empty}
      filterPlaceholder={filterPlaceholder}
      getKey={(issue) => issue.id}
      hasExtraFilters={hasExtraFilters}
      items={visibleIssues}
      onClear={clearStatusFilter}
      onQueryChange={setQuery}
      query={query}
      renderItem={(issue) => (
        <IssueListRow issue={issue} onActivate={onRowActivate} showTripName={showTripName} />
      )}
      resourceLabel={ISSUE_LIST_RESOURCE}
      sortOptions={sortOptions}
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
