import { Minus, Plus, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import { testIds } from '@/lib/test-ids';
import type { GearTraveler, PackingItem } from '@/types/packing';
import { GroupGearPersonPicker } from './group-gear-person-picker';
import { MAX_PACKING_QUANTITY } from './packing-coverage';
import { PackingOpenSlots } from './packing-open-slots';
import { PackingPersonAvatar } from './packing-person-avatar';
import { useArrivals, useDeparting } from './use-packing-motion';

/**
 * Who brings how many of one item, as editable chips: "photo name − 1 +". The minus becomes a
 * remove cross at one, since going to none takes the person off. A picker adds another traveler.
 */
export function GroupGearBringers({
  item,
  onBring,
  travelers,
  viewerUserId
}: {
  item: PackingItem;
  onBring: (userId: string, count: number, previousCount?: number) => void;
  travelers: readonly GearTraveler[];
  viewerUserId: string | undefined;
}) {
  const arrived = useArrivals(item.bringers.map((bringer) => bringer.userId));
  const bringers = useDeparting(item.bringers, (bringer) => bringer.userId);
  const assigned = new Set(item.bringers.map((bringer) => bringer.userId));
  const others = travelers.filter(
    (traveler) => !assigned.has(traveler.userId) && traveler.userId !== viewerUserId
  );
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {bringers.map(({ item: bringer, leaving }) => (
        <div
          aria-hidden={leaving || undefined}
          aria-label={leaving ? undefined : `${bringer.name}, ${bringer.count} of this item`}
          className={cn(
            'inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/30 py-1 pe-1 ps-1 text-xs',
            arrived.has(bringer.userId) && !leaving && 'packing-pop-in',
            leaving && 'packing-pop-out'
          )}
          data-entering={arrived.has(bringer.userId) ? 'true' : undefined}
          data-leaving={leaving ? 'true' : undefined}
          inert={leaving || undefined}
          key={bringer.userId}
          role="group"
        >
          <PackingPersonAvatar image={bringer.image} name={bringer.name} />
          <span className="min-w-0 max-w-28 truncate" title={bringer.name}>
            {bringer.userId === viewerUserId ? 'You' : bringer.name}
          </span>
          {bringer.count <= 1 ? (
            <Button
              aria-label={`Remove ${bringer.name}`}
              className="pointer-coarse:size-9 hover:text-destructive"
              data-testid={testIds.tripPackingBringerRemove}
              onClick={() => onBring(bringer.userId, 0, bringer.count)}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>
          ) : (
            <Button
              aria-label={`One fewer for ${bringer.name}`}
              className="pointer-coarse:size-9"
              data-testid={testIds.tripPackingBringerDecrease}
              onClick={() => onBring(bringer.userId, bringer.count - 1)}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <Minus />
            </Button>
          )}
          <span
            aria-hidden
            className="min-w-4 text-center font-medium tabular-nums"
            data-testid={testIds.tripPackingBringerCount}
          >
            {bringer.count}
          </span>
          <Button
            aria-label={`One more for ${bringer.name}`}
            className="pointer-coarse:size-9"
            data-testid={testIds.tripPackingBringerIncrease}
            disabled={bringer.count >= MAX_PACKING_QUANTITY}
            onClick={() => onBring(bringer.userId, bringer.count + 1)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <Plus />
          </Button>
        </div>
      ))}
      <PackingOpenSlots missing={item.quantity - item.brought} />
      {others.length > 0 ? (
        <GroupGearPersonPicker
          itemLabel={item.label}
          onPick={(userId) => onBring(userId, 1)}
          travelers={others}
        />
      ) : null}
    </div>
  );
}
