import { testIds } from '@/lib/test-ids';
import type { PackingItem } from '@/types/packing';
import { GearSheetRow } from './gear-sheet-row';
import { PackingClaimButton } from './packing-claim-button';
import { packingCoverage } from './packing-coverage';

/**
 * One shared gear item, read-only: a sheet line with "I'll bring one" while it needs someone,
 * quieter once covered.
 */
export function GroupGearItem({
  claimDisabled = false,
  item,
  onClaim,
  tone,
  viewerUserId
}: {
  /** Another claim is already starting an idea. */
  claimDisabled?: boolean;
  item: PackingItem;
  /** Starts an idea with one more of this item claimed for the viewer. */
  onClaim?: (item: PackingItem) => void;
  /** Which group the row sits in; settles from coverage when not given. */
  tone?: 'open' | 'covered';
  viewerUserId: string | undefined;
}) {
  const coverage = packingCoverage(item);
  const viewerBrings = item.bringers.some((bringer) => bringer.userId === viewerUserId);
  const claim = onClaim ? (
    <PackingClaimButton
      coverageState={coverage.state}
      disabled={claimDisabled}
      itemLabel={item.label}
      more={viewerBrings}
      onClick={() => onClaim(item)}
      testId={testIds.tripPackingClaim}
    />
  ) : undefined;
  const settled = tone ?? (coverage.state === 'missing' ? 'open' : 'covered');
  return <GearSheetRow actions={claim} item={item} tone={settled} viewerUserId={viewerUserId} />;
}
