import { MAX_TRIP_BUDGET, MAX_TRIP_DAYS } from '@groam/backend/convex/modules/travel/trips/lengths';
import type { TripInformationFormState } from '@/types/trips';

/** Problems with the optional budget and length fields, keyed by the field they belong under. */
// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type TripInformationErrors = { budget?: string; totalDuration?: string };

/** Blank is fine; anything typed must pass the same rules the trip write enforces. */
export function tripInformationErrors({
  budget,
  totalDuration
}: Pick<TripInformationFormState, 'budget' | 'totalDuration'>): TripInformationErrors {
  const errors: TripInformationErrors = {};
  if (budget.trim()) {
    const amount = Number(budget);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.budget = 'Enter a budget greater than zero, or leave it blank.';
    } else if (amount > MAX_TRIP_BUDGET) {
      errors.budget = `Enter a budget of at most ${MAX_TRIP_BUDGET.toLocaleString()}.`;
    }
  }
  if (totalDuration.trim()) {
    const days = Number(totalDuration);
    if (!Number.isInteger(days) || days < 1 || days > MAX_TRIP_DAYS) {
      errors.totalDuration = `Enter a whole number of days from 1 to ${MAX_TRIP_DAYS}, or leave it blank.`;
    }
  }
  return errors;
}
