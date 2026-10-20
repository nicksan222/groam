import { cn } from '@groam/ui/lib/utils';
import type { PackingItem } from '@/types/packing';
import { PackingPersonAvatar } from './packing-person-avatar';
import { useArrivals } from './use-packing-motion';

const VISIBLE_CHIPS = 3;

function chipName(bringer: PackingItem['bringers'][number], viewerUserId: string | undefined) {
  return bringer.userId === viewerUserId ? 'You' : (bringer.name.split(/\s+/)[0] ?? bringer.name);
}

/**
 * Who brings an item, read-only: a chip per person (photo or initials, first name, count when
 * more than one), the first few only, then "+N". Screen readers get the full list as one sentence.
 */
export function GroupGearBringerChips({
  item,
  viewerUserId
}: {
  item: PackingItem;
  viewerUserId: string | undefined;
}) {
  const arrived = useArrivals(item.bringers.map((bringer) => bringer.userId));
  if (item.bringers.length === 0) {
    return (
      <p className="truncate text-xs text-muted-foreground">
        <span className="@md/record:hidden" aria-hidden>
          Unclaimed
        </span>
        <span className="sr-only @md/record:not-sr-only">Nobody&apos;s bringing this yet</span>
      </p>
    );
  }
  const shown = item.bringers.slice(0, VISIBLE_CHIPS);
  const hidden = item.bringers.slice(VISIBLE_CHIPS);
  const full = item.bringers
    .map((bringer) => `${bringer.userId === viewerUserId ? 'You' : bringer.name} ${bringer.count}`)
    .join(' · ');
  return (
    <div className="flex flex-wrap items-center gap-1" title={full}>
      <span className="sr-only">{full}</span>
      {shown.map((bringer) => (
        <span
          aria-hidden
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap pe-2 text-xs',
            arrived.has(bringer.userId) && 'packing-pop-in'
          )}
          data-entering={arrived.has(bringer.userId) ? 'true' : undefined}
          key={bringer.userId}
        >
          <PackingPersonAvatar image={bringer.image} name={bringer.name} />
          <span className="max-w-20 truncate">{chipName(bringer, viewerUserId)}</span>
          {bringer.count > 1 ? (
            <span className="text-muted-foreground tabular-nums">×{bringer.count}</span>
          ) : null}
        </span>
      ))}
      {hidden.length > 0 ? (
        <span
          aria-hidden
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums"
        >
          +{hidden.length}
        </span>
      ) : null}
    </div>
  );
}
