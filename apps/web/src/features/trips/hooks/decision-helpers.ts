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
    return selfApproval && canApprove
      ? `Approve this idea and resolve ${pluralize(unresolvedFeedback, 'conversation')} first.`
      : `Waiting on ${pluralize(remainingApprovals, 'approval')} and ${pluralize(unresolvedFeedback, 'conversation')}.`;
  }
  if (!reviewReady) {
    if (selfApproval && canApprove) return 'Approve this idea first.';
    return `Waiting on ${remainingApprovals} more ${pluralize(remainingApprovals, 'approval').replace(/^\d+ /u, '')}.`;
  }
  if (!conversationsReady) {
    return `Resolve ${pluralize(unresolvedFeedback, 'conversation')} first.`;
  }
  return 'Only organizers can apply this idea to the shared trip.';
}

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
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
  const terminal = terminalHeadline(status);
  if (terminal) return terminal;
  const ready = readyHeadline({ checksPassed, selfApproval, status });
  if (ready) return ready;
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

function readyHeadline({
  checksPassed,
  selfApproval,
  status
}: {
  checksPassed: boolean;
  selfApproval?: boolean;
  status: ProposalDetail['status'];
}) {
  if (!checksPassed) return null;
  if (status === 'conflicted')
    return {
      description: 'Update this idea from the shared trip before applying it.',
      title: 'Update from the shared trip first',
      tone: 'blocked' as const
    };
  return {
    description: selfApproval
      ? 'This idea is approved. Applying it updates the shared trip for everyone.'
      : 'The group approved this result. Applying it updates the shared trip for everyone.',
    title: 'Ready to apply',
    tone: 'ready' as const
  };
}

function terminalHeadline(status: ProposalDetail['status']) {
  const headlines = {
    closed: {
      description: 'This idea was closed without being applied to the shared trip.',
      title: 'Closed',
      tone: 'closed' as const
    },
    draft: {
      description:
        'Review the changes, then invite the group to comment and approve. The shared trip stays unchanged.',
      title: 'Review and send',
      tone: 'draft' as const
    },
    merged: {
      description: 'These changes are on the shared trip.',
      title: 'Applied',
      tone: 'ready' as const
    }
  };
  return headlines[status as keyof typeof headlines] ?? null;
}

export function approveActionLabel({
  hasApproved
}: {
  hasApproved: boolean;
  selfApproval?: boolean;
}) {
  return hasApproved ? ideaRemoveApproval : ideaApprove;
}
