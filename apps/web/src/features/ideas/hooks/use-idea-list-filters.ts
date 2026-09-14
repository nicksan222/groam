import { useMemo } from 'react';
import { useQueryStatusFilter } from '@/features/workspace/hooks/use-query-status-filter';
import {
  DEFAULT_IDEA_STATUS_FILTER,
  filterWorkspaceIdeas,
  type IdeaListItem,
  type IdeaStatusFilter,
  ideaStatusFilterLabels
} from './idea-list-filter';
import { pinViewerOpenIdeas } from './viewer-pending-idea';

export const ideaStatusOptions = (
  ['pending', 'merged', 'all'] as const satisfies readonly IdeaStatusFilter[]
).map((value) => ({ label: ideaStatusFilterLabels[value], value }));

export function useIdeaListFilters<T extends IdeaListItem>({
  defaultStatus = DEFAULT_IDEA_STATUS_FILTER,
  emptyFilterMessage,
  proposals,
  viewerUserId
}: {
  defaultStatus?: IdeaStatusFilter;
  emptyFilterMessage: (filter: IdeaStatusFilter) => string;
  proposals: T[] | undefined;
  viewerUserId?: string | null;
}) {
  const filters = useQueryStatusFilter({
    defaultStatus,
    emptyFilterMessage,
    noMatchMessage: 'No matching ideas.'
  });
  const visibleProposals = useMemo(
    () =>
      pinViewerOpenIdeas(
        filterWorkspaceIdeas(
          proposals ?? [],
          {
            query: filters.query,
            status: filters.statusFilter
          },
          viewerUserId
        ),
        viewerUserId
      ),
    [filters.query, filters.statusFilter, proposals, viewerUserId]
  );

  return {
    ...filters,
    visibleProposals
  };
}
