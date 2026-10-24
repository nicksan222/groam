import { Users } from '@groam/icons';
import type { PackingItem } from '@/types/packing';
import { PackingCount } from './packing-count';

/**
 * What the viewer signed up to bring for the group, as read-only lines at the top of their bag.
 * The sheet is where a claim changes, so these carry no tick.
 */
export function PackingBagGroupItems({
  items,
  viewerUserId
}: {
  items: readonly PackingItem[];
  viewerUserId: string | undefined;
}) {
  const mine = items.flatMap((item) => {
    const count = item.bringers.find((bringer) => bringer.userId === viewerUserId)?.count ?? 0;
    return count > 0 ? [{ count, id: item.id, label: item.label }] : [];
  });
  if (mine.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Users aria-hidden className="size-3 shrink-0" />
        Bringing for the group
      </p>
      <ul aria-label="Bringing for the group" className="m-0 list-none p-0">
        {mine.map((entry) => (
          <li className="flex items-baseline gap-2 py-1 text-[13.5px]" key={entry.id}>
            <span className="min-w-0 truncate">{entry.label}</span>
            {entry.count > 1 ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                ×<PackingCount>{entry.count}</PackingCount>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
