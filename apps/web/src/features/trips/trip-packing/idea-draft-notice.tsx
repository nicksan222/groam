import { FileEdit } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { useNavigate } from '@tanstack/react-router';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import { ideaPackingNotice, ideaPackingSeeChanges } from '@/features/ideas/idea-glossary';
import { ideaCloneHref } from '@/features/ideas/idea-href';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';

/** Packing in an idea is a draft: it reaches the shared trip only once the idea is applied. */
export function IdeaDraftNotice({ trip }: { trip: TripDetail }) {
  const navigate = useNavigate();
  const proposalId = useOptionalIdeaContext()?.proposal?.id;
  if (!trip.proposal) return null;
  const { sourceTripId } = trip.proposal;
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm"
      data-testid={testIds.tripPackingDraftNotice}
    >
      <span className="flex items-center gap-2 text-muted-foreground">
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
