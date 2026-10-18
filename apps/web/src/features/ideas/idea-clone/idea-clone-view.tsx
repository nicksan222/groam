import type { Id } from '@groam/backend/data-model';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { Navigate } from '@tanstack/react-router';
import { FileDiff } from 'lucide-react';
import { IdeaContextProvider } from '@/features/ideas/hooks/use-idea-context';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { Link } from '@/features/workspace/navigation/router';
import { IdeaCloneWorkspace } from './idea-clone-workspace';
import type { IdeaCloneView as CloneView } from './idea-sections';

export function IdeaCloneView({
  addDestinationOpen,
  proposalId,
  sharedTripId,
  view
}: {
  addDestinationOpen: boolean;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  view: CloneView;
}) {
  const { proposal } = useTripVersion(proposalId);

  if (proposal === null) {
    return (
      <EmptyScreen
        buttonRaw={
          <Button asChild variant="outline">
            <Link to="/ideas">Back to ideas</Link>
          </Button>
        }
        description="It may have been removed, or you do not have access to this trip."
        headline="Idea not found"
        icon={FileDiff}
      />
    );
  }

  if (proposal !== undefined && proposal.sourceTripId !== sharedTripId) {
    const redirect = ideaCloneHref(proposal, view);
    return <Navigate params={redirect.params} replace search={redirect.search} to={redirect.to} />;
  }

  return (
    <IdeaContextProvider proposalId={proposalId} sharedTripId={sharedTripId} view={view}>
      <IdeaCloneWorkspace
        addDestinationOpen={addDestinationOpen}
        changeCount={proposal?.changes.length ?? 0}
        proposalId={proposalId}
        proposalLoading={proposal === undefined}
        sharedTripId={sharedTripId}
        view={view}
        workingTripId={proposal?.workingTripId}
      />
    </IdeaContextProvider>
  );
}
