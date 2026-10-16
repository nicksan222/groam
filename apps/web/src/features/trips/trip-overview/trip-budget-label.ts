import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { formatTripCost } from '@/features/trips/trip-forms/trip-currencies';

/** Planned cost, with the budget after a slash when the group set one. */
export function budgetLabel(
  trip: Pick<TripDetail, 'currency' | 'initialBudget' | 'totalPlannedCost'>
) {
  const planned = formatTripCost(trip.totalPlannedCost, trip.currency);
  if (trip.initialBudget === null) return planned;
  return `${planned} / ${formatTripCost(trip.initialBudget, trip.currency)}`;
}

/**
 * The plan's cost for a section header's badge, flagged when it runs over the budget; nothing
 * until there is a number.
 */
export function budgetBadge(
  trip: Pick<TripDetail, 'currency' | 'initialBudget' | 'totalPlannedCost'>
) {
  const { initialBudget, totalPlannedCost } = trip;
  if (initialBudget === null && totalPlannedCost <= 0) return undefined;
  if (initialBudget === null) return `${budgetLabel(trip)} planned`;
  const over = totalPlannedCost > initialBudget;
  return `${budgetLabel(trip)} ${over ? 'over budget' : 'budget'}`;
}
