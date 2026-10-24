import { MAX_PACKING_LABEL_LENGTH } from '@groam/backend/convex/modules/travel/packing/lengths';
import { Trash2 } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { FormSection } from '@groam/ui/components/form-section';
import { Input } from '@groam/ui/components/input';
import { NumberInput } from '@groam/ui/components/number-input';
import { type KeyboardEvent, useRef, useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { GearTraveler, PackingItem } from '@/types/packing';
import { GroupGearBringers } from './group-gear-bringers';
import { MAX_PACKING_QUANTITY } from './packing-coverage';

/**
 * The fields inside a gear item's "⋯" menu: the name and needed count commit on blur or Enter
 * (Escape reverts), bringers step up and down, and the item can be removed.
 */
export function GroupGearEditFields({
  bring,
  item,
  onRemove,
  onUpdate,
  pending,
  travelers,
  viewerUserId
}: {
  /** Changes one traveler's count by a delta, coalescing quick taps. */
  bring: (userId: string, delta: number) => void;
  item: PackingItem;
  onRemove: () => void;
  onUpdate: (changes: { label?: string; quantity?: number }) => Promise<unknown>;
  pending: boolean;
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
  const save = async (changes: { label?: string; quantity?: number }) => {
    const result = await onUpdate(changes);
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
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <Input
        aria-label={`Name of ${item.label}`}
        className="font-medium"
        maxLength={MAX_PACKING_LABEL_LENGTH}
        onBlur={commitLabel}
        onChange={(event) => setDraft((d) => ({ ...d, label: event.target.value }))}
        onKeyDown={commitOnEnter}
        title={label}
        value={label}
      />
      <div className="flex items-center justify-between gap-3" onBlur={commitQuantity}>
        <span aria-hidden className="text-sm text-muted-foreground">
          How many the group needs
        </span>
        <NumberInput
          className="w-20 pointer-coarse:h-9"
          label={`Needed for ${item.label}`}
          max={MAX_PACKING_QUANTITY}
          min={1}
          onChange={(value) => setDraft((d) => ({ ...d, quantity: value }))}
          value={quantity}
        />
      </div>
      <FormSection legend="Who brings it">
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
      </FormSection>
      <Button
        aria-label={`Remove ${item.label}`}
        className="self-start text-destructive hover:text-destructive"
        data-testid={testIds.tripPackingGearRemove}
        disabled={pending}
        onClick={onRemove}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Trash2 />
        Remove item
      </Button>
    </div>
  );
}
