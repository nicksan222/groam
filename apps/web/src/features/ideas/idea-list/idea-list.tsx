import { PageLoading } from '@groam/ui/components/page-loading';
import { RecordList } from '@groam/ui/components/record-list';
import { useNavigate } from '@tanstack/react-router';
import { type ReactNode, useCallback, useMemo } from 'react';
import {
  type IdeaListItem,
  type IdeaStatusFilter,
  ideaStatusFilterLabels
} from '@/features/ideas/hooks/idea-list-filter';
import {
  ideaStatusOptions,
  useIdeaListFilters
} from '@/features/ideas/hooks/use-idea-list-filters';
import type { WorkspaceIdea } from '@/features/ideas/hooks/use-workspace-ideas';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { ListStatusFilterSelect } from '@/features/workspace/workspace-list/list-status-filter-select';
import { recordListSorts } from '@/features/workspace/workspace-list/record-list-sorts';
import { IdeaListRow } from './idea-list-row';

const IDEA_LIST_RESOURCE = { plural: 'ideas', singular: 'idea' } as const;

export function IdeaList<T extends IdeaListItem>({
  defaultStatus,
  emptyFilterMessage,
  filterPlaceholder,
  headingLevel = 'h2',
  isLoading = false,
  onRowActivate,
  proposals,
  renderItem,
  showTripName = false,
  toolbarExtra,
  viewerUserId
}: {
  defaultStatus?: IdeaStatusFilter;
  emptyFilterMessage: (filter: IdeaStatusFilter) => string;
  filterPlaceholder?: string;
  headingLevel?: 'h2' | 'h3';
  isLoading?: boolean;
  onRowActivate?: (proposal: T) => void;
  proposals: T[] | undefined;
  renderItem?: (proposal: T) => ReactNode;
  showTripName?: boolean;
  toolbarExtra?: ReactNode;
  viewerUserId?: string | null;
}) {
  const navigate = useNavigate();
  const Heading = headingLevel;
  const listProposals = proposals ?? [];

  const {
    clearStatusFilter,
    empty,
    hasExtraFilters,
    query,
    setQuery,
    setStatusFilter,
    statusFilter,
    visibleProposals
  } = useIdeaListFilters({
    defaultStatus,
    emptyFilterMessage,
    proposals: listProposals,
    viewerUserId
  });

  const openProposal = useCallback(
    (proposal: T) => {
      if (onRowActivate) {
        onRowActivate(proposal);
        return;
      }
      if (!('sourceTripId' in proposal)) return;
      const sourceTripId = proposal.sourceTripId;
      if (typeof sourceTripId !== 'string') return;
      const href = ideaOpenHref(
        {
          author: { userId: proposal.author.userId },
          id: proposal.id as WorkspaceIdea['id'],
          sourceTripId: sourceTripId as WorkspaceIdea['sourceTripId'],
          status: proposal.status
        },
        viewerUserId
      );
      void navigate(href);
    },
    [navigate, onRowActivate, viewerUserId]
  );

  const sortOptions = useMemo(() => recordListSorts<T>(), []);

  if (isLoading || !proposals) {
    return <PageLoading label="Loading ideas…" />;
  }

  return (
    <>
      <Heading className="sr-only">Ideas</Heading>
      <RecordList
        empty={empty}
        filterPlaceholder={filterPlaceholder}
        getKey={(proposal) => proposal.id}
        hasExtraFilters={hasExtraFilters}
        items={visibleProposals}
        onClear={clearStatusFilter}
        onQueryChange={setQuery}
        query={query}
        renderItem={
          renderItem ??
          ((proposal) => (
            <IdeaListRow
              onActivate={() => openProposal(proposal)}
              onTitleActivate={onRowActivate ? () => onRowActivate(proposal) : undefined}
              proposal={proposal}
              showTripName={showTripName}
              viewerUserId={viewerUserId}
            />
          ))
        }
        resourceLabel={IDEA_LIST_RESOURCE}
        sortOptions={sortOptions}
        toolbarExtra={
          toolbarExtra ?? (
            <ListStatusFilterSelect
              ariaLabel="Filter ideas by status"
              hasValue={hasExtraFilters}
              labels={ideaStatusFilterLabels}
              onChange={setStatusFilter}
              options={ideaStatusOptions}
              value={statusFilter}
            />
          )
        }
      />
    </>
  );
}
