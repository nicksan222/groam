import type { TripDetail } from '@/features/trips/hooks/use-trips';

const formatters = new Map<string, Intl.NumberFormat>();

/** An amount in the trip's currency; whole amounts carry no decimals ("MX$29,810"). */
function formatAmount(amount: number, currency: string): string {
  const whole = Number.isInteger(amount);
  const key = `${currency}:${whole}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(undefined, {
      currency,
      maximumFractionDigits: whole ? 0 : 2,
      minimumFractionDigits: whole ? 0 : 2,
      style: 'currency'
    });
    formatters.set(key, formatter);
  }
  return formatter.format(amount);
}

/**
 * The plan's cost for a header line: "MX$29,810 of MX$62,400 planned", flagged when it runs over
 * the budget; nothing until there is a number.
 */
export function budgetSummary(
  trip: Pick<TripDetail, 'currency' | 'initialBudget' | 'totalPlannedCost'>
) {
  const { currency, initialBudget, totalPlannedCost } = trip;
  if (initialBudget === null && totalPlannedCost <= 0) return undefined;
  const planned = formatAmount(totalPlannedCost, currency);
  if (initialBudget === null) return `${planned} planned`;
  const summary = `${planned} of ${formatAmount(initialBudget, currency)} planned`;
  return totalPlannedCost > initialBudget ? `${summary}, over budget` : summary;
}

/**
 * What the plan costs per person who is going: "≈ $9,937.50 planned per traveler". Nothing until
 * a cost is planned and somebody is going. The count is the one the plan was priced with.
 */
export function plannedPerTravelerLabel(
  trip: Pick<TripDetail, 'currency' | 'totalPlannedCost' | 'travelerCount'>
) {
  if (trip.totalPlannedCost <= 0 || trip.travelerCount <= 0) return undefined;
  const share = Math.round((trip.totalPlannedCost / trip.travelerCount) * 100) / 100;
  return `≈ ${formatAmount(share, trip.currency)} planned per traveler`;
}
