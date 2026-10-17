import { cn } from '@groam/ui/lib/utils';
import { testIds } from '@/lib/test-ids';
import type { PackingItem } from '@/types/packing';
import { GroupGearBringerChips } from './group-gear-bringer-chips';
import { PackingClaimButton } from './packing-claim-button';
import { packingCoverage } from './packing-coverage';
import { PackingCoverageBadge } from './packing-coverage-badge';
import { packingRowClass, packingRowDeferredClass } from './packing-row-classes';
import { PackingRowFlash } from './packing-row-flash';

/**
 * One shared gear item, read-only. Reads left to right: the item and who brings it, then how
 * covered it is, then the one action. Only rows that still need gear get the outlined action.
 */
export function GroupGearItem({
  claimDisabled = false,
  item,
  onClaim,
  viewerUserId
}: {
  /** Another claim is already starting an idea. */
  claimDisabled?: boolean;
  item: PackingItem;
  /** Starts an idea with one more of this item claimed for the viewer. */
  onClaim?: (item: PackingItem) => void;
  viewerUserId: string | undefined;
}) {
  const coverage = packingCoverage(item);
  const viewerBrings = item.bringers.some((bringer) => bringer.userId === viewerUserId);
  return (
    <li
      className={cn(
        packingRowClass,
        packingRowDeferredClass,
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'
      )}
      data-testid={testIds.tripPackingGearItem}
    >
      <PackingRowFlash count={item.brought} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium [overflow-wrap:anywhere]">{item.label}</p>
        <div className="mt-1">
          <GroupGearBringerChips item={item} viewerUserId={viewerUserId} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:flex-nowrap sm:justify-end">
        <PackingCoverageBadge coverage={coverage} item={item} />
        {onClaim ? (
          <PackingClaimButton
            coverageState={coverage.state}
            disabled={claimDisabled}
            itemLabel={item.label}
            more={viewerBrings}
            onClick={() => onClaim(item)}
            testId={testIds.tripPackingClaim}
          />
        ) : null}
      </div>
    </li>
  );
}
