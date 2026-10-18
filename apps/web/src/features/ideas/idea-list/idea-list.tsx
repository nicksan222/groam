import { type ColumnDef, DataTable } from '@groam/ui/components/data-table';
import { PageLoading } from '@groam/ui/components/page-loading';
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
import {
  isViewerDraft,
  viewerDraftHighlightClass
} from '@/features/ideas/hooks/viewer-pending-idea';
import { ideaOpenHref } from '@/features/ideas/idea-href';
import { ListStatusFilterSelect } from '@/features/workspace/workspace-list/list-status-filter-select';
import { testIds } from '@/lib/test-ids';
import { ideaColumns } from './idea-list-columns';

function ideaCardColumns<T extends IdeaListItem>(
  renderItem: (item: T) => ReactNode
): ColumnDef<T, unknown>[] {
  return [
    {
      cell: ({ row }) => renderItem(row.original),
      enableHiding: false,
      enableSorting: false,
      header: 'Idea',
      id: 'idea',
      meta: { cellClassName: 'overflow-hidden p-0!', className: 'px-4 whitespace-normal' }
    }
  ];
}

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

  const columns = useMemo(() => {
    if (renderItem) return ideaCardColumns(renderItem);
    return ideaColumns({
      onOpen: openProposal as unknown as (proposal: WorkspaceIdea) => void,
      showTripName,
      viewerUserId
    }) as ColumnDef<T, unknown>[];
  }, [openProposal, renderItem, showTripName, viewerUserId]);

  if (isLoading || !proposals) {
    return <PageLoading label="Loading ideas…" />;
  }

  return (
    <>
      <Heading className="sr-only">Ideas</Heading>
      <DataTable
        columns={columns}
        data={visibleProposals}
        empty={empty}
        externalFilter
        filterPlaceholder={filterPlaceholder}
        filterValue={query}
        getRowId={(proposal) => proposal.id}
        getRowProps={
          renderItem
            ? undefined
            : (proposal) => ({
                'data-idea-id': proposal.id,
                'data-idea-name': proposal.ideaName,
                'data-status': proposal.status,
                'data-testid': testIds.ideaRow,
                'data-viewer-draft': isViewerDraft(proposal, viewerUserId) ? true : undefined
              })
        }
        hasExtraFilters={hasExtraFilters}
        onClear={clearStatusFilter}
        onFilterValueChange={setQuery}
        onRowActivate={renderItem ? undefined : openProposal}
        resourceLabel={IDEA_LIST_RESOURCE}
        rowClassName={
          renderItem
            ? undefined
            : (proposal) =>
                isViewerDraft(proposal, viewerUserId) ? viewerDraftHighlightClass : undefined
        }
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
