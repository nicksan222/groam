import type { Infer } from 'convex/values';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { RuleValidators } from '#convex/modules/travel/issues/rules/schema';
import { tripDurationDays } from '#convex/modules/travel/trips/duration';

export type ConditionCheck = Infer<typeof RuleValidators.tripCheck>;

/** What the starter checks read; rule facts (`rules/types.ts`) carry these and more. */
export type ConditionFacts = {
  activities: Array<{ destinationId: Id<'tripDestinations'> }>;
  destinations: Array<{ _id: Id<'tripDestinations'> }>;
  packing: ReadonlyArray<unknown>;
  stays: Array<{ schedule: { checkInDay: number; checkOutDay: number } }>;
  trip: Pick<Doc<'trips'>, 'budget' | 'destination' | 'duration' | 'startDate'>;
};

/**
 * Is the check satisfied by the trip as it is now?
 *
 * - `destination`: the trip has a known destination.
 * - `dates`: the trip has a start date. Free-text date notes do not count.
 * - `duration`: the trip has a length (total, ideal, or minimum days).
 * - `stays`: the length is known, there is at least one stay, and every night is covered. Day `d`
 *   is the `d`-th day of the trip, a stay covers the nights from its check-in day up to (not
 *   including) its check-out day, and a trip of `n` days has nights `1..n-1`. A one-day trip has
 *   no nights, so one stay of any kind settles it. Without a length no night can be judged, so
 *   the check is not met.
 * - `budget`: the group set a budget.
 * - `packing`: the packing list has at least one item.
 * - `activities`: there is at least one destination, and every destination has an activity.
 */
export function conditionMet(check: ConditionCheck, facts: ConditionFacts): boolean {
  const { activities, destinations, packing, stays, trip } = facts;
  switch (check) {
    case 'activities': {
      return (
        destinations.length > 0 &&
        destinations.every(({ _id }) => activities.some((item) => item.destinationId === _id))
      );
    }
    case 'budget': {
      return trip.budget !== undefined;
    }
    case 'packing': {
      return packing.length > 0;
    }
    case 'destination': {
      return trip.destination.status === 'known';
    }
    case 'dates': {
      return trip.startDate !== undefined;
    }
    case 'duration': {
      return tripDurationDays(trip) !== undefined;
    }
    case 'stays': {
      const days = tripDurationDays(trip);
      if (days === undefined || stays.length === 0) return false;
      for (let night = 1; night < days; night += 1) {
        const covered = stays.some(
          ({ schedule }) => schedule.checkInDay <= night && night < schedule.checkOutDay
        );
        if (!covered) return false;
      }
      return true;
    }
  }
}
