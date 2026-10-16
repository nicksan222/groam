import { expect, test } from 'vite-plus/test';
import type { Id } from '#convex-generated/dataModel';
import {
  type ClauseKind,
  clauseKinds,
  clauseKindsByCategory,
  clauseLabel,
  createClause,
  emptyRuleFacts,
  type IssueRule,
  normalizeRule,
  presentRule,
  type RuleClause,
  type RuleFacts,
  ruleLabel,
  ruleNeeds
} from '#convex/modules/travel/issues/rules/index';

type Activity = RuleFacts['activities'][number];
type TimeBlock = Activity['schedule']['timeBlock'];

const lisbon = 'lisbon' as Id<'tripDestinations'>;
const porto = 'porto' as Id<'tripDestinations'>;

const activity = (
  day: number,
  details: Partial<Omit<Activity, 'schedule'>> & {
    endDay?: number;
    endTime?: string;
    startTime?: string;
    timeBlock?: TimeBlock;
  } = {}
): Activity => {
  const { endDay, endTime, startTime, timeBlock = 'morning', ...rest } = details;
  return {
    destinationId: lisbon,
    schedule: {
      day,
      ...(endDay ? { endDay } : {}),
      ...(endTime ? { endTime } : {}),
      ...(startTime ? { startTime } : {}),
      timeBlock
    },
    title: 'Walk',
    ...rest
  };
};

const stay = (checkInDay: number, checkOutDay: number, destinationId = lisbon) => ({
  destinationId,
  schedule: { checkInDay, checkOutDay }
});

const destination = (
  _id: Id<'tripDestinations'>,
  position: number,
  schedule?: { endDay: number; startDay: number }
) => ({
  _id,
  name: _id === lisbon ? 'Lisbon' : 'Porto',
  position,
  ...(schedule ? { schedule } : {})
});

function facts(overrides: Partial<RuleFacts> & { days?: number } = {}): RuleFacts {
  const { days, trip, ...lists } = overrides;
  return {
    ...emptyRuleFacts({
      destination: { status: 'undecided' },
      ...(days ? { duration: { totalDays: days } } : {}),
      ...trip
    }),
    ...lists
  };
}

const single = (clause: RuleClause): IssueRule => ({ items: [clause], match: 'all' });
const check = (clause: RuleClause, tripFacts: RuleFacts) => {
  const [item] = presentRule(single(clause), tripFacts).items;
  if (item?.kind !== 'clause') throw new Error('Expected a clause');
  return { detail: item.detail, label: item.label, met: item.met };
};

const daysOneToThree: RuleClause = {
  comparator: 'at_least',
  count: 2,
  days: { from: 1, to: 3 },
  kind: 'activities',
  per: 'day'
};

test('every kind has a catalog entry whose default survives normalizing', () => {
  const listed = clauseKindsByCategory().flatMap(({ kinds }) => kinds.map(({ kind }) => kind));
  const all = Object.keys(clauseKinds) as Array<ClauseKind>;
  expect(listed.toSorted()).toEqual(all.toSorted());
  expect(all.length).toBeGreaterThanOrEqual(25);
  for (const kind of all) {
    if (kind === 'destination_named') continue; // starts blank for the person to fill in
    const clause = createClause(kind);
    expect(normalizeRule(single(clause))).toEqual(single(clause));
    expect(clauseLabel(clause)).toMatch(/^[A-Z]/);
  }
});

test.each<[string, RuleClause, RuleFacts, { detail: string | null; met: boolean }]>([
  // Trip basics
  [
    'trip check met',
    { check: 'dates', kind: 'trip' },
    facts({
      trip: { destination: { status: 'undecided' }, duration: undefined, startDate: '2027-06-01' }
    }),
    { detail: null, met: true }
  ],
  [
    'trip length unknown',
    { comparator: 'at_least', count: 5, kind: 'trip_length' },
    facts(),
    { detail: 'No length yet', met: false }
  ],
  [
    'trip length too short',
    { comparator: 'at_least', count: 5, kind: 'trip_length' },
    facts({ days: 3 }),
    { detail: '3 so far', met: false }
  ],
  [
    'trip length exact',
    { comparator: 'exactly', count: 3, kind: 'trip_length' },
    facts({ days: 3 }),
    { detail: null, met: true }
  ],
  [
    'start date missing',
    { from: '2027-06-01', kind: 'start_date' },
    facts(),
    { detail: 'No start date yet', met: false }
  ],
  [
    'start date in window',
    { from: '2027-06-01', kind: 'start_date', to: '2027-06-30' },
    facts({ trip: { destination: { status: 'undecided' }, startDate: '2027-06-15' } }),
    { detail: null, met: true }
  ],
  [
    'start date too late',
    { kind: 'start_date', to: '2027-06-30' },
    facts({ trip: { destination: { status: 'undecided' }, startDate: '2027-07-02' } }),
    { detail: 'Starts Jul 2, 2027', met: false }
  ],
  // Money
  [
    'budget missing',
    { amount: 2000, comparator: 'at_most', kind: 'budget' },
    facts(),
    { detail: 'No budget yet', met: false }
  ],
  [
    'budget within',
    { amount: 2000, comparator: 'at_most', kind: 'budget' },
    facts({ trip: { budget: { amount: 1500 }, destination: { status: 'undecided' } } }),
    { detail: null, met: true }
  ],
  [
    'planned costs count per-person costs per going traveler',
    { amount: 300, comparator: 'at_most', kind: 'planned_cost' },
    facts({
      activities: [activity(1, { cost: { amount: 100, split: 'per_person' } })],
      stays: [{ ...stay(1, 2), cost: { amount: 150 } }],
      travelers: [{ status: 'going' }, { status: 'going' }, { status: 'maybe' }]
    }),
    { detail: '350 planned', met: false }
  ],
  [
    'within budget',
    { kind: 'within_budget' },
    facts({
      activities: [activity(1, { cost: { amount: 80 } })],
      trip: { budget: { amount: 100 }, destination: { status: 'undecided' } }
    }),
    { detail: null, met: true }
  ],
  [
    'over budget',
    { kind: 'within_budget' },
    facts({
      activities: [activity(1, { cost: { amount: 180 } })],
      trip: { budget: { amount: 100 }, destination: { status: 'undecided' } }
    }),
    { detail: '180 of 100', met: false }
  ],
  // Destinations
  [
    'destination count',
    { comparator: 'at_least', count: 2, kind: 'destinations' },
    facts({ destinations: [destination(lisbon, 0)] }),
    { detail: '1 so far', met: false }
  ],
  [
    'destination named',
    { kind: 'destination_named', text: 'porto' },
    facts({ destinations: [destination(porto, 0)] }),
    { detail: null, met: true }
  ],
  [
    'destinations unscheduled',
    { kind: 'destinations_scheduled' },
    facts({
      destinations: [destination(lisbon, 0, { endDay: 2, startDay: 1 }), destination(porto, 1)]
    }),
    { detail: '1 without days', met: false }
  ],
  [
    'destinations none',
    { kind: 'destinations_scheduled' },
    facts(),
    { detail: 'No destinations yet', met: false }
  ],
  [
    'days assigned gap',
    { kind: 'days_assigned' },
    facts({ days: 4, destinations: [destination(lisbon, 0, { endDay: 2, startDay: 1 })] }),
    { detail: 'No place on days 3, 4', met: false }
  ],
  // Activities
  [
    'two each on days 1–3, short on day 2',
    daysOneToThree,
    facts({ activities: [1, 1, 2, 3, 3].map((day) => activity(day)), days: 5 }),
    { detail: 'Day 2 has 1', met: false }
  ],
  [
    'a multi-day activity counts on each day it spans',
    daysOneToThree,
    facts({
      activities: [
        activity(1, { endDay: 3, timeBlock: 'full_day' }),
        activity(1),
        activity(2),
        activity(3)
      ]
    }),
    { detail: null, met: true }
  ],
  [
    'totals count a spanning activity once',
    { ...daysOneToThree, count: 3, per: 'total' },
    facts({ activities: [activity(1, { endDay: 3 }), activity(2)] }),
    { detail: '2 so far', met: false }
  ],
  [
    'every day needs a length',
    { comparator: 'at_least', count: 1, kind: 'activities', per: 'day' },
    facts({ activities: [activity(1)] }),
    { detail: 'No length yet', met: false }
  ],
  [
    'evening dinner, full-day counts',
    {
      comparator: 'at_least',
      count: 1,
      days: { from: 2, to: 2 },
      kind: 'activities',
      per: 'day',
      timeBlock: 'evening',
      titleIncludes: 'dinner'
    },
    facts({ activities: [activity(2, { timeBlock: 'full_day', title: 'Dinner day' })] }),
    { detail: null, met: true }
  ],
  [
    'evening dinner, morning does not',
    {
      comparator: 'at_least',
      count: 1,
      days: { from: 2, to: 2 },
      kind: 'activities',
      per: 'day',
      timeBlock: 'evening',
      titleIncludes: 'dinner'
    },
    facts({ activities: [activity(2, { title: 'Dinner' })] }),
    { detail: 'Day 2 has 0', met: false }
  ],
  [
    'free days',
    { comparator: 'at_least', count: 2, kind: 'free_days' },
    facts({ activities: [activity(1), activity(3)], days: 4 }),
    { detail: null, met: true }
  ],
  [
    'every activity has a cost',
    { field: 'cost', kind: 'activities_detailed' },
    facts({ activities: [activity(1, { cost: { amount: 5 } }), activity(2)] }),
    { detail: '1 without a cost', met: false }
  ],
  [
    'every activity, none yet',
    { field: 'start_time', kind: 'activities_detailed' },
    facts(),
    { detail: 'No activities yet', met: false }
  ],
  [
    'overlapping times',
    { kind: 'no_time_conflicts' },
    facts({
      activities: [
        activity(2, { endTime: '11:00', startTime: '09:00' }),
        activity(2, { startTime: '10:30' }),
        activity(3, { startTime: '10:30' })
      ]
    }),
    { detail: 'Overlap on day 2', met: false }
  ],
  [
    'back-to-back times',
    { kind: 'no_time_conflicts' },
    facts({
      activities: [
        activity(2, { endTime: '11:00', startTime: '09:00' }),
        activity(2, { startTime: '11:00' })
      ]
    }),
    { detail: null, met: true }
  ],
  [
    'activities per destination',
    { comparator: 'at_least', count: 1, kind: 'activities_per_destination' },
    facts({
      activities: [activity(1)],
      destinations: [destination(lisbon, 0), destination(porto, 1)]
    }),
    { detail: 'Not met in Porto', met: false }
  ],
  // Stays
  [
    'stay count',
    { comparator: 'exactly', count: 1, kind: 'stays' },
    facts({ stays: [stay(1, 3)] }),
    { detail: null, met: true }
  ],
  [
    'nights 1–3 with a gap',
    { kind: 'nights_covered', nights: { from: 1, to: 3 } },
    facts({ stays: [stay(1, 2), stay(3, 4)] }),
    { detail: 'No stay on night 2', met: false }
  ],
  [
    'every night',
    { kind: 'nights_covered' },
    facts({ days: 4, stays: [stay(1, 4)] }),
    { detail: null, met: true }
  ],
  [
    'every stay has an address',
    { field: 'address', kind: 'stays_detailed' },
    facts({ stays: [{ ...stay(1, 2), address: ' ' }] }),
    { detail: '1 without an address', met: false }
  ],
  [
    'a stay in every destination',
    { kind: 'stays_per_destination' },
    facts({
      destinations: [destination(lisbon, 0), destination(porto, 1)],
      stays: [stay(1, 2, porto), stay(2, 3, lisbon)]
    }),
    { detail: null, met: true }
  ],
  // Getting around
  [
    'arrival by flight, train planned',
    { boundary: 'arrival', kind: 'boundary_transfer', mode: 'flight' },
    facts({
      transfers: {
        activity: [],
        boundary: [{ boundary: 'arrival', mode: 'train' }],
        destination: []
      }
    }),
    { detail: 'No arrival yet', met: false }
  ],
  [
    'there and back',
    { boundary: 'both', kind: 'boundary_transfer' },
    facts({
      transfers: {
        activity: [],
        boundary: [
          { boundary: 'arrival', mode: 'train' },
          { boundary: 'departure', mode: 'flight' }
        ],
        destination: []
      }
    }),
    { detail: null, met: true }
  ],
  [
    'every leg',
    { kind: 'legs_covered' },
    facts({
      destinations: [destination(porto, 1), destination(lisbon, 0)],
      transfers: {
        activity: [],
        boundary: [],
        destination: [{ fromDestinationId: lisbon, mode: 'train', toDestinationId: porto }]
      }
    }),
    { detail: null, met: true }
  ],
  [
    'every leg, one stop',
    { kind: 'legs_covered' },
    facts({ destinations: [destination(lisbon, 0)] }),
    { detail: 'Needs two destinations', met: false }
  ],
  [
    'every transfer timed',
    { field: 'timing', kind: 'transfers_detailed' },
    facts({
      transfers: {
        activity: [{ mode: 'walk' }],
        boundary: [
          { boundary: 'arrival', mode: 'flight', timing: { startDay: 1, startTime: '09:00' } }
        ],
        destination: []
      }
    }),
    { detail: '1 without a time', met: false }
  ],
  // Travelers and packing
  [
    'four going',
    { comparator: 'at_least', count: 4, kind: 'travelers', status: 'going' },
    facts({ travelers: [{ status: 'going' }, { status: 'going' }, { status: 'maybe' }] }),
    { detail: '2 so far', met: false }
  ],
  [
    'nobody maybe',
    { comparator: 'exactly', count: 0, kind: 'travelers', status: 'maybe' },
    facts({ travelers: [{ status: 'going' }, { status: 'not_going' }] }),
    { detail: null, met: true }
  ],
  [
    'packing list size',
    { comparator: 'at_least', count: 2, kind: 'packing_items' },
    facts({ packing: [{ packed: false }, { packed: true }] }),
    { detail: null, met: true }
  ],
  [
    'all packed',
    { kind: 'packing_packed' },
    facts({ packing: [{ packed: false }, { packed: true }] }),
    { detail: '1 still to pack', met: false }
  ]
])('%s', (_name, clause, tripFacts, expected) => {
  expect(check(clause, tripFacts)).toMatchObject(expected);
});

test.each<[RuleClause, string]>([
  [daysOneToThree, 'Days 1–3 each have at least 2 activities'],
  [
    {
      ...daysOneToThree,
      days: { from: 2, to: 2 },
      timeBlock: 'evening',
      titleIncludes: 'dinner',
      count: 1
    },
    'Day 2 has at least 1 evening activity matching “dinner”'
  ],
  [
    { comparator: 'at_most', count: 10, kind: 'activities', per: 'total' },
    'The trip has at most 10 activities'
  ],
  [
    { from: '2027-06-01', kind: 'start_date', to: '2027-06-30' },
    'The trip starts between Jun 1, 2027 and Jun 30, 2027'
  ],
  [
    { amount: 2500, comparator: 'at_most', kind: 'planned_cost' },
    'Planned costs total at most 2,500'
  ],
  [
    { comparator: 'exactly', count: 1, kind: 'free_days', days: { from: 1, to: 5 } },
    'Days 1–5 include exactly 1 free day'
  ],
  [{ kind: 'nights_covered', nights: { from: 2, to: 2 } }, 'Night 2 has a place to stay'],
  [
    { boundary: 'both', kind: 'boundary_transfer', mode: 'train' },
    'Getting there and back are planned by train'
  ],
  [
    { comparator: 'at_least', count: 1, kind: 'travelers', status: 'not_going' },
    'At least 1 traveler says not going'
  ]
])('label: %j', (clause, label) => {
  expect(clauseLabel(clause)).toBe(label);
});

test('all, any, none, and groups compose into one sentence and one answer', () => {
  const rule: IssueRule = {
    items: [
      daysOneToThree,
      {
        clauses: [
          { check: 'destination', kind: 'trip' },
          { comparator: 'at_least', count: 2, kind: 'destinations' }
        ],
        kind: 'group',
        match: 'any'
      }
    ],
    match: 'all'
  };
  expect(ruleLabel(rule)).toBe(
    'Days 1–3 each have at least 2 activities and (the trip has a destination or the trip has at least 2 destinations)'
  );
  const busy = [1, 1, 2, 2, 3, 3].map((day) => activity(day));
  const oneStop = [destination(lisbon, 0)];
  expect(presentRule(rule, facts({ activities: busy, days: 3, destinations: oneStop })).met).toBe(
    false
  );
  const twoStops = [destination(lisbon, 0), destination(porto, 1)];
  const presented = presentRule(rule, facts({ activities: busy, days: 3, destinations: twoStops }));
  expect(presented.met).toBe(true);
  expect(presented.items[1]).toMatchObject({ kind: 'group', match: 'any', met: true });

  const none: IssueRule = { items: rule.items, match: 'none' };
  expect(ruleLabel(none)).toMatch(/^None of: days 1–3 each have/);
  expect(presentRule(none, facts()).met).toBe(true);
  expect(presentRule(none, facts({ activities: busy, days: 3 })).met).toBe(false);
});

test('a rule names only the trip lists its clauses read', () => {
  expect([...ruleNeeds(single(daysOneToThree))]).toEqual(['activities']);
  expect(ruleNeeds(single({ kind: 'within_budget' }))).toEqual(
    new Set(['activities', 'stays', 'transfers', 'travelers'])
  );
  expect(ruleNeeds(single({ comparator: 'at_least', count: 3, kind: 'trip_length' })).size).toBe(0);
});

test('normalizing trims text and rejects rules a person must fix', () => {
  expect(normalizeRule(single({ ...daysOneToThree, titleIncludes: '  tour  ' }))).toEqual(
    single({ ...daysOneToThree, titleIncludes: 'tour' })
  );
  expect(normalizeRule(single({ ...daysOneToThree, titleIncludes: '   ' }))).toEqual(
    single(daysOneToThree)
  );
  expect(normalizeRule(single({ amount: 10.456, comparator: 'at_most', kind: 'budget' }))).toEqual(
    single({ amount: 10.46, comparator: 'at_most', kind: 'budget' })
  );
  expect(() => normalizeRule({ items: [], match: 'all' })).toThrow('Add at least one condition');
  expect(() => normalizeRule(single({ ...daysOneToThree, days: { from: 3, to: 1 } }))).toThrow(
    'The first day must come before the last day'
  );
  expect(() => normalizeRule(single({ ...daysOneToThree, count: 1.5 }))).toThrow('whole number');
  expect(() => normalizeRule(single({ kind: 'destination_named', text: ' ' }))).toThrow(
    'Place must contain'
  );
  expect(() => normalizeRule(single({ from: '2027-02-30', kind: 'start_date' }))).toThrow(
    'must be a date'
  );
  expect(() =>
    normalizeRule(single({ amount: -1, comparator: 'at_most', kind: 'budget' }))
  ).toThrow('Amounts must be');
  expect(() =>
    normalizeRule({ items: [{ clauses: [], kind: 'group', match: 'any' }], match: 'all' })
  ).toThrow('Groups need at least one condition');
});
