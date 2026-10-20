import { Lightbulb, Package } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import type { useTripPacking } from '@/features/trips/hooks/use-trip-packing';
import { testIds } from '@/lib/test-ids';
import type { GearTraveler, PackingItem } from '@/types/packing';
import { GroupGearItem } from './group-gear-item';
import { GroupGearItemEditor } from './group-gear-item-editor';
import { GroupGearSkeleton } from './group-gear-skeleton';
import { packingRowDeferredClass } from './packing-row-classes';

function emptyCopy(editable: boolean, proposal: boolean, canStart: boolean, archived: boolean) {
  if (editable) {
    return {
      body: 'Add what the whole group shares, like a tent or a hair dryer.',
      title: 'Start the group list'
    };
  }
  if (proposal) {
    return {
      body: 'This idea does not list any shared gear.',
      title: 'No shared gear in this idea'
    };
  }
  if (archived) {
    return {
      body: 'Nobody listed shared gear before this trip was archived.',
      title: 'No group gear'
    };
  }
  if (canStart) {
    return {
      body: 'Shared gear, like a tent or a first-aid kit, lands here with who is bringing it. Suggest the first items through an idea so everyone can weigh in.',
      title: 'Nothing on the group list yet'
    };
  }
  return {
    body: 'Shared gear will show up here once someone suggests it.',
    title: 'Nothing on the group list yet'
  };
}

/** The group gear rows: read-only on the shared trip, editable in an author's idea. */
export function GroupGearList({
  archived = false,
  editable,
  onClaim,
  onStartIdea,
  packing,
  startingIdea = false,
  proposal,
  travelers,
  viewerUserId
}: {
  archived?: boolean;
  editable: boolean;
  onClaim?: (item: PackingItem) => void;
  /** Starts an idea; shown in the empty state of the shared trip. */
  onStartIdea?: () => void;
  packing: ReturnType<typeof useTripPacking>;
  proposal: boolean;
  startingIdea?: boolean;
  travelers: readonly GearTraveler[];
  viewerUserId: string | undefined;
}) {
  if (packing.isLoading) return <GroupGearSkeleton />;
  if (packing.items.length === 0) {
    const copy = emptyCopy(editable, proposal, onStartIdea !== undefined, archived);
    return (
      <DashedEmpty
        action={
          onStartIdea ? (
            <Button
              className="mt-4"
              data-testid={testIds.tripPackingChange}
              disabled={startingIdea}
              onClick={onStartIdea}
              size="sm"
              variant="outline"
            >
              <Lightbulb />
              Suggest gear
            </Button>
          ) : null
        }
        className="p-8"
        icon={Package}
        title={copy.title}
      >
        {copy.body}
      </DashedEmpty>
    );
  }
  return (
    <ul
      aria-label="Group gear"
      className="-mx-4 min-w-0 divide-y divide-border/40 overflow-hidden bg-transparent"
    >
      {packing.items.map((item) =>
        editable ? (
          <li className={`min-w-0 ${packingRowDeferredClass}`} key={item.id}>
            <GroupGearItemEditor
              item={item}
              onBring={packing.bring}
              onRemove={packing.remove}
              onUpdate={packing.update}
              travelers={travelers}
              viewerUserId={viewerUserId}
            />
          </li>
        ) : (
          <li className={`min-w-0 ${packingRowDeferredClass}`} key={item.id}>
            <GroupGearItem
              claimDisabled={startingIdea}
              item={item}
              onClaim={onClaim}
              viewerUserId={viewerUserId}
            />
          </li>
        )
      )}
    </ul>
  );
}
