import { Button } from '@groam/ui/components/button';
import { needsSharedTripUpdate } from '@/features/ideas/hooks/idea-needs-update';
import { IdeaUpdateFlow } from '@/features/ideas/idea-update/idea-update-flow';
import type { IdeaRebaseChoice, IdeaRebaseResult, ProposalDetail } from '@/types/trips';

/** Shown only while an idea is behind the shared trip or conflicted. */
export function IdeaCloneUpdateBanner({
  onReviewConflicts,
  onRebase,
  pendingAction,
  proposal
}: {
  onReviewConflicts?: () => void;
  onRebase: (
    resolutions?: Array<{ choice: IdeaRebaseChoice; path: string }>
  ) => Promise<IdeaRebaseResult | null>;
  pendingAction: string | null;
  proposal: ProposalDetail;
}) {
  if (!needsSharedTripUpdate(proposal)) return null;
  if (proposal.conflicts.some((conflict) => conflict.entity === 'details')) {
    if (!onReviewConflicts) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <p className="text-sm">
          The shared trip has changed. Review the overlapping details before applying this idea.
        </p>
        <Button variant="outline" size="sm" onClick={onReviewConflicts}>
          Review conflicts
        </Button>
      </div>
    );
  }
  return (
    <div className="px-4 pt-3 sm:px-6">
      <IdeaUpdateFlow
        canRebase={proposal.canRebase}
        disabled={pendingAction !== null}
        onRebase={onRebase}
        pending={pendingAction === 'rebase'}
        sourceChanged={proposal.sourceChanged}
        status={proposal.status}
      />
    </div>
  );
}
