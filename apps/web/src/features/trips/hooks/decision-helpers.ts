import { ideaApprove, ideaRemoveApproval } from '@/features/ideas/idea-glossary';
import type { ProposalDetail } from '@/features/trips/trip-versions/proposal-types';

/** True when no human reviewers were asked — author may self-approve. */
export function allowsSelfApproval(proposal: Pick<ProposalDetail, 'reviewers'>) {
  return !proposal.reviewers.some((reviewer) => reviewer.kind === 'user');
}

export function applyBlockReason({
  canApprove,
  canMerge,
  conversationsReady,
  remainingApprovals,
  reviewReady,
  selfApproval,
  status,
  unresolvedFeedback
}: {
  canApprove?: boolean;
  canMerge: boolean;
  conversationsReady: boolean;
  remainingApprovals: number;
  reviewReady: boolean;
  selfApproval?: boolean;
  status: ProposalDetail['status'];
  unresolvedFeedback: number;
}) {
  if (canMerge) return null;
  if (status === 'conflicted') return 'Update this idea from the shared trip before applying.';
  if (!reviewReady && !conversationsReady) {
    if (selfApproval && canApprove) {
      return `Approve this idea and resolve ${unresolvedFeedback} conversation${unresolvedFeedback === 1 ? '' : 's'} first.`;
    }
    return `Waiting on ${remainingApprovals} approval${remainingApprovals === 1 ? '' : 's'} and ${unresolvedFeedback} conversation${unresolvedFeedback === 1 ? '' : 's'}.`;
  }
  if (!reviewReady) {
    if (selfApproval && canApprove) return 'Approve this idea first.';
    return `Waiting on ${remainingApprovals} more approval${remainingApprovals === 1 ? '' : 's'}.`;
  }
  if (!conversationsReady) {
    return `Resolve ${unresolvedFeedback} conversation${unresolvedFeedback === 1 ? '' : 's'} first.`;
  }
  return 'Only organizers can apply this idea to the shared trip.';
}

export function decisionHeadline({
  checksPassed,
  remainingApprovals,
  selfApproval,
  status,
  unresolvedFeedback
}: {
  checksPassed: boolean;
  remainingApprovals: number;
  selfApproval?: boolean;
  status: ProposalDetail['status'];
  unresolvedFeedback: number;
}) {
  if (status === 'merged') {
    return {
      description: 'These changes are on the shared trip.',
      title: 'Applied',
      tone: 'ready' as const
    };
  }
  if (status === 'closed') {
    return {
      description: 'This idea was closed without being applied to the shared trip.',
      title: 'Closed',
      tone: 'closed' as const
    };
  }
  if (status === 'draft') {
    return {
      description:
        'Review the changes, then invite the group to comment and approve. The shared trip stays unchanged.',
      title: 'Review and send',
      tone: 'draft' as const
    };
  }
  if (status === 'conflicted' && checksPassed) {
    return {
      description: 'Update this idea from the shared trip before applying it.',
      title: 'Update from the shared trip first',
      tone: 'blocked' as const
    };
  }
  if (checksPassed) {
    return {
      description: selfApproval
        ? 'This idea is approved. Applying it updates the shared trip for everyone.'
        : 'The group approved this result. Applying it updates the shared trip for everyone.',
      title: 'Ready to apply',
      tone: 'ready' as const
    };
  }
  if (selfApproval && remainingApprovals > 0 && unresolvedFeedback === 0) {
    return {
      description: 'No other reviewers are required. Approve this result, then apply it.',
      title: 'Approve to continue',
      tone: 'blocked' as const
    };
  }
  const blockers = [
    remainingApprovals > 0
      ? `${remainingApprovals} more approval${remainingApprovals === 1 ? '' : 's'}`
      : null,
    unresolvedFeedback > 0
      ? `${unresolvedFeedback} unresolved conversation${unresolvedFeedback === 1 ? '' : 's'}`
      : null
  ].filter((item): item is string => item !== null);
  return {
    description:
      blockers.length > 0
        ? `${blockers.join(' and ')} before this idea can be applied.`
        : 'Complete the requirements below before applying this idea.',
    title: selfApproval ? 'Almost ready' : 'Waiting on the group',
    tone: 'blocked' as const
  };
}

export function approveActionLabel({
  hasApproved
}: {
  hasApproved: boolean;
  selfApproval?: boolean;
}) {
  return hasApproved ? ideaRemoveApproval : ideaApprove;
}
