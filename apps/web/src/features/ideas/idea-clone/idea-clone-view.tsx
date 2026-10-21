import type { Id } from '@groam/backend/data-model';
import { FileDiff } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { EmptyScreen } from '@groam/ui/components/empty-screen';
import type { ComponentProps } from 'react';
import { IdeaContextProvider } from '@/features/ideas/hooks/use-idea-context';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { TripSeatGate } from '@/features/trips/trip-detail/trip-seat-gate';
import { Link } from '@/features/workspace/navigation/router';
import { Navigate } from '@/lib/navigation/router';
import { IdeaCloneWorkspace } from './idea-clone-workspace';
import type { IdeaCloneView as CloneView } from './idea-sections';

export function IdeaCloneView(props: {
  addDestinationOpen: boolean;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  view: CloneView;
}) {
  return (
    <TripSeatGate loadingLabel="Loading idea…" tripId={props.sharedTripId}>
      <IdeaClone {...props} />
    </TripSeatGate>
  );
}

function IdeaClone({
  addDestinationOpen,
  proposalId,
  sharedTripId,
  view
}: ComponentProps<typeof IdeaCloneView>) {
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
