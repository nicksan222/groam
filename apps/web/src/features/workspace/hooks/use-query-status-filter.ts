import { useListFilterState } from '@/lib/stores/list-filter-store';

export function useQueryStatusFilter<TStatus extends string>({
  defaultStatus,
  emptyFilterMessage,
  noMatchMessage = 'No matching items.'
}: {
  defaultStatus: TStatus;
  emptyFilterMessage: (status: TStatus) => string;
  noMatchMessage?: string;
}) {
  const { clearStatusFilter, query, setQuery, setStatusFilter, statusFilter } =
    useListFilterState(defaultStatus);
  const hasExtraFilters = statusFilter !== defaultStatus;
  const empty =
    query.trim() !== '' || hasExtraFilters ? noMatchMessage : emptyFilterMessage(statusFilter);

  return {
    clearStatusFilter,
    empty,
    hasExtraFilters,
    query,
    setQuery,
    setStatusFilter,
    statusFilter
  };
}
