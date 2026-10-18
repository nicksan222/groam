import Shell from '@groam/ui/components/shell/client';
import { nextStepEyebrow } from '@/features/ideas/idea-list/idea-page-copy';
import { ApprovalList } from './approval-list';
import { DecisionActions } from './decision-actions';
import { DecisionChecks } from './decision-checks';
import { DecisionStatus } from './decision-status';
import { PassOnIdea } from './pass-on-idea';
import type { ProposalActionRunner, ProposalDetail } from './proposal-types';

export function ProposalDecisionBox({
  approve,
  close,
  merge,
  pendingAction,
  proposal,
  run,
  submit,
  unresolvedFeedback
}: {
  approve: (approved: boolean) => Promise<boolean>;
  close: (reason?: string) => Promise<boolean>;
  merge: () => Promise<boolean>;
  pendingAction: string | null;
  proposal: ProposalDetail;
  run: ProposalActionRunner;
  submit: () => Promise<boolean>;
  unresolvedFeedback: number;
}) {
  const reviewReady = proposal.approvalCount >= proposal.requiredApprovals;
  const conversationsReady = unresolvedFeedback === 0;
  const checksPassed = reviewReady && conversationsReady;
  const remainingApprovals = Math.max(0, proposal.requiredApprovals - proposal.approvalCount);
  return (
    <div className="space-y-2">
      <Shell.Eyebrow className="px-1">{nextStepEyebrow}</Shell.Eyebrow>
      <Shell.Card variant="well">
        <DecisionStatus
          checksPassed={checksPassed}
          proposal={proposal}
          remainingApprovals={remainingApprovals}
          status={proposal.status}
          unresolvedFeedback={unresolvedFeedback}
        />
        <DecisionChecks
          conversationsReady={conversationsReady}
          proposal={proposal}
          remainingApprovals={remainingApprovals}
          reviewReady={reviewReady}
          unresolvedFeedback={unresolvedFeedback}
        />
        <ApprovalList approvals={proposal.approvals} />
        <DecisionActions
          approve={approve}
          conversationsReady={conversationsReady}
          merge={merge}
          pendingAction={pendingAction}
          proposal={proposal}
          remainingApprovals={remainingApprovals}
          reviewReady={reviewReady}
          run={run}
          submit={submit}
          unresolvedFeedback={unresolvedFeedback}
        />
      </Shell.Card>
      {proposal.canClose && (
        <PassOnIdea close={close} pendingAction={pendingAction} proposal={proposal} run={run} />
      )}
    </div>
  );
}
