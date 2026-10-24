import { FileEdit } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import { ideaPackingNotice, ideaPackingSeeChanges } from '@/features/ideas/idea-glossary';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useNavigate } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';

/** Packing in an idea is a draft: it reaches the shared trip only once the idea is applied. */
export function IdeaDraftNotice({ trip }: { trip: TripDetail }) {
  const navigate = useNavigate();
  const proposalId = useOptionalIdeaContext()?.proposal?.id;
  if (!trip.proposal) return null;
  const { sourceTripId } = trip.proposal;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning/10 py-2 ps-4 pe-2 text-sm"
      data-testid={testIds.tripPackingDraftNotice}
    >
      <span className="flex items-center gap-2 text-warning-foreground">
        <FileEdit aria-hidden className="size-4 shrink-0" />
        {ideaPackingNotice(trip.proposal.status, trip.permissions.canEdit)}
      </span>
      {proposalId ? (
        <Button
          onClick={() => void navigate(ideaCloneHref({ id: proposalId, sourceTripId }, 'compare'))}
          size="sm"
          type="button"
          variant="ghost"
        >
          {ideaPackingSeeChanges}
        </Button>
      ) : null}
    </div>
  );
}
