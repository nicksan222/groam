import type { Id } from '@groam/backend/data-model';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { findViewerDrafts } from '@/features/ideas/hooks/viewer-pending-idea';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import {
  type CreateTripIdeaIntent,
  useCreateTripIdeaDialog
} from '@/features/trips/hooks/use-create-trip-idea-dialog';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import type { StartIdeaIntent, ViewerIdea } from '@/types/ideas';

function toCreateIntent(intent: StartIdeaIntent): CreateTripIdeaIntent {
  const firstDestination = Boolean(intent.firstDestination);
  return {
    addDestination: Boolean(intent.addDestination || firstDestination),
    firstDestination,
    section:
      intent.section ?? (firstDestination || intent.addDestination ? 'itinerary' : 'overview'),
    titleHint: intent.titleHint
  };
}

function titleForIntent(intent: StartIdeaIntent) {
  if (intent.titleHint) return intent.titleHint;
  if (intent.addDestination || intent.firstDestination) return 'Add a stop';
  return undefined;
}

export function useStartIdeaFlow({
  createVersion,
  proposals,
  trip
}: {
  createVersion: (title?: string) => Promise<{ proposalId: Id<'tripProposals'> } | null>;
  proposals: Array<ViewerIdea & { id: Id<'tripProposals'>; title: string }> | undefined;
  trip: Pick<TripDetail, 'destinations' | 'id' | 'name' | 'permissions' | 'proposal'> | undefined;
}) {
  const navigate = useNavigate();
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const existingDraftDialog = useOpenState(false);
  const [pendingIntent, setPendingIntent] = useState<StartIdeaIntent>({});
  const drafts = findViewerDrafts(proposals ?? [], viewerUserId);
  const pendingDraft = drafts[0];

  const openIdea = useCallback(
    (proposal: { id: Id<'tripProposals'> }, intent: StartIdeaIntent) => {
      if (!trip) return;
      const createIntent = toCreateIntent(intent);
      void navigate(
        ideaCloneHref({ id: proposal.id, sourceTripId: trip.id }, createIntent.section, {
          addDestination: createIntent.addDestination
        })
      );
    },
    [navigate, trip]
  );

  const ideaDialog = useCreateTripIdeaDialog({
    createVersion: async (title) => {
      if (!trip || trip.proposal || !trip.permissions.canPropose) return null;
      const version = await createVersion(title);
      return version ? { proposalId: version.proposalId } : null;
    },
    onCreated: (proposalId, intent) => {
      openIdea({ id: proposalId }, intent);
    }
  });

  const start = useCallback(
    (intent: StartIdeaIntent = {}) => {
      if (!trip || trip.proposal || !trip.permissions.canPropose) return;
      const firstDestination =
        intent.firstDestination ||
        (Boolean(intent.addDestination) && trip.destinations.length === 0);
      const resolved: StartIdeaIntent = {
        ...intent,
        firstDestination,
        section:
          intent.section ?? (firstDestination || intent.addDestination ? 'itinerary' : 'overview'),
        titleHint: titleForIntent(intent)
      };
      if (firstDestination) {
        if (pendingDraft) {
          openIdea(pendingDraft, resolved);
          return;
        }
        void ideaDialog.createForIntent(toCreateIntent(resolved), resolved.titleHint);
        return;
      }
      if (pendingDraft) {
        setPendingIntent(resolved);
        existingDraftDialog.openPanel();
        return;
      }
      ideaDialog.openDialog(toCreateIntent(resolved));
    },
    [existingDraftDialog, ideaDialog, openIdea, pendingDraft, trip]
  );

  const continueDraft = useCallback(() => {
    if (!pendingDraft) return;
    existingDraftDialog.closePanel();
    openIdea(pendingDraft, pendingIntent);
  }, [existingDraftDialog, openIdea, pendingDraft, pendingIntent]);

  const startAnotherIdea = useCallback(() => {
    existingDraftDialog.closePanel();
    ideaDialog.openDialog(toCreateIntent(pendingIntent));
  }, [existingDraftDialog, ideaDialog, pendingIntent]);

  return {
    continueDraft,
    create: ideaDialog.create,
    dialogOpen: ideaDialog.dialogOpen,
    existingDraftOpen: existingDraftDialog.open,
    isCreating: ideaDialog.isCreating,
    pendingDraft,
    pendingIntent,
    setDialogOpen: ideaDialog.setDialogOpen,
    setExistingDraftOpen: existingDraftDialog.setOpen,
    start,
    startAnotherIdea,
    titleHint: titleForIntent(pendingIntent)
  };
}
