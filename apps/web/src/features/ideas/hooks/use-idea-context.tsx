import type { Id } from '@groam/backend/data-model';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import type { IdeaCloneView } from '@/features/ideas/idea-clone/idea-sections';
import { useTripRecord } from '@/features/trips/hooks/use-trip-record';
import { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { type TripDetail, useTrip } from '@/features/trips/hooks/use-trips';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import type { ProposalDetail } from '@/types/trips';

// biome-ignore lint/plugin/no-local-type-definitions: context value is bound to these hook return types
type IdeaContextValue = {
  isViewerAuthor: boolean;
  proposal: ProposalDetail | null | undefined;
  sharedTrip: ReturnType<typeof useTripRecord>;
  view: IdeaCloneView;
  workingTrip: TripDetail | undefined;
};

const IdeaContext = createContext<IdeaContextValue | null>(null);

export function IdeaContextProvider({
  children,
  proposalId,
  sharedTripId,
  view
}: {
  children: ReactNode;
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  view: IdeaCloneView;
}) {
  const { proposal } = useTripVersion(proposalId);
  const sharedRecord = useTripRecord(sharedTripId);
  const workingTripId = proposal?.workingTripId;

  const loadingValue = useMemo<IdeaContextValue>(
    () => ({
      isViewerAuthor: false,
      proposal,
      sharedTrip: sharedRecord,
      view,
      workingTrip: undefined
    }),
    [proposal, sharedRecord, view]
  );

  if (!workingTripId) {
    return <IdeaContext.Provider value={loadingValue}>{children}</IdeaContext.Provider>;
  }

  return (
    <IdeaContextReady
      proposal={proposal}
      sharedTrip={sharedRecord}
      view={view}
      workingTripId={workingTripId}
    >
      {children}
    </IdeaContextReady>
  );
}

function IdeaContextReady({
  children,
  proposal,
  sharedTrip,
  view,
  workingTripId
}: {
  children: ReactNode;
  proposal: ProposalDetail | null | undefined;
  sharedTrip: ReturnType<typeof useTripRecord>;
  view: IdeaCloneView;
  workingTripId: Id<'trips'>;
}) {
  const workingState = useTrip(workingTripId);
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const value = useMemo<IdeaContextValue>(
    () => ({
      isViewerAuthor: Boolean(proposal && viewerUserId && proposal.author.userId === viewerUserId),
      proposal,
      sharedTrip,
      view,
      workingTrip: workingState.trip
    }),
    [proposal, sharedTrip, view, viewerUserId, workingState.trip]
  );
  return <IdeaContext.Provider value={value}>{children}</IdeaContext.Provider>;
}

export function useIdeaContext() {
  const context = useContext(IdeaContext);
  if (!context) throw new Error('useIdeaContext must be used within IdeaContextProvider');
  return context;
}

export function useOptionalIdeaContext() {
  return useContext(IdeaContext);
}
