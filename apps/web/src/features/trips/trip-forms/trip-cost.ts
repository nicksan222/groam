import {
  DEFAULT_TRIP_COST_SPLIT,
  TRIP_COST_SPLITS,
  type TripCostSplit,
  tripCostSplit
} from '@groam/backend/convex/modules/travel/trips/costs';
import { formatTripCost } from '@/features/trips/trip-forms/trip-currencies';

export { DEFAULT_TRIP_COST_SPLIT, TRIP_COST_SPLITS, type TripCostSplit, tripCostSplit };

export const tripCostSplitLabels: Record<TripCostSplit, string> = {
  per_person: 'Per person',
  total: 'Total for the group'
};

export function tripCostAmountLabel(label: string, split: TripCostSplit, currency?: string) {
  const kind = split === 'per_person' ? 'per person' : 'for the group';
  const withKind = `${label} ${kind}`;
  return currency ? `${withKind} (${currency})` : withKind;
}

export function tripCostInput(amount: string, split: TripCostSplit) {
  if (amount === '') return undefined;
  return { amount: Number(amount), split };
}

export function formatTripLineCost(
  amount: number,
  currency: string,
  split: TripCostSplit = DEFAULT_TRIP_COST_SPLIT
): string {
  const formatted = formatTripCost(amount, currency);
  return split === 'per_person' ? `${formatted} / person` : `${formatted} total`;
}
