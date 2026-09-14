import { CheckStateIcon } from '@groam/ui/components/check-state-icon';
import type { ProposalDetail } from './proposal-types';

export function DecisionChecks({
  conversationsReady,
  proposal,
  remainingApprovals,
  reviewReady,
  unresolvedFeedback
}: {
  conversationsReady: boolean;
  proposal: ProposalDetail;
  remainingApprovals: number;
  reviewReady: boolean;
  unresolvedFeedback: number;
}) {
  if (proposal.status === 'draft' || proposal.status === 'merged' || proposal.status === 'closed') {
    return null;
  }
  return (
    <ul className="divide-y">
      <li className="flex items-center gap-2 px-3 py-2 text-xs">
        <CheckStateIcon passed={reviewReady} />
        <span className="min-w-0 flex-1">
          {reviewReady
            ? `${proposal.approvalCount} required approval${proposal.approvalCount === 1 ? '' : 's'} received`
            : `${remainingApprovals} more approval${remainingApprovals === 1 ? '' : 's'} required`}
        </span>
        <span className="tabular-nums font-medium text-muted-foreground">
          {proposal.approvalCount}/{proposal.requiredApprovals}
        </span>
      </li>
      <li className="flex items-center gap-2 px-3 py-2 text-xs">
        <CheckStateIcon passed={conversationsReady} />
        <span className="min-w-0 flex-1">
          {conversationsReady
            ? 'All review conversations resolved'
            : `${unresolvedFeedback} unresolved conversation${unresolvedFeedback === 1 ? '' : 's'}`}
        </span>
      </li>
    </ul>
  );
}
