import {
  counted,
  daysIn,
  everyHas,
  listed,
  normalizeCount,
  quantity,
  requiredText,
  tripDays
} from '#convex/modules/travel/issues/rules/helpers';
import type { ClauseKindDefinitions } from '#convex/modules/travel/issues/rules/types';

export const destinationKinds: ClauseKindDefinitions<
  'days_assigned' | 'destination_named' | 'destinations' | 'destinations_scheduled'
> = {
  days_assigned: {
    category: 'destinations',
    check: (_clause, facts) => {
      const days = daysIn(undefined, tripDays(facts));
      if (days === undefined) return { detail: 'No length yet', met: false };
      const open = days.filter(
        (day) =>
          !facts.destinations.some(
            ({ schedule }) => schedule && schedule.startDay <= day && day <= schedule.endDay
          )
      );
      return open.length === 0
        ? { detail: null, met: true }
        : { detail: `No place on ${listed(open, 'day')}`, met: false };
    },
    create: () => ({ kind: 'days_assigned' }),
    description: 'Every day of the trip belongs to a destination.',
    label: () => 'Every day of the trip has a destination',
    needs: ['destinations'],
    normalize: () => ({ kind: 'days_assigned' }),
    title: 'Every day placed'
  },
  destination_named: {
    category: 'destinations',
    check: ({ text }, { destinations }) => {
      const needle = text.toLowerCase();
      return {
        detail: null,
        met: destinations.some(({ name }) => name.toLowerCase().includes(needle))
      };
    },
    create: () => ({ kind: 'destination_named', text: '' }),
    description: 'A specific place is on the route.',
    label: ({ text }) => `The route includes “${text}”`,
    needs: ['destinations'],
    normalize: ({ text }) => ({ kind: 'destination_named', text: requiredText(text, 'Place') }),
    title: 'Includes a place'
  },
  destinations: {
    category: 'destinations',
    check: (clause, { destinations }) => counted(clause, destinations.length),
    create: () => ({ comparator: 'at_least', count: 2, kind: 'destinations' }),
    description: 'How many stops the route has.',
    label: (clause) => `The trip has ${quantity(clause, 'destination')}`,
    needs: ['destinations'],
    normalize: (clause) => normalizeCount(clause, 'Destination count'),
    title: 'Number of destinations'
  },
  destinations_scheduled: {
    category: 'destinations',
    check: (_clause, { destinations }) =>
      everyHas(destinations, ({ schedule }) => schedule !== undefined, {
        missing: 'without days',
        none: 'No destinations yet'
      }),
    create: () => ({ kind: 'destinations_scheduled' }),
    description: 'Each destination has its days set.',
    label: () => 'Every destination has its days set',
    needs: ['destinations'],
    normalize: () => ({ kind: 'destinations_scheduled' }),
    title: 'Destinations scheduled'
  }
};
