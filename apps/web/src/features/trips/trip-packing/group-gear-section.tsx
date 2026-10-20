import { Lightbulb } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { useOptionalIdeaContext } from '@/features/ideas/hooks/use-idea-context';
import { usePendingGearClaim } from '@/features/trips/hooks/use-pending-gear-claim';
import { useTripPacking } from '@/features/trips/hooks/use-trip-packing';
import { useTripTravelers } from '@/features/trips/hooks/use-trip-travelers';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import type { PackingItem } from '@/types/packing';
import { AddGearForm } from './add-gear-form';
import { GroupGearFooter } from './group-gear-footer';
import { GroupGearList } from './group-gear-list';
import { GroupGearSummary } from './group-gear-summary';
import { IdeaDraftNotice } from './idea-draft-notice';
import { useViewerClaimAnnouncement } from './use-packing-motion';

/**
 * Shared gear the group needs and who brings it. It is versioned through ideas: on the shared
 * trip it reads only, and an idea's author edits their working copy.
 */
export function GroupGearSection({
  onStartPackingIdea,
  startingIdea = false,
  trip
}: {
  /** Starts an idea on the Packing tab, optionally claiming one more of an item. */
  onStartPackingIdea?: (claimGear?: string) => void;
  startingIdea?: boolean;
  trip: TripDetail;
}) {
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const editable = trip.proposal !== null && trip.permissions.canEdit;
  const packing = useTripPacking(trip.id);
  const { travelers } = useTripTravelers(editable ? trip.id : undefined);
  const proposalId = useOptionalIdeaContext()?.proposal?.id;
  usePendingGearClaim({ editable, packing, proposalId, viewerUserId });
  const announcement = useViewerClaimAnnouncement(packing.items, viewerUserId, !packing.isLoading);
  const sharedTrip = !trip.proposal && trip.archivedAt === null;
  const canStartIdea = sharedTrip && onStartPackingIdea !== undefined;
  const archived = trip.archivedAt !== null && !trip.proposal;
  const hasItems = packing.items.length > 0 || packing.isLoading;
  const claim =
    canStartIdea && viewerUserId
      ? (item: PackingItem) => onStartPackingIdea?.(item.label)
      : undefined;

  return (
    <section className="@container/gear flex flex-col gap-3" aria-labelledby="group-gear-heading">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold" id="group-gear-heading">
            Group gear
          </h3>
          <GroupGearSummary items={packing.items} />
        </div>
        {canStartIdea && hasItems ? (
          <Button
            data-testid={testIds.tripPackingChange}
            disabled={startingIdea}
            onClick={() => onStartPackingIdea?.()}
            size="sm"
            variant="outline"
          >
            <Lightbulb />
            Suggest gear changes
          </Button>
        ) : null}
      </div>
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
      {trip.proposal ? <IdeaDraftNotice trip={trip} /> : null}
      <GroupGearList
        archived={trip.archivedAt !== null}
        editable={editable}
        onClaim={claim}
        onStartIdea={canStartIdea ? () => onStartPackingIdea?.() : undefined}
        packing={packing}
        startingIdea={startingIdea}
        proposal={trip.proposal !== null}
        travelers={travelers}
        viewerUserId={viewerUserId}
      />
      {editable ? <AddGearForm empty={packing.items.length === 0} onAdd={packing.add} /> : null}
      <GroupGearFooter archived={archived} sharedTrip={sharedTrip && hasItems} />
    </section>
  );
}
