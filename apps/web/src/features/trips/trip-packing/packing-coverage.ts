import type { PackingCoverage } from '@/types/packing';

export function packingCoverage(item: { brought: number; quantity: number }): PackingCoverage {
  const gap = item.quantity - item.brought;
  if (gap > 0) return { amount: gap, label: `Need ${gap} more`, state: 'missing' };
  if (gap < 0) return { amount: -gap, label: `${-gap} spare`, state: 'over' };
  return { amount: 0, label: 'Covered', state: 'covered' };
}

/** Items with nobody missing; the packing sections and the assistant both report this. */
export function coveredCount(items: ReadonlyArray<{ brought: number; quantity: number }>): number {
  return items.filter((item) => item.brought >= item.quantity).length;
}

export const MAX_PACKING_QUANTITY = 99;
