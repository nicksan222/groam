import { ArrowLeftRight } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { needsSharedTripUpdate } from '@/features/ideas/hooks/idea-needs-update';
import { IdeaUpdateFlow } from '@/features/ideas/idea-update/idea-update-flow';
import { TripInlineNotice } from '@/features/trips/trip-detail/trip-inline-notice';
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
      <TripInlineNotice
        action={
          <Button variant="outline" size="sm" onClick={onReviewConflicts}>
            Review conflicts
          </Button>
        }
        icon={ArrowLeftRight}
        title="The shared trip has changed"
      >
        Review the overlapping details before applying this idea.
      </TripInlineNotice>
    );
  }
  return (
    <IdeaUpdateFlow
      canRebase={proposal.canRebase}
      disabled={pendingAction !== null}
      onRebase={onRebase}
      pending={pendingAction === 'rebase'}
      sourceChanged={proposal.sourceChanged}
      status={proposal.status}
    />
  );
}
