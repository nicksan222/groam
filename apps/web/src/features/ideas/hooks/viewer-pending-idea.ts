import type { IdeaStatus, ViewerIdea } from '@/types/ideas';

export type { ViewerIdea };

const viewerOpenStatuses = new Set<IdeaStatus>(['conflicted', 'draft', 'in_review']);

export function isViewerOpenIdea(proposal: ViewerIdea, viewerUserId: string | null | undefined) {
  return (
    Boolean(viewerUserId) &&
    proposal.author.userId === viewerUserId &&
    viewerOpenStatuses.has(proposal.status)
  );
}

export function isViewerDraft(proposal: ViewerIdea, viewerUserId: string | null | undefined) {
  return (
    Boolean(viewerUserId) && proposal.author.userId === viewerUserId && proposal.status === 'draft'
  );
}

/** Shared highlight for the viewer’s in-progress draft row. */
export const viewerDraftHighlightClass = 'bg-primary/5';

export function findViewerOpenIdeas<T extends ViewerIdea>(
  proposals: T[],
  viewerUserId: string | null | undefined
) {
  if (!viewerUserId) return [];
  return proposals
    .filter((proposal) => isViewerOpenIdea(proposal, viewerUserId))
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
}

export function findViewerDrafts<T extends ViewerIdea>(
  proposals: T[],
  viewerUserId: string | null | undefined
) {
  return findViewerOpenIdeas(proposals, viewerUserId).filter(
    (proposal) => proposal.status === 'draft'
  );
}

export function findViewerPendingIdea<T extends ViewerIdea>(
  proposals: T[],
  viewerUserId: string | null | undefined,
  sourceTripId?: string
) {
  const open = findViewerOpenIdeas(proposals, viewerUserId);
  const onTrip = sourceTripId
    ? open.filter((proposal) => proposal.sourceTripId === sourceTripId)
    : open;
  return onTrip.find((proposal) => proposal.status === 'draft') ?? onTrip[0] ?? null;
}

export function mergeViewerOpenIdeas<T extends { id: string }>(proposals: T[], viewerOpen: T[]) {
  const seen = new Set(proposals.map((proposal) => proposal.id));
  return [...viewerOpen.filter((proposal) => !seen.has(proposal.id)), ...proposals];
}

export function pinViewerOpenIdeas<T extends ViewerIdea>(
  proposals: T[],
  viewerUserId: string | null | undefined
) {
  const recent = [...proposals].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  if (!viewerUserId) return recent;
  const drafts = recent.filter((proposal) => isViewerDraft(proposal, viewerUserId));
  const otherMine = recent.filter(
    (proposal) => isViewerOpenIdea(proposal, viewerUserId) && proposal.status !== 'draft'
  );
  const pinnedIds = new Set([...drafts, ...otherMine].map((proposal) => proposal.id));
  return [...drafts, ...otherMine, ...recent.filter((proposal) => !pinnedIds.has(proposal.id))];
}

export function pendingIdeaContinueLabel(status: IdeaStatus) {
  return status === 'draft' ? 'Continue editing' : 'Open review';
}
