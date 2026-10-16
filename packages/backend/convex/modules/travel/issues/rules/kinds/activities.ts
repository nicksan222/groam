import {
  compare,
  comparatorWords,
  counted,
  daysIn,
  everyHas,
  filled,
  listed,
  normalizeCount,
  normalizeRange,
  optionalText,
  quantity,
  rangeWords,
  tripDays
} from '#convex/modules/travel/issues/rules/helpers';
import type {
  ClauseKindDefinitions,
  ClauseOf,
  RuleFacts
} from '#convex/modules/travel/issues/rules/types';

/**
 * An activity counts on every day from its `day` through its `endDay`. A `full_day` activity
 * counts for every time block, since it fills the whole day.
 */

type Activity = RuleFacts['activities'][number];
export type TimeBlock = NonNullable<ClauseOf<'activities'>['timeBlock']>;
export type DetailField = ClauseOf<'activities_detailed'>['field'];

export const timeBlockWords: Record<TimeBlock, string> = {
  afternoon: 'afternoon',
  evening: 'evening',
  full_day: 'full-day',
  morning: 'morning'
};

export const activityFieldWords: Record<DetailField, string> = {
  address: 'an address',
  cost: 'a cost',
  notes: 'notes',
  start_time: 'a start time'
};

const activityFieldMissing: Record<DetailField, string> = {
  address: 'without an address',
  cost: 'without a cost',
  notes: 'without notes',
  start_time: 'without a start time'
};

const lastDayOf = (activity: Activity) => activity.schedule.endDay ?? activity.schedule.day;
const onDay = (activity: Activity, day: number) =>
  activity.schedule.day <= day && day <= lastDayOf(activity);

function matches(activity: Activity, clause: ClauseOf<'activities'>): boolean {
  const { timeBlock } = activity.schedule;
  if (clause.timeBlock && timeBlock !== clause.timeBlock && timeBlock !== 'full_day') return false;
  if (!clause.titleIncludes) return true;
  return activity.title.toLowerCase().includes(clause.titleIncludes.toLowerCase());
}

function activitiesWording(clause: ClauseOf<'activities'>): string {
  const block = clause.timeBlock ? `${timeBlockWords[clause.timeBlock]} ` : '';
  const matching = clause.titleIncludes ? ` matching “${clause.titleIncludes}”` : '';
  const noun = clause.count === 1 ? 'activity' : 'activities';
  return `${comparatorWords[clause.comparator]} ${clause.count} ${block}${noun}${matching}`;
}

function checkActivities(clause: ClauseOf<'activities'>, facts: RuleFacts) {
  const matching = facts.activities.filter((activity) => matches(activity, clause));
  const { days } = clause;
  if (clause.per === 'total') {
    const inRange = days
      ? matching.filter(
          (activity) => activity.schedule.day <= days.to && lastDayOf(activity) >= days.from
        )
      : matching;
    return counted(clause, inRange.length);
  }
  const range = daysIn(days, tripDays(facts));
  if (range === undefined) return { detail: 'No length yet', met: false };
  const failing = range
    .map((day) => ({ count: matching.filter((activity) => onDay(activity, day)).length, day }))
    .filter(({ count }) => !compare(clause, count));
  if (failing.length === 0) return { detail: null, met: true };
  const [first] = failing;
  return {
    detail:
      failing.length === 1 && first
        ? `Day ${first.day} has ${first.count}`
        : `Not met on ${listed(
            failing.map(({ day }) => day),
            'day'
          )}`,
    met: false
  };
}

const minutes = (time: string) => {
  const [hours = 0, mins = 0] = time.split(':').map(Number);
  return hours * 60 + mins;
};

/** Timed one-day activities overlap when one starts before the other ends; no end is a moment. */
function conflictDays(activities: Array<Activity>, days: ReturnType<typeof daysIn>): Array<number> {
  const inRange = days && new Set(days);
  const timed = activities.flatMap((activity) => {
    const { day, endDay, endTime, startTime } = activity.schedule;
    if (!startTime || (endDay !== undefined && endDay !== day)) return [];
    if (inRange && !inRange.has(day)) return [];
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

export const activityKinds: ClauseKindDefinitions<
  | 'activities'
  | 'activities_detailed'
  | 'activities_per_destination'
  | 'free_days'
  | 'no_time_conflicts'
> = {
  activities: {
    category: 'activities',
    check: checkActivities,
    create: () => ({
      comparator: 'at_least',
      count: 2,
      days: { from: 1, to: 3 },
      kind: 'activities',
      per: 'day'
    }),
    description: 'Activities per day or in total, by time of day or title.',
    label: (clause) => {
      const amount = activitiesWording(clause);
      const { days } = clause;
      if (days && days.from === days.to) return `Day ${days.from} has ${amount}`;
      if (clause.per === 'day') {
        return days ? `${rangeWords(days, 'Day')} each have ${amount}` : `Every day has ${amount}`;
      }
      return days ? `${rangeWords(days, 'Day')} have ${amount} in total` : `The trip has ${amount}`;
    },
    needs: ['activities'],
    normalize: (clause) => {
      const days = normalizeRange(clause.days, 'day');
      const titleIncludes = optionalText(clause.titleIncludes, 'Activity text');
      return {
        comparator: clause.comparator,
        count: normalizeCount(clause, 'Activity count').count,
        ...(days ? { days } : {}),
        kind: 'activities',
        per: clause.per,
        ...(clause.timeBlock ? { timeBlock: clause.timeBlock } : {}),
        ...(titleIncludes ? { titleIncludes } : {})
      };
    },
    title: 'Activities'
  },
  activities_detailed: {
    category: 'activities',
    check: ({ field }, { activities }) =>
      everyHas(
        activities,
        (activity) => {
          switch (field) {
            case 'address': {
              return filled(activity.address);
            }
            case 'cost': {
              return activity.cost !== undefined;
            }
            case 'notes': {
              return filled(activity.notes);
            }
            case 'start_time': {
              return filled(activity.schedule.startTime);
            }
          }
        },
        { missing: activityFieldMissing[field], none: 'No activities yet' }
      ),
    create: () => ({ field: 'cost', kind: 'activities_detailed' }),
    description: 'Every activity has a cost, a time, an address, or notes.',
    label: ({ field }) => `Every activity has ${activityFieldWords[field]}`,
    needs: ['activities'],
    normalize: ({ field }) => ({ field, kind: 'activities_detailed' }),
    title: 'Activities filled in'
  },
  activities_per_destination: {
    category: 'activities',
    check: (clause, { activities, destinations }) => {
      if (destinations.length === 0) return { detail: 'No destinations yet', met: false };
      const short = destinations.filter(
        (destination) =>
          !compare(
            clause,
            activities.filter((item) => item.destinationId === destination._id).length
          )
      );
      const [first] = short;
      if (!first) return { detail: null, met: true };
      return {
        detail:
          short.length === 1 ? `Not met in ${first.name}` : `Not met in ${short.length} places`,
        met: false
      };
    },
    create: () => ({ comparator: 'at_least', count: 1, kind: 'activities_per_destination' }),
    description: 'Each destination has its share of activities.',
    label: (clause) => `Every destination has ${quantity(clause, 'activity', 'activities')}`,
    needs: ['activities', 'destinations'],
    normalize: (clause) => normalizeCount(clause, 'Activity count'),
    title: 'Activities per destination'
  },
  free_days: {
    category: 'activities',
    check: (clause, facts) => {
      const range = daysIn(clause.days, tripDays(facts));
      if (range === undefined) return { detail: 'No length yet', met: false };
      const free = range.filter(
        (day) => !facts.activities.some((activity) => onDay(activity, day))
      );
      return counted(clause, free.length);
    },
    create: () => ({ comparator: 'at_least', count: 1, kind: 'free_days' }),
    description: 'Rest days with nothing planned.',
    label: (clause) =>
      `${clause.days ? `${rangeWords(clause.days, 'Day')} include` : 'The trip has'} ${quantity(clause, 'free day')}`,
    needs: ['activities'],
    normalize: (clause) => {
      const days = normalizeRange(clause.days, 'day');
      return {
        comparator: clause.comparator,
        count: normalizeCount(clause, 'Free day count').count,
        ...(days ? { days } : {}),
        kind: 'free_days'
      };
    },
    title: 'Free days'
  },
  no_time_conflicts: {
    category: 'activities',
    check: (clause, facts) => {
      const clashes = conflictDays(
        facts.activities,
        clause.days ? daysIn(clause.days, undefined) : undefined
      );
      return clashes.length === 0
        ? { detail: null, met: true }
        : { detail: `Overlap on ${listed(clashes, 'day')}`, met: false };
    },
    create: () => ({ kind: 'no_time_conflicts' }),
    description: 'No two timed activities overlap.',
    label: ({ days }) =>
      days
        ? `No timed activities overlap on ${rangeWords(days, 'Day').toLowerCase()}`
        : 'No timed activities overlap',
    needs: ['activities'],
    normalize: (clause) => {
      const days = normalizeRange(clause.days, 'day');
      return { ...(days ? { days } : {}), kind: 'no_time_conflicts' };
    },
    title: 'No time conflicts'
  }
};
