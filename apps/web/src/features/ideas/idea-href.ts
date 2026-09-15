import type { Id } from '@groam/backend/data-model';
import { isViewerDraft } from '@/features/ideas/hooks/viewer-pending-idea';
import {
  defaultIdeaCloneView,
  type IdeaCloneView
} from '@/features/ideas/idea-clone/idea-sections';
import type { IdeaCloneHref, IdeaHrefProposal, IdeaStatus, IdeaWorkspaceHref } from '@/types/ideas';

export type { IdeaCloneHref, IdeaHrefProposal, IdeaStatus, IdeaWorkspaceHref };

export function ideaDetailHref(proposalId: Id<'tripProposals'>) {
  return {
    params: { proposalId },
    to: '/ideas/$proposalId' as const
  };
}

export function ideaCloneHref(
  proposal: { id: Id<'tripProposals'>; sourceTripId: Id<'trips'> },
  view: IdeaCloneView = defaultIdeaCloneView,
  options: { addDestination?: boolean } = {}
): IdeaCloneHref {
  const resolvedView = options.addDestination ? 'itinerary' : view;
  return {
    params: {
      proposalId: proposal.id,
      tripId: proposal.sourceTripId,
      view: resolvedView
    },
    search: options.addDestination ? { addDestination: true } : {},
    to: '/trips/$tripId/ideas/$proposalId/$view'
  };
}

export function ideaOpenHref(
  proposal: IdeaHrefProposal & { author?: { userId: string } },
  viewerUserId?: string | null,
  options: { addDestination?: boolean } = {}
): IdeaCloneHref | ReturnType<typeof ideaDetailHref> {
  if (!proposal.sourceTripId) return ideaDetailHref(proposal.id);
  const viewerDraft = isViewerDraft(
    {
      author: { userId: proposal.author?.userId ?? '' },
      id: proposal.id,
      status: proposal.status
    },
    viewerUserId
  );
  const view =
    viewerDraft || (proposal.status === 'draft' && !viewerUserId) ? 'overview' : 'compare';
  return ideaCloneHref({ id: proposal.id, sourceTripId: proposal.sourceTripId }, view, options);
}

export function ideaWorkspaceHref(
  proposal: IdeaHrefProposal,
  viewerUserId?: string | null
): IdeaWorkspaceHref {
  return ideaOpenHref(proposal, viewerUserId);
}

export function ideaListHref(tripId: Id<'trips'>) {
  return {
    params: { section: 'ideas' as const, tripId },
    search: {},
    to: '/trips/$tripId/$section' as const
  };
}

export function ideaSharedTripHref(sharedTripId: Id<'trips'>, view: IdeaCloneView) {
  const section = view === 'itinerary' ? 'itinerary' : view === 'overview' ? 'overview' : 'ideas';
  return {
    params: { section, tripId: sharedTripId },
    search: {},
    to: '/trips/$tripId/$section' as const
  };
}
