import type { Id } from '@groam/backend/data-model';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { parseIdeaCloneSearch } from '@/features/ideas/idea-clone/idea-clone-search';
import { IdeaCloneView } from '@/features/ideas/idea-clone/idea-clone-view';
import { defaultIdeaCloneView, isIdeaCloneView } from '@/features/ideas/idea-clone/idea-sections';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';

export const Route = createFileRoute('/_workspace/trips/$tripId/ideas/$proposalId/$view')({
  component: IdeaCloneSectionRoute,
  validateSearch: parseIdeaCloneSearch
});

function IdeaCloneSectionRoute() {
  const { proposalId, tripId, view } = useResolvedParams(Route.useParams());
  const search = Route.useSearch();

  if (!isIdeaCloneView(view)) {
    return (
      <Navigate
        params={{ proposalId, tripId, view: defaultIdeaCloneView }}
        replace
        to="/trips/$tripId/ideas/$proposalId/$view"
      />
    );
  }

  return (
    <IdeaCloneView
      addDestinationOpen={search.addDestination === true}
      proposalId={proposalId as Id<'tripProposals'>}
      sharedTripId={tripId as Id<'trips'>}
      view={view}
    />
  );
}
