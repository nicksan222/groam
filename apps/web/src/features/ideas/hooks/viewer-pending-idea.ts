import { isViewerOpenIdea } from '@groam/backend/convex/modules/travel/turn';
import type { ViewerIdea } from '@/types/ideas';

/** The viewer's own open ideas (draft, in review, conflicted), newest first. */
export function findViewerOpenIdeas<T extends ViewerIdea>(
  proposals: T[],
  viewerUserId: string | null | undefined
) {
  if (!viewerUserId) return [];
  return proposals
    .filter((proposal) => isViewerOpenIdea(proposal, viewerUserId))
    .toSorted((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0));
}

/** The viewer's own drafts, newest first; the start-an-idea flow offers to continue one. */
export function findViewerDrafts<T extends ViewerIdea>(
  proposals: T[],
  viewerUserId: string | null | undefined
) {
  return findViewerOpenIdeas(proposals, viewerUserId).filter(
    (proposal) => proposal.status === 'draft'
  );
}
