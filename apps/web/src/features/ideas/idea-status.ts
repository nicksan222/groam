import {
  ideaApplyToSharedTrip,
  ideaApprove,
  ideaSendForReview,
  ideaStatusCopy,
  ideaUpdateFromSharedTrip
} from '@/features/ideas/idea-glossary';
import type { IdeaActionProposal, IdeaPrimaryAction, IdeaStatus } from '@/types/ideas';

export function ideaStatusLabel(status: IdeaStatus) {
  return ideaStatusCopy[status];
}

export function ideaStatusTone(status: IdeaStatus): 'default' | 'destructive' | 'secondary' {
  if (status === 'conflicted') return 'destructive';
  if (status === 'in_review') return 'default';
  return 'secondary';
}

function viewerUserId(viewer: { userId: string } | string | null | undefined) {
  if (!viewer) return undefined;
  return typeof viewer === 'string' ? viewer : viewer.userId;
}

export function ideaPrimaryAction(
  proposal: IdeaActionProposal,
  viewer: { userId: string } | string | null | undefined
): IdeaPrimaryAction | null {
  const userId = viewerUserId(viewer);
  if (proposal.status === 'merged' || proposal.status === 'closed') return null;
  if (proposal.status === 'draft' && userId && proposal.author.userId === userId) {
    return { intent: 'submit', label: ideaSendForReview };
  }
  if (proposal.status === 'in_review' && proposal.canApprove && !proposal.hasApproved) {
    return { intent: 'approve', label: ideaApprove };
  }
  if (proposal.status === 'in_review' && proposal.canMerge) {
    return { intent: 'merge', label: ideaApplyToSharedTrip };
  }
  if (proposal.status === 'conflicted' && proposal.canRebase) {
    return { intent: 'rebase', label: ideaUpdateFromSharedTrip };
  }
  return null;
}
