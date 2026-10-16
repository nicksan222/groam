import { ConvexError } from 'convex/values';
import { conditionMet } from '#convex/modules/travel/issues/checks';
import {
  counted,
  normalizeCount,
  quantity,
  tripDays
} from '#convex/modules/travel/issues/rules/helpers';
import type { ClauseKindDefinitions, ClauseOf } from '#convex/modules/travel/issues/rules/types';

/** Lowercase, so they read inside a longer sentence. */
export const tripCheckPhrases: Record<ClauseOf<'trip'>['check'], string> = {
  activities: 'every destination has an activity',
  budget: 'the trip has a group budget',
  dates: 'the trip has travel dates',
  destination: 'the trip has a destination',
  duration: 'the trip has a length',
  packing: 'the packing list has items',
  stays: 'every night of the trip has a place to stay'
};

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDate(value: string | undefined, label: string): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const date = value.trim();
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !isoDate.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new ConvexError(`${label} must be a date like 2027-06-01`);
  }
  return date;
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric'
});

function displayDate(date: string): string {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const tripKinds: ClauseKindDefinitions<'start_date' | 'trip' | 'trip_length'> = {
  start_date: {
    category: 'trip',
    check: ({ from, to }, { trip }) => {
      const start = trip.startDate;
      if (start === undefined) return { detail: 'No start date yet', met: false };
      const met = (from === undefined || start >= from) && (to === undefined || start <= to);
      return { detail: met ? null : `Starts ${displayDate(start)}`, met };
    },
    create: () => ({ kind: 'start_date' }),
    description: 'The trip starts within a window of dates.',
    label: ({ from, to }) => {
      if (from && to) return `The trip starts between ${displayDate(from)} and ${displayDate(to)}`;
      if (from) return `The trip starts on or after ${displayDate(from)}`;
      if (to) return `The trip starts on or before ${displayDate(to)}`;
      return 'The trip has a start date';
    },
    needs: [],
    normalize: (clause) => {
      const from = normalizeDate(clause.from, 'The earliest start');
      const to = normalizeDate(clause.to, 'The latest start');
      if (from && to && from > to) {
        throw new ConvexError('The earliest start must come before the latest start');
      }
      return { kind: 'start_date', ...(from ? { from } : {}), ...(to ? { to } : {}) };
    },
    title: 'Start date window'
  },
  trip: {
    category: 'trip',
    check: ({ check }, facts) => ({ detail: null, met: conditionMet(check, facts) }),
    create: () => ({ check: 'destination', kind: 'trip' }),
    description:
      'A destination, travel dates, a length, a stay every night, a budget, packing, or activities.',
    label: ({ check }) => capitalize(tripCheckPhrases[check]),
    needs: ['activities', 'destinations', 'packing', 'stays'],
    normalize: ({ check }) => ({ check, kind: 'trip' }),
    title: 'Trip is decided'
  },
  trip_length: {
    category: 'trip',
    check: (clause, facts) => {
      const days = tripDays(facts);
      return days === undefined ? { detail: 'No length yet', met: false } : counted(clause, days);
    },
    create: () => ({ comparator: 'at_least', count: 3, kind: 'trip_length' }),
    description: 'How many days the trip lasts.',
    label: (clause) => `The trip lasts ${quantity(clause, 'day')}`,
    needs: [],
    normalize: (clause) => normalizeCount(clause, 'Trip length'),
    title: 'Trip length'
  }
};
