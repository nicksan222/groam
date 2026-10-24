import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { testIds } from '@/lib/test-ids';
import type { PackingItem } from '@/types/packing';
import { GroupGearBringerChips } from './group-gear-bringer-chips';
import { PackingCount } from './packing-count';
import { packingCoverage } from './packing-coverage';
import { PackingRowFlash } from './packing-row-flash';

/**
 * One line of the gear sheet: the name with how many it needs, a seat for every piece (a face
 * where someone brings it, a dashed circle where nobody does yet), and the row's actions at the
 * right. Items that still need someone read in full strength; covered ones settle back.
 */
export function GearSheetRow({
  actions,
  item,
  tone,
  viewerUserId
}: {
  actions?: ReactNode;
  item: PackingItem;
  tone: 'open' | 'covered';
  viewerUserId: string | undefined;
}) {
  const coverage = packingCoverage(item);
  const open = tone === 'open';
  return (
    <li
      className="group/row relative isolate flex min-h-12 [contain-intrinsic-size:auto_3rem] [content-visibility:auto] flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 px-4 py-2 text-[13.5px] last:border-b-0 hover:bg-accent/40 md:px-6"
      data-testid={testIds.tripPackingGearItem}
    >
      <div className="flex min-w-0 basis-full items-baseline gap-2 md:flex-1 md:basis-48">
        <span
          className={cn('min-w-0 truncate', open ? 'font-medium' : 'text-muted-foreground')}
          title={item.label}
        >
          {item.label}
        </span>
        <span
          className="shrink-0 text-xs text-muted-foreground tabular-nums"
          data-testid={testIds.tripPackingCoverage}
        >
          <PackingCount>{item.brought}</PackingCount> of{' '}
          <PackingCount>{item.quantity}</PackingCount>
          {coverage.state === 'over' ? ` · ${coverage.label}` : null}
        </span>
        {item.brought === 0 ? <span className="sr-only">needed · nobody yet</span> : null}
      </div>
      <GroupGearBringerChips item={item} viewerUserId={viewerUserId} />
      {actions ? (
        <div className="ml-auto flex shrink-0 items-center justify-end gap-1 md:min-w-32">
          {actions}
        </div>
      ) : null}
      <PackingRowFlash count={item.brought} />
    </li>
  );
}
