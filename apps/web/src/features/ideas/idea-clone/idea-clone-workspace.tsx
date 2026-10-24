import type { Id } from '@groam/backend/data-model';
import { PageLoading } from '@groam/ui/components/page-loading';
import { IdeaCloneWorkspaceReady } from './idea-clone-workspace-ready';
import type { IdeaCloneView as CloneView } from './idea-sections';

export function IdeaCloneWorkspace({
  addDestinationOpen,
  changeCount,
  proposalId,
  proposalLoading,
  sharedTripId,
  view,
  workingTripId
}: {
  addDestinationOpen: boolean;
  changeCount: number;
  proposalId: Id<'tripProposals'>;
  proposalLoading?: boolean;
  sharedTripId: Id<'trips'>;
  view: CloneView;
  workingTripId?: Id<'trips'>;
}) {
  if (proposalLoading || !workingTripId) {
    return <PageLoading label="Loading idea…" />;
  }

  return (
    <IdeaCloneWorkspaceReady
      addDestinationOpen={addDestinationOpen}
      changeCount={changeCount}
      proposalId={proposalId}
      sharedTripId={sharedTripId}
      view={view}
      workingTripId={workingTripId}
    />
  );
}
