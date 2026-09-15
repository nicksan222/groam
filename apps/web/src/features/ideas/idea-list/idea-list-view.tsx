import { useSetAgentContext } from '@groam/ui/ai/context/agent-context';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { Plus } from 'lucide-react';
import { useStartIdeaDialog } from '@/features/ideas/hooks/use-start-idea-dialog';
import { useViewerOpenIdeas, useWorkspaceIdeas } from '@/features/ideas/hooks/use-workspace-ideas';
import { mergeViewerOpenIdeas } from '@/features/ideas/hooks/viewer-pending-idea';
import { useTrips } from '@/features/trips/hooks/use-trips';
import { CreateTripIdeaDialog } from '@/features/trips/trip-ideas/create-trip-idea-dialog';
import { PaginatedListContent } from '@/features/workspace/workspace-list/paginated-list-content';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import { IdeaEmptyState } from './idea-empty-state';
import { IdeaList } from './idea-list';
import { ideasListDescription, ideasListDescriptionShort, startIdeaCta } from './idea-page-copy';

export function IdeaListView() {
  const { isLoading, loadMore, proposals, status } = useWorkspaceIdeas();
  const { proposals: viewerOpenIdeas } = useViewerOpenIdeas();
  const { trips, isLoading: tripsLoading } = useTrips({ includeArchived: false });
  const { activeOrganization, session } = useWorkspace();
  const {
    dialogOpen,
    isCreating,
    onOpenChange,
    openDialog,
    selectedTripId,
    setSelectedTripId,
    startIdea
  } = useStartIdeaDialog();
  const creatableTrips = trips.filter((trip) => trip.archivedAt === null);
  const listedProposals = mergeViewerOpenIdeas(proposals, viewerOpenIdeas);

  useSetAgentContext({
    capabilities: [],
    data: {
      activeGroup: activeOrganization.name,
      ideas: listedProposals.map((proposal) => ({
        id: proposal.id,
        status: proposal.status,
        title: proposal.title,
        tripName: proposal.sourceTripName
      }))
    },
    description:
      'Summarize open trip ideas across the group and help decide what to review or apply next.',
    key: 'ideas:list',
    title: 'Ideas'
  });

  if (isLoading) return <PageLoading label="Loading ideas…" />;

  return (
    <Shell>
      <Shell.Header>
        <Shell.Title data-testid={testIds.ideasTitle}>Ideas</Shell.Title>
        <Shell.Description>
          <span className="sm:hidden">{ideasListDescriptionShort}</span>
          <span className="hidden sm:inline">{ideasListDescription}</span>
        </Shell.Description>
      </Shell.Header>
      {isLoading || listedProposals.length > 0 ? (
        <Shell.Action
          data-testid={testIds.startIdea}
          icon={<Plus />}
          onClick={openDialog}
          text={startIdeaCta}
        />
      ) : null}
      <Shell.Content>
        <CreateTripIdeaDialog
          tripsLoading={tripsLoading}
          isCreating={isCreating}
          onCreate={startIdea}
          onOpenChange={onOpenChange}
          onSelectedTripIdChange={setSelectedTripId}
          open={dialogOpen}
          selectedTripId={selectedTripId}
          trips={creatableTrips.map((trip) => ({ id: trip.id, name: trip.name }))}
        />
        <PaginatedListContent
          empty={<IdeaEmptyState canStart onStart={openDialog} />}
          isEmpty={!isLoading && listedProposals.length === 0}
          loadMoreLabel="Load more ideas"
          onLoadMore={loadMore}
          status={status}
        >
          <IdeaList
            emptyFilterMessage={(filter) =>
              filter === 'pending'
                ? 'No open ideas.'
                : filter === 'merged'
                  ? 'No settled ideas.'
                  : 'No ideas yet.'
            }
            isLoading={isLoading}
            proposals={listedProposals}
            showTripName
            viewerUserId={session.user.id}
          />
        </PaginatedListContent>
      </Shell.Content>
    </Shell>
  );
}
