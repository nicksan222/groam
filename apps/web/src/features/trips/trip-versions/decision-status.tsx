import { CheckCircle2, Circle } from 'lucide-react';

import { allowsSelfApproval, decisionHeadline } from '@/features/trips/hooks/decision-helpers';
import type { ProposalDetail } from './proposal-types';

export function DecisionStatus({
  checksPassed,
  remainingApprovals,
  proposal,
  status,
  unresolvedFeedback
}: {
  checksPassed: boolean;
  remainingApprovals: number;
  proposal: ProposalDetail;
  status: ProposalDetail['status'];
  unresolvedFeedback: number;
}) {
  const { description, title, tone } = decisionHeadline({
    checksPassed,
    remainingApprovals,
    selfApproval: allowsSelfApproval(proposal),
    status,
    unresolvedFeedback
  });
  return (
    <div className="flex gap-3 border-b border-border px-3 py-3">
      {tone === 'ready' ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
      ) : tone === 'blocked' ? (
        <Circle className="mt-0.5 size-5 shrink-0 text-chart-4" />
      ) : (
        <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      )}
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
