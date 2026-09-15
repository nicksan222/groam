import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { CheckCircle2, Send } from 'lucide-react';
import { useState } from 'react';
import { ideaApplyToSharedTrip } from '@/features/ideas/idea-glossary';
import {
  allowsSelfApproval,
  applyBlockReason,
  approveActionLabel
} from '@/features/trips/hooks/decision-helpers';
import { testIds } from '@/lib/test-ids';
import { ApplyIdeaDialog } from './apply-idea-dialog';
import type { ProposalActionRunner, ProposalDetail } from './proposal-types';

export function DecisionActions({
  approve,
  conversationsReady,
  merge,
  pendingAction,
  proposal,
  remainingApprovals,
  reviewReady,
  run,
  submit,
  unresolvedFeedback
}: {
  approve: (approved: boolean) => Promise<boolean>;
  conversationsReady: boolean;
  merge: () => Promise<boolean>;
  pendingAction: string | null;
  proposal: ProposalDetail;
  remainingApprovals: number;
  reviewReady: boolean;
  run: ProposalActionRunner;
  submit: () => Promise<boolean>;
  unresolvedFeedback: number;
}) {
  const [confirmingApply, setConfirmingApply] = useState(false);
  const selfApproval = allowsSelfApproval(proposal);
  const blockReason = applyBlockReason({
    canApprove: proposal.canApprove,
    canMerge: proposal.canMerge,
    conversationsReady,
    remainingApprovals,
    reviewReady,
    selfApproval,
    status: proposal.status,
    unresolvedFeedback
  });
  const showApply = proposal.status === 'in_review' || proposal.status === 'conflicted';
  return (
    <div className="space-y-2 border-t border-border px-3 py-3">
      {proposal.status === 'draft' && (
        <div className="space-y-1.5">
          <Button
            className="w-full"
            data-testid={testIds.requestReview}
            disabled={pendingAction !== null || proposal.changes.length === 0}
            onClick={() => void run('submit', submit)}
          >
            {pendingAction === 'submit' ? <Spinner /> : <Send />} Send for review
          </Button>
          <p className="text-center text-[11px] leading-4 text-muted-foreground">
            {proposal.changes.length === 0
              ? 'Add a change before you can send this to the group.'
              : 'Reviewers can compare, comment, and approve. The shared trip stays unchanged.'}
          </p>
        </div>
      )}
      {proposal.canApprove && (
        <Button
          className="w-full"
          data-testid={testIds.approveIdea}
          disabled={pendingAction !== null}
          onClick={() => void run('approve', () => approve(!proposal.hasApproved))}
          variant="outline"
        >
          {pendingAction === 'approve' ? <Spinner /> : <CheckCircle2 />}
          {approveActionLabel({ hasApproved: proposal.hasApproved, selfApproval })}
        </Button>
      )}
      {showApply && (
        <div className="space-y-1.5">
          <Button
            className="w-full"
            data-testid={testIds.applyIdea}
            disabled={pendingAction !== null || !proposal.canMerge}
            onClick={() => setConfirmingApply(true)}
          >
            <CheckCircle2 /> {ideaApplyToSharedTrip}
          </Button>
          {blockReason && (
            <p className="text-center text-[11px] leading-4 text-muted-foreground">{blockReason}</p>
          )}
        </div>
      )}
      {proposal.status === 'merged' && (
        <p className="flex items-center justify-center gap-2 py-1 text-sm font-medium text-primary">
          <CheckCircle2 className="size-4" /> Applied to the shared trip
        </p>
      )}
      <ApplyIdeaDialog
        onApply={() => run('merge', merge)}
        onOpenChange={setConfirmingApply}
        open={confirmingApply}
        pending={pendingAction === 'merge'}
      />
    </div>
  );
}
