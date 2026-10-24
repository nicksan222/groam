import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { listed, met, tripDays, unmet } from '#convex/modules/travel/issues/rules/helpers';

/**
 * A trip of `n` days has nights `1..n-1`, and a stay covers its check-in night up to its
 * check-out day. A one-day trip has no nights, so any one stay settles it.
 */
export const nightsCovered = defineClauseKind({
  args: {},
  category: 'stays',
  check: (_clause, facts) => {
    const days = tripDays(facts);
    if (days === undefined) return unmet('No length yet');
    if (facts.stays.length === 0) return unmet('No stays yet');
    const open: Array<number> = [];
    for (let night = 1; night < days; night += 1) {
      const covered = facts.stays.some(
        ({ schedule }) => schedule.checkInDay <= night && night < schedule.checkOutDay
      );
      if (!covered) open.push(night);
    }
    return open.length === 0 ? met : unmet(`No stay on ${listed(open, 'night')}`);
  },
  description: 'There is somewhere to sleep every night of the trip.',
  kind: 'nights_covered',
  label: () => 'Every night has a place to stay',
  needs: ['stays'],
  title: 'Every night has a stay'
});
