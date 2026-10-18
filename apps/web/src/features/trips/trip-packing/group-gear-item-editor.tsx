import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import { NumberInput } from '@groam/ui/components/number-input';
import { cn } from '@groam/ui/lib/utils';
import { Trash2 } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { GearTraveler, PackingItem } from '@/types/packing';
import { GroupGearBringers } from './group-gear-bringers';
import { PackingClaimButton } from './packing-claim-button';
import { MAX_PACKING_QUANTITY, packingCoverage } from './packing-coverage';
import { PackingCoverageBadge } from './packing-coverage-badge';
import { packingRowClass } from './packing-row-classes';
import { PackingRowFlash } from './packing-row-flash';
import { useCoalescedBring, usePendingWrite } from './use-packing-motion';

/** Reads as text until hovered or focused, but stays a real, labelled input. */
const quietField =
  'border-transparent bg-transparent shadow-none hover:border-input focus-visible:bg-background dark:bg-transparent dark:focus-visible:bg-background';

/**
 * One shared gear item inside an idea. It reads like the shared row (name, who brings it,
 * coverage, "I'll bring one") with edit affordances: name and need are quiet inline inputs,
 * bringers are steppers, and removing is a trailing icon.
 */
export function GroupGearItemEditor({
  item,
  onBring,
  onRemove,
  onUpdate,
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
  travelers: readonly GearTraveler[];
  viewerUserId: string | undefined;
}) {
  // What the person typed, kept only while it differs from the saved item: the row is keyed by
  // item id, so a server echo never remounts it and focus stays where it was.
  const [draft, setDraft] = useState<{ label?: string; quantity?: number }>({});
  const label = draft.label ?? item.label;
  const quantity = draft.quantity ?? item.quantity;
  if (
    (draft.label !== undefined && draft.label === item.label) ||
    (draft.quantity !== undefined && draft.quantity === item.quantity)
  ) {
    setDraft({
      label: draft.label === item.label ? undefined : draft.label,
      quantity: draft.quantity === item.quantity ? undefined : draft.quantity
    });
  }
  const { pending, run } = usePendingWrite();
  const [claiming, setClaiming] = useState(false);
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

  const save = async (changes: { label?: string; quantity?: number }) => {
    const result = await run(() => onUpdate(item.id, changes));
    // A refused write puts the saved value back instead of leaving the unsaved one on screen.
    if (result === false) setDraft({});
  };
  const cancelled = useRef(false);
  const commitLabel = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = label.trim();
    if (!next || next === item.label) setDraft((d) => ({ ...d, label: undefined }));
    else {
      setDraft((d) => ({ ...d, label: next }));
      void save({ label: next });
    }
  };
  const commitQuantity = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    if (!Number.isFinite(quantity)) {
      setDraft((d) => ({ ...d, quantity: undefined }));
      return;
    }
    const next = Math.min(MAX_PACKING_QUANTITY, Math.max(1, Math.round(quantity)));
    if (next === item.quantity) setDraft((d) => ({ ...d, quantity: undefined }));
    else {
      setDraft((d) => ({ ...d, quantity: next }));
      void save({ quantity: next });
    }
  };
  const commitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      cancelled.current = true;
      setDraft({});
      event.currentTarget.blur();
    }
  };

  return (
    <li
      aria-busy={pending || undefined}
      className={cn(
        packingRowClass,
        'flex flex-col gap-2 aria-busy:opacity-70 aria-busy:transition-opacity aria-busy:delay-200'
      )}
      data-testid={testIds.tripPackingGearItem}
    >
      <PackingRowFlash count={item.brought} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Input
          aria-label={`Name of ${item.label}`}
          className={cn(
            '-ms-3 min-w-40 flex-1 font-medium max-sm:w-[calc(100%+0.75rem)]',
            quietField
          )}
          maxLength={120}
          onBlur={commitLabel}
          onChange={(event) => setDraft((d) => ({ ...d, label: event.target.value }))}
          onKeyDown={commitOnEnter}
          title={label}
          value={label}
        />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:flex-nowrap sm:justify-end">
          <PackingCoverageBadge coverage={coverage} item={item} />
          <div className="flex sm:w-32 sm:justify-end">
            {viewerFree ? (
              <PackingClaimButton
                coverageState={coverage.state}
                disabled={pending}
                itemLabel={item.label}
                onClick={() => {
                  setClaiming(true);
                  void run(() => onBring(item.id, viewerUserId, 1)).finally(() =>
                    setClaiming(false)
                  );
                }}
                pending={pending && claiming}
                testId={testIds.tripPackingBringMe}
              />
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <GroupGearBringers
          item={item}
          onBring={(userId, count) =>
            bring(
              userId,
              count - (item.bringers.find((bringer) => bringer.userId === userId)?.count ?? 0)
            )
          }
          travelers={travelers}
          viewerUserId={viewerUserId}
        />
        <div className="flex shrink-0 items-center gap-1" onBlur={commitQuantity}>
          <span aria-hidden className="text-xs text-muted-foreground">
            Need
          </span>
          <NumberInput
            className={cn('w-16 pointer-coarse:h-9', quietField)}
            label={`Needed for ${item.label}`}
            max={MAX_PACKING_QUANTITY}
            min={1}
            onChange={(value) => setDraft((d) => ({ ...d, quantity: value }))}
            value={quantity}
          />
          <Button
            aria-label={`Remove ${item.label}`}
            className="pointer-coarse:size-9"
            data-testid={testIds.tripPackingGearRemove}
            disabled={pending}
            onClick={() => void run(() => onRemove(item))}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </li>
  );
}
