import { useEffect, useRef, useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { GearTraveler, PackingItem } from '@/types/packing';
import { GearSheetRow } from './gear-sheet-row';
import { GroupGearEditFields } from './group-gear-edit-fields';
import { GroupGearEditMenu } from './group-gear-edit-menu';
import { GroupGearPersonPicker } from './group-gear-person-picker';
import { PackingClaimButton } from './packing-claim-button';
import { packingCoverage } from './packing-coverage';
import { useCoalescedBring, usePendingWrite } from './use-packing-motion';

/**
 * One shared gear item inside an idea. It reads exactly like the shared row (a sheet line,
 * quieter once covered); renaming, the need, bringers and removing sit behind
 * its "⋯" menu, and "I'll bring one" and "Add a person" stay on the tile.
 */
export function GroupGearItemEditor({
  item,
  onBring,
  onRemove,
  onUpdate,
  tone,
  travelers,
  viewerUserId
}: {
  item: PackingItem;
  onBring: (
    itemId: PackingItem['id'],
    userId: string,
    count: number,
    previousCount?: number
  ) => void | Promise<unknown>;
  onRemove: (item: PackingItem) => void | Promise<unknown>;
  onUpdate: (
    itemId: PackingItem['id'],
    changes: { label?: string; quantity?: number }
  ) => void | Promise<unknown>;
  /** Which group the row sits in; settles from coverage when not given. */
  tone?: 'open' | 'covered';
  travelers: readonly GearTraveler[];
  viewerUserId: string | undefined;
}) {
  const { pending, run } = usePendingWrite();
  // Which kind of write started last, so only the claim button spins for a claim.
  const [writeKind, setWriteKind] = useState<'claim' | 'edit'>('edit');
  const latest = useRef(item);
  useEffect(() => {
    latest.current = item;
  });
  const bring = useCoalescedBring(
    (userId, count, previousCount) => onBring(item.id, userId, count, previousCount),
    (userId) => latest.current.bringers.find((bringer) => bringer.userId === userId)?.count ?? 0
  );
  const coverage = packingCoverage(item);
  const viewerFree =
    viewerUserId !== undefined && !item.bringers.some((bringer) => bringer.userId === viewerUserId);

  const assigned = new Set(item.bringers.map((bringer) => bringer.userId));
  const others = travelers.filter(
    (traveler) => !assigned.has(traveler.userId) && traveler.userId !== viewerUserId
  );
  const claim =
    viewerFree && viewerUserId !== undefined ? (
      <PackingClaimButton
        coverageState={coverage.state}
        disabled={pending}
        itemLabel={item.label}
        onClick={() => {
          void run(async () => {
            setWriteKind('claim');
            await onBring(item.id, viewerUserId, 1);
          });
        }}
        pending={pending && writeKind === 'claim'}
        testId={testIds.tripPackingBringMe}
      />
    ) : null;
  const menu = (
    <GroupGearEditMenu itemLabel={item.label}>
      <GroupGearEditFields
        bring={bring}
        item={item}
        onRemove={() => {
          void run(async () => {
            setWriteKind('edit');
            await onRemove(item);
          });
        }}
        onUpdate={async (changes) => {
          const outcome = await run(async () => {
            setWriteKind('edit');
            return onUpdate(item.id, changes);
          });
          // The editor reverts its draft on `false`: a refused write and a dropped one both count.
          return outcome.status === 'ok' ? outcome.value : false;
        }}
        pending={pending}
        travelers={travelers}
        viewerUserId={viewerUserId}
      />
    </GroupGearEditMenu>
  );

  const settled = tone ?? (coverage.state === 'missing' ? 'open' : 'covered');
  return (
    <GearSheetRow
      actions={
        settled === 'open' ? (
          <>
            {others.length > 0 ? (
              <GroupGearPersonPicker
                itemLabel={item.label}
                onPick={(userId) => bring(userId, 1)}
                travelers={others}
              />
            ) : null}
            {claim}
            {menu}
          </>
        ) : (
          menu
        )
      }
      item={item}
      tone={settled}
      viewerUserId={viewerUserId}
    />
  );
}
