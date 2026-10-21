import type { Id } from '@groam/backend/data-model';
import { parseIdeaCloneSearch } from '@/features/ideas/idea-clone/idea-clone-search';
import { IdeaCloneView } from '@/features/ideas/idea-clone/idea-clone-view';
import { defaultIdeaCloneView, isIdeaCloneView } from '@/features/ideas/idea-clone/idea-sections';
import { useResolvedParams } from '@/features/workspace/hooks/reference-context';
import { Navigate, useParams, useSearch } from '@/lib/navigation/router';

export default function IdeaCloneSectionPage() {
  const params = useParams<{ proposalId: string; tripId: string; view: string }>();
  const { proposalId = '', tripId = '', view = '' } = useResolvedParams(params);
  const search = useSearch(parseIdeaCloneSearch);

  if (!isIdeaCloneView(view)) {
    return (
      <Navigate
        params={{
          proposalId: params.proposalId ?? '',
          tripId: params.tripId ?? '',
          view: defaultIdeaCloneView
        }}
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
