import { cn } from '@groam/ui/lib/utils';
import type { PackingItem } from '@/types/packing';
import { PackingOpenSlots } from './packing-open-slots';
import { PackingPersonAvatar } from './packing-person-avatar';
import { useArrivals } from './use-packing-motion';

const VISIBLE_FACES = 4;

/**
 * Who brings an item, read-only, as the filled seats of its row: a face per person (with "×2"
 * when they bring more than one; the name is on hover), the first few only, then "+N", and a dashed
 * seat for every piece still missing. Screen readers get the full list as one sentence.
 */
export function GroupGearBringerChips({
  item,
  viewerUserId
}: {
  item: PackingItem;
  viewerUserId: string | undefined;
}) {
  const arrived = useArrivals(item.bringers.map((bringer) => bringer.userId));
  const missing = item.quantity - item.brought;
  const shown = item.bringers.slice(0, VISIBLE_FACES);
  const hidden = item.bringers.slice(VISIBLE_FACES);
  const full = item.bringers
    .map((bringer) => `${bringer.userId === viewerUserId ? 'You' : bringer.name} ${bringer.count}`)
    .join(' · ');
  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center gap-1 md:w-44 md:flex-none md:shrink-0"
      title={full || undefined}
    >
      {item.bringers.length === 0 ? (
        <span className="sr-only">Nobody&apos;s bringing this yet</span>
      ) : (
        <span className="sr-only">{full}</span>
      )}
      {shown.map((bringer) => (
        <span
          aria-hidden
          className={cn(
            'inline-flex shrink-0 items-center gap-1 text-xs',
            arrived.has(bringer.userId) && 'packing-pop-in'
          )}
          data-entering={arrived.has(bringer.userId) ? 'true' : undefined}
          key={bringer.userId}
          title={bringer.userId === viewerUserId ? 'You' : bringer.name}
        >
          <PackingPersonAvatar
            className={bringer.userId === viewerUserId ? 'ring-2 ring-primary/40' : undefined}
            image={bringer.image}
            name={bringer.name}
          />
          {bringer.count > 1 ? (
            <span className="text-muted-foreground tabular-nums">×{bringer.count}</span>
          ) : null}
        </span>
      ))}
      {hidden.length > 0 ? (
        <span
          aria-hidden
          className="inline-flex items-center rounded-full bg-muted px-2 text-xs text-muted-foreground tabular-nums"
        >
          +{hidden.length}
        </span>
      ) : null}
      <PackingOpenSlots missing={missing} />
    </div>
  );
}
