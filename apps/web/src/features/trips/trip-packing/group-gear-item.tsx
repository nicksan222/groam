import { RecordListItem } from '@groam/ui/components/record-list-item';
import { testIds } from '@/lib/test-ids';
import type { PackingItem } from '@/types/packing';
import { GroupGearBringerChips } from './group-gear-bringer-chips';
import { PackingClaimButton } from './packing-claim-button';
import { packingCoverage } from './packing-coverage';
import { PackingCoverageBadge } from './packing-coverage-badge';
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
    <RecordListItem
      data-testid={testIds.tripPackingGearItem}
      title={<span className="[overflow-wrap:anywhere]">{item.label}</span>}
      metadata={<PackingCoverageBadge coverage={coverage} item={item} />}
      description={<GroupGearBringerChips item={item} viewerUserId={viewerUserId} />}
      badges={
        onClaim ? (
          <PackingClaimButton
            coverageState={coverage.state}
            disabled={claimDisabled}
            itemLabel={item.label}
            more={viewerBrings}
            onClick={() => onClaim(item)}
            testId={testIds.tripPackingClaim}
          />
        ) : undefined
      }
    >
      <PackingRowFlash count={item.brought} />
    </RecordListItem>
  );
}
