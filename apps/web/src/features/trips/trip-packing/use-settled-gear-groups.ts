import { type FocusEvent, useEffect, useRef, useState } from 'react';
import type { PackingItem } from '@/types/packing';
import { packingCoverage } from './packing-coverage';

/** Focus still counts as inside while it sits in the list or in a row's own edit popover. */
function focusInside(list: HTMLElement | null) {
  const active = document.activeElement;
  if (!list || !active || active === document.body) return false;
  return list.contains(active) || active.closest('[data-gear-hold]') !== null;
}

function samePlacement(
  a: ReadonlyMap<PackingItem['id'], boolean>,
  b: ReadonlyMap<PackingItem['id'], boolean>
) {
  if (a.size !== b.size) return false;
  for (const [id, open] of a) if (b.get(id) !== open) return false;
  return true;
}

/**
 * Splits gear into what still needs someone and what is covered. While focus is inside the
 * list or a row's edit popover, an item keeps the group it had, so a row never jumps away from the control being used;
 * it settles into its new group once focus leaves.
 */
export function useSettledGearGroups(items: readonly PackingItem[]) {
  const [holding, setHolding] = useState(false);
  const [placed, setPlaced] = useState<ReadonlyMap<PackingItem['id'], boolean>>(() => new Map());
  const next = new Map<PackingItem['id'], boolean>();
  for (const item of items) {
    const kept = holding ? placed.get(item.id) : undefined;
    next.set(item.id, kept ?? packingCoverage(item).state === 'missing');
  }
  if (!samePlacement(next, placed)) setPlaced(next);
  const listRef = useRef<HTMLDivElement>(null);
  // A focused control can vanish (a claim hides "I'll bring one") without any blur event.
  useEffect(() => {
    // oxlint-disable-next-line react-doctor/no-adjust-state-on-prop-change -- A claim can remove the focused control without blur; reconcile DOM focus, not data-derived state.
    if (holding && !focusInside(listRef.current)) setHolding(false);
  }, [holding, items]);

  return {
    covered: items.filter((item) => next.get(item.id) === false),
    focusProps: {
      onBlur: (event: FocusEvent<HTMLElement>) => {
        const next = event.relatedTarget;
        if (!event.currentTarget.contains(next) && !next?.closest('[data-gear-hold]')) {
          setHolding(false);
        }
      },
      onFocus: () => setHolding(true),
      ref: listRef
    },
    open: items.filter((item) => next.get(item.id) === true)
  };
}
