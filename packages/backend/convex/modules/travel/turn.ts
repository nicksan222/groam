/**
 * Whose turn it is. The one rule behind the sidebar counts, each trip's queues, and Home's
 * "Your turn" list. Pure: it reads shapes the issue, idea, and poll lists already return.
 */
import { isResolved, type TripIssueStatus } from '#convex/modules/travel/issues/status';

export type TurnIdea = {
  author: { userId: string };
  status: 'closed' | 'conflicted' | 'draft' | 'in_review' | 'merged';
};

const viewerOpenStatuses = new Set<TurnIdea['status']>(['conflicted', 'draft', 'in_review']);

/** An idea its author has not finished: a draft, under review, or in conflict. */
export function isViewerOpenIdea(idea: TurnIdea, viewerUserId: string | null | undefined) {
  return (
    Boolean(viewerUserId) &&
    idea.author.userId === viewerUserId &&
    viewerOpenStatuses.has(idea.status)
  );
}

export function isViewerDraft(idea: TurnIdea, viewerUserId: string | null | undefined) {
  return Boolean(viewerUserId) && idea.author.userId === viewerUserId && idea.status === 'draft';
}

/** Others' drafts stay private to their author. */
export function isVisibleIdea(idea: TurnIdea, viewerUserId: string | null | undefined) {
  return idea.status !== 'draft' || isViewerDraft(idea, viewerUserId);
}

/** An issue waits on the viewer when it is assigned to them and not yet resolved. */
export function isIssueYourTurn(
  issue: {
    assignee: { kind: string; userId?: string } | null;
    status: TripIssueStatus;
  },
  viewerUserId: string | null | undefined
) {
  return (
    Boolean(viewerUserId) &&
    issue.assignee?.kind === 'user' &&
    issue.assignee.userId === viewerUserId &&
    !isResolved(issue.status)
  );
}

/**
 * An idea waits on the viewer to approve it; for their own idea, to finish a draft or a conflict,
 * or to apply it once it can be applied.
 */
export function isIdeaYourTurn(
  idea: TurnIdea & { canApprove?: boolean; canMerge?: boolean; hasApproved?: boolean },
  viewerUserId: string | null | undefined
) {
  const reviewerTurn = idea.status === 'in_review' && Boolean(idea.canApprove) && !idea.hasApproved;
  const authorTurn =
    isViewerOpenIdea(idea, viewerUserId) &&
    (idea.status === 'draft' ||
      idea.status === 'conflicted' ||
      (idea.status === 'in_review' && Boolean(idea.canMerge)));
  return reviewerTurn || authorTurn;
}

/** An open poll the viewer may vote in and has not voted in yet. */
export function isPollYourTurn(poll: {
  canVote: boolean;
  myOptionIds: readonly unknown[];
  status: 'closed' | 'open';
}) {
  return poll.status === 'open' && poll.canVote && poll.myOptionIds.length === 0;
}
