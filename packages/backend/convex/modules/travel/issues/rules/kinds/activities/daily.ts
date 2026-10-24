import { v } from 'convex/values';
import { defineClauseKind } from '#convex/modules/travel/issues/rules/define';
import {
  listed,
  MAX_RULE_COUNT,
  met,
  optionalText,
  tripDayList,
  tripDays,
  unmet,
  wholeNumber
} from '#convex/modules/travel/issues/rules/helpers';
import type { RuleFacts } from '#convex/modules/travel/issues/rules/types';

type Activity = RuleFacts['activities'][number];

/** An activity counts on every day from its `day` through its `endDay`. */
const onDay = (activity: Activity, day: number) =>
  activity.schedule.day <= day && day <= (activity.schedule.endDay ?? activity.schedule.day);

function matches(activity: Activity, titleIncludes: string | undefined): boolean {
  return !titleIncludes || activity.title.toLowerCase().includes(titleIncludes.toLowerCase());
}

export const dailyActivities = defineClauseKind({
  args: {
    count: v.number(),
    /** Case-insensitive part of the activity title, such as "dinner". */
    titleIncludes: v.optional(v.string())
  },
  category: 'activities',
  check: (clause, facts) => {
    const days = tripDayList(tripDays(facts));
    if (days === undefined) return unmet('No length yet');
    const matching = facts.activities.filter((activity) => matches(activity, clause.titleIncludes));
    const short = days
      .map((day) => ({ count: matching.filter((activity) => onDay(activity, day)).length, day }))
      .filter(({ count }) => count < clause.count);
    const [first] = short;
    if (!first) return met;
    return unmet(
      short.length === 1
        ? `Day ${first.day} has ${first.count}`
        : `Short on ${listed(
            short.map(({ day }) => day),
            'day'
          )}`
    );
  },
  create: () => ({ count: 1 }),
  description: 'No empty days: each day has enough planned, optionally of one sort.',
  fields: [
    { key: 'count', label: 'Activities per day', lead: 'at least', type: 'number' },
    {
      key: 'titleIncludes',
      label: 'Title includes',
      optional: true,
      placeholder: 'any title, or “dinner”',
      type: 'text'
    }
  ],
  kind: 'daily_activities',
  label: ({ count, titleIncludes }) => {
    const noun = count === 1 ? 'activity' : 'activities';
    return `Every day has at least ${count} ${noun}${titleIncludes ? ` matching “${titleIncludes}”` : ''}`;
  },
  needs: ['activities'],
  normalize: (clause) => {
    const titleIncludes = optionalText(clause.titleIncludes, 'Activity title');
    return {
      count: wholeNumber(clause.count, 1, MAX_RULE_COUNT, 'Activity count'),
      ...(titleIncludes ? { titleIncludes } : {})
    };
  },
  title: 'Activities every day'
});
