import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import { listed, met, unmet } from '#convex/modules/travel/issues/rules/helpers';
import type { RuleFacts } from '#convex/modules/travel/issues/rules/types';

const minutes = (time: string) => {
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  return hours * 60 + mins;
};

/** Timed one-day activities overlap when one starts before the other ends; no end is a moment. */
function conflictDays(activities: RuleFacts['activities']): Array<number> {
  const timed = activities.flatMap((activity) => {
    const { day, endDay, endTime, startTime } = activity.schedule;
    if (!startTime || (endDay !== undefined && endDay !== day)) return [];
    const start = minutes(startTime);
    return [{ day, end: endTime ? Math.max(minutes(endTime), start + 1) : start + 1, start }];
  });
  const clashing = new Set<number>();
  for (const [index, left] of timed.entries()) {
    for (const right of timed.slice(index + 1)) {
      if (left.day === right.day && left.start < right.end && right.start < left.end) {
        clashing.add(left.day);
      }
    }
  }
  return [...clashing].toSorted((left, right) => left - right);
}

export const noTimeConflicts = defineClauseKind({
  args: {},
  category: 'activities',
  check: (_clause, facts) => {
    const clashes = conflictDays(facts.activities);
    return clashes.length === 0 ? met : unmet(`Overlap on ${listed(clashes, 'day')}`);
  },
  description: 'No two timed activities on the same day overlap.',
  kind: 'no_time_conflicts',
  label: () => 'No timed activities overlap',
  needs: ['activities'],
  title: 'No overlaps'
});
