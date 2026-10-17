import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import {
  listed,
  met,
  tripDayList,
  tripDays,
  unmet
} from '#convex/modules/travel/issues/rules/helpers';

export const daysAssigned = defineClauseKind({
  args: {},
  category: 'destinations',
  check: (_clause, facts) => {
    const days = tripDayList(tripDays(facts));
    if (days === undefined) return unmet('No length yet');
    const open = days.filter(
      (day) =>
        !facts.destinations.some(
          ({ schedule }) => schedule && schedule.startDay <= day && day <= schedule.endDay
        )
    );
    return open.length === 0 ? met : unmet(`No place on ${listed(open, 'day')}`);
  },
  description: 'Every day of the trip belongs to a destination.',
  kind: 'days_assigned',
  label: () => 'Every day of the trip has a destination',
  needs: ['destinations'],
  title: 'Every day has a place'
});
