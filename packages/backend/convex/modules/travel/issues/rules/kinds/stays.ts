import {
  counted,
  everyHas,
  filled,
  listed,
  normalizeCount,
  normalizeRange,
  quantity,
  rangeWords,
  tripDays
} from '#convex/modules/travel/issues/rules/helpers';
import type { ClauseKindDefinitions, ClauseOf } from '#convex/modules/travel/issues/rules/types';

export type DetailField = ClauseOf<'stays_detailed'>['field'];

export const stayFieldWords: Record<DetailField, string> = {
  address: 'an address',
  cost: 'a cost',
  notes: 'notes'
};

const stayFieldMissing: Record<DetailField, string> = {
  address: 'without an address',
  cost: 'without a cost',
  notes: 'without notes'
};

/** A trip of `n` days has nights `1..n-1`; a stay covers check-in night up to check-out day. */
export const stayKinds: ClauseKindDefinitions<
  'nights_covered' | 'stays' | 'stays_detailed' | 'stays_per_destination'
> = {
  nights_covered: {
    category: 'stays',
    check: ({ nights }, facts) => {
      const days = tripDays(facts);
      if (!nights && days === undefined) return { detail: 'No length yet', met: false };
      const from = nights?.from ?? 1;
      const to = nights?.to ?? (days ?? 1) - 1;
      const open: Array<number> = [];
      for (let night = from; night <= to; night += 1) {
        const covered = facts.stays.some(
          ({ schedule }) => schedule.checkInDay <= night && night < schedule.checkOutDay
        );
        if (!covered) open.push(night);
      }
      return open.length === 0
        ? { detail: null, met: true }
        : { detail: `No stay on ${listed(open, 'night')}`, met: false };
    },
    create: () => ({ kind: 'nights_covered', nights: { from: 1, to: 2 } }),
    description: 'Chosen nights, or every night, have a place to stay.',
    label: ({ nights }) =>
      nights
        ? `${rangeWords(nights, 'Night')} ${nights.from === nights.to ? 'has' : 'have'} a place to stay`
        : 'Every night has a place to stay',
    needs: ['stays'],
    normalize: (clause) => {
      const nights = normalizeRange(clause.nights, 'night');
      return { kind: 'nights_covered', ...(nights ? { nights } : {}) };
    },
    title: 'Nights covered'
  },
  stays: {
    category: 'stays',
    check: (clause, { stays }) => counted(clause, stays.length),
    create: () => ({ comparator: 'at_least', count: 1, kind: 'stays' }),
    description: 'How many places to stay are booked.',
    label: (clause) => `The trip has ${quantity(clause, 'stay')}`,
    needs: ['stays'],
    normalize: (clause) => normalizeCount(clause, 'Stay count'),
    title: 'Number of stays'
  },
  stays_detailed: {
    category: 'stays',
    check: ({ field }, { stays }) =>
      everyHas(
        stays,
        (stay) => (field === 'cost' ? stay.cost !== undefined : filled(stay[field])),
        { missing: stayFieldMissing[field], none: 'No stays yet' }
      ),
    create: () => ({ field: 'cost', kind: 'stays_detailed' }),
    description: 'Every stay has a cost, an address, or notes.',
    label: ({ field }) => `Every stay has ${stayFieldWords[field]}`,
    needs: ['stays'],
    normalize: ({ field }) => ({ field, kind: 'stays_detailed' }),
    title: 'Stays filled in'
  },
  stays_per_destination: {
    category: 'stays',
    check: (_clause, { destinations, stays }) =>
      everyHas(
        destinations,
        (destination) => stays.some(({ destinationId }) => destinationId === destination._id),
        { missing: 'without a stay', none: 'No destinations yet' }
      ),
    create: () => ({ kind: 'stays_per_destination' }),
    description: 'Each destination has somewhere to sleep.',
    label: () => 'Every destination has a stay',
    needs: ['destinations', 'stays'],
    normalize: () => ({ kind: 'stays_per_destination' }),
    title: 'Stay in every destination'
  }
};
