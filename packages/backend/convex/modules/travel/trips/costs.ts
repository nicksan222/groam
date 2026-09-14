import { v } from 'convex/values';

export const TRIP_COST_SPLITS = ['total', 'per_person'] as const;

export type TripCostSplit = (typeof TRIP_COST_SPLITS)[number];
export const DEFAULT_TRIP_COST_SPLIT = 'total' satisfies TripCostSplit;

export const tripCostSplitValidator = v.union(v.literal('total'), v.literal('per_person'));

export function tripCostSplit(value: string | undefined): TripCostSplit {
  return value === 'per_person' ? 'per_person' : DEFAULT_TRIP_COST_SPLIT;
}

export function costsMatch(
  left: { amount: number; split?: TripCostSplit } | undefined,
  right: { amount: number; split?: TripCostSplit } | undefined
): boolean {
  if (left === undefined || right === undefined) return left === right;
  return left.amount === right.amount && tripCostSplit(left.split) === tripCostSplit(right.split);
}

export function plannedCostAmount(
  cost: { amount: number; split?: TripCostSplit } | undefined,
  travelerCount: number
): number {
  if (!cost) return 0;
  const travelers = Math.max(1, travelerCount);
  return tripCostSplit(cost.split) === 'per_person' ? cost.amount * travelers : cost.amount;
}
