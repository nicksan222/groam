import type { Id } from '@groam/backend/data-model';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import type { IdeaCloneView } from '@/features/ideas/idea-clone/idea-sections';
import { ideaCloneHref, ideaSharedTripHref } from '@/features/ideas/idea-href';
import { ideaPrimaryAction } from '@/features/ideas/idea-status';
import { useProposalActionRunner } from '@/features/trips/hooks/use-proposal-action-runner';
import { useTripAgentContext } from '@/features/trips/hooks/use-trip-agent-context';
import { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { useTrip } from '@/features/trips/hooks/use-trips';
import type { TripNavigation } from '@/features/trips/trip-detail/trip-detail-types';
import type { TripSection } from '@/features/trips/trip-sections';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { useReadyValue } from '@/lib/use-ready-value';

export function useIdeaCloneWorkspace({
  proposalId,
  sharedTripId,
  view,
  workingTripId
}: {
  proposalId: Id<'tripProposals'>;
  sharedTripId: Id<'trips'>;
  view: IdeaCloneView;
  workingTripId: Id<'trips'>;
}) {
  const idea = useIdeaContext();
  const workingState = useTrip(workingTripId);
  const version = useTripVersion(proposalId);
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const { isLoading: pageLoading, value: trip } = useReadyValue(
    workingState.exists === false ? undefined : workingState.trip,
    workingTripId
  );
  const editing = useOpenState(false);
  const closingIdea = useOpenState(false);
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { pendingAction, run } = useProposalActionRunner();
  const [confirmingApply, setConfirmingApply] = useState(false);
  const planningSection: TripSection = view === 'itinerary' ? 'itinerary' : 'overview';
  useTripAgentContext(trip, view === 'compare' ? 'ideas' : planningSection);

  const missing = workingState.exists === false;
  const showLoading = pageLoading || !trip;
  const proposal = version.proposal ?? idea.proposal;
  const primary = proposal ? ideaPrimaryAction(proposal, viewerUserId) : null;

  const openView = (nextView: IdeaCloneView, addDestination = false) => {
    const target = ideaCloneHref({ id: proposalId, sourceTripId: sharedTripId }, nextView, {
      addDestination
    });
    void navigate({
      ...target,
      // Keep the current references so opening a dialog does not reload the workspace.
      params: (current) => ({
        ...target.params,
        tripId: current.tripId ?? sharedTripId,
        proposalId: current.proposalId ?? proposalId
      })
    });
  };
  const editDetails = () => {
    if (trip?.permissions.canEdit) editing.openPanel();
  };
  const navigation: TripNavigation = {
    closeAddDestination: () => openView('itinerary'),
    openAddDestination: () => {
      void (async () => {
        if (
          trip?.departureTransfer &&
          !(await confirm(
            'Clear return travel?',
            'Adding another stop will clear the existing return travel details.'
          ))
        ) {
          return;
        }
        openView('itinerary', true);
      })();
    },
    openSection: (nextSection) => {
      if (nextSection === 'overview' || nextSection === 'itinerary') openView(nextSection);
    }
  };
  const runPrimary = () => {
    if (!primary) return;
    if (primary.intent === 'submit') void run('submit', version.submit);
    if (primary.intent === 'approve') void run('approve', () => version.approve(true));
    if (primary.intent === 'merge') setConfirmingApply(true);
  };

  return {
    closingIdea,
    confirmingApply,
    editDetails,
    editing,
    idea,
    missing,
    navigation,
    openShared: () => {
      void navigate(ideaSharedTripHref(sharedTripId, view));
    },
    openView,
    parentLabel: idea.sharedTrip?.name ?? 'Trip',
    pendingAction,
    planningSection,
    primary,
    proposal,
    run,
    runPrimary,
    setConfirmingApply,
    showLoading,
    trip,
    version,
    workingState
  };
}
