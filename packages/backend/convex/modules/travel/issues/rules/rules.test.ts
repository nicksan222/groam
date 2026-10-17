import { validate } from 'convex-helpers/validators';
import { expect, test } from 'vite-plus/test';
import type { Id } from '#convex-generated/dataModel';
import {
  type ClauseKind,
  type ClauseField,
  clauseFields,
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
import { clauseKindList } from '#convex/modules/travel/issues/rules/kinds/index';
import { RuleValidators } from '#convex/modules/travel/issues/rules/schema';

type Activity = RuleFacts['activities'][number];

const lisbon = 'lisbon' as Id<'tripDestinations'>;
const porto = 'porto' as Id<'tripDestinations'>;

const activity = (
  day: number,
  details: Partial<Omit<Activity, 'schedule'>> & {
    endDay?: number;
    endTime?: string;
    startTime?: string;
  } = {}
): Activity => {
  const { endDay, endTime, startTime, ...rest } = details;
  return {
    destinationId: lisbon,
    schedule: {
      day,
      ...(endDay ? { endDay } : {}),
      ...(endTime ? { endTime } : {}),
      ...(startTime ? { startTime } : {}),
      timeBlock: 'morning'
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

const everyDay: RuleClause = { count: 2, kind: 'daily_activities' };
const transfer = { cost: undefined, mode: 'train' as const, timing: undefined };

test('every kind has a catalog entry whose default survives normalizing', () => {
  const listed = clauseKindsByCategory().flatMap(({ kinds }) => kinds.map(({ kind }) => kind));
  const all = Object.keys(clauseKinds) as Array<ClauseKind>;
  expect(listed.toSorted()).toEqual(all.toSorted());
  expect(all).toHaveLength(18);
  for (const kind of all) {
    if (kind === 'destination_named') continue; // starts blank for the person to fill in
    const clause = createClause(kind);
    expect(normalizeRule(single(clause))).toEqual(single(clause));
    expect(clauseLabel(clause)).toMatch(/^[A-Z]/u);
  }
});

const budgetTrip = { budget: { amount: 100, currency: 'EUR' } } as Partial<RuleFacts['trip']>;

test.each<[string, RuleClause, RuleFacts, { detail: string | null; met: boolean }]>([
  // Dates and budget
  ['dates unset', { kind: 'has_dates' }, facts(), { detail: 'No start date yet', met: false }],
  [
    'dates set',
    { kind: 'has_dates' },
    facts({ trip: { startDate: '2027-06-01' } as RuleFacts['trip'] }),
    { detail: null, met: true }
  ],
  ['budget unset', { kind: 'has_budget' }, facts(), { detail: 'No budget yet', met: false }],
  [
    'budget set',
    { kind: 'has_budget' },
    facts({ trip: budgetTrip as RuleFacts['trip'] }),
    { detail: null, met: true }
  ],
  [
    'within budget without a budget',
    { kind: 'within_budget' },
    facts(),
    { detail: 'No budget yet', met: false }
  ],
  [
    'over budget',
    { kind: 'within_budget' },
    facts({
      activities: [activity(1, { cost: { amount: 150, basis: 'total' } as Activity['cost'] })],
      trip: budgetTrip as RuleFacts['trip']
    }),
    { detail: '150 of 100', met: false }
  ],
  ['length unset', { kind: 'has_length' }, facts(), { detail: 'No length yet', met: false }],
  ['length set', { kind: 'has_length' }, facts({ days: 3 }), { detail: null, met: true }],
  // Route
  [
    'destination undecided',
    { kind: 'has_destination' },
    facts(),
    { detail: 'No destination yet', met: false }
  ],
  [
    'destination known',
    { kind: 'has_destination' },
    facts({ trip: { destination: { status: 'known' } } as RuleFacts['trip'] }),
    { detail: null, met: true }
  ],
  [
    'place missing',
    { kind: 'destination_named', text: 'porto' },
    facts({ destinations: [destination(lisbon, 0)] }),
    { detail: 'Not on the route yet', met: false }
  ],
  [
    'place on the route',
    { kind: 'destination_named', text: 'porto' },
    facts({ destinations: [destination(lisbon, 0), destination(porto, 1)] }),
    { detail: null, met: true }
  ],
  [
    'days without a length',
    { kind: 'days_assigned' },
    facts(),
    { detail: 'No length yet', met: false }
  ],
  [
    'a day without a place',
    { kind: 'days_assigned' },
    facts({ days: 3, destinations: [destination(lisbon, 0, { endDay: 2, startDay: 1 })] }),
    { detail: 'No place on day 3', met: false }
  ],
  [
    'every day placed',
    { kind: 'days_assigned' },
    facts({
      days: 3,
      destinations: [
        destination(lisbon, 0, { endDay: 2, startDay: 1 }),
        destination(porto, 1, { endDay: 3, startDay: 3 })
      ]
    }),
    { detail: null, met: true }
  ],
  // Activities
  [
    'one short day',
    everyDay,
    facts({ activities: [1, 1, 2, 3, 3].map((day) => activity(day)), days: 3 }),
    { detail: 'Day 2 has 1', met: false }
  ],
  [
    'several short days',
    everyDay,
    facts({ activities: [activity(1)], days: 3 }),
    { detail: 'Short on days 1, 2, 3', met: false }
  ],
  [
    'multi-day activities count every day',
    { count: 1, kind: 'daily_activities' },
    facts({ activities: [activity(1, { endDay: 3 })], days: 3 }),
    { detail: null, met: true }
  ],
  [
    'only matching titles count',
    { count: 1, kind: 'daily_activities', titleIncludes: 'dinner' },
    facts({ activities: [activity(1, { title: 'Dinner at Taberna' }), activity(2)], days: 2 }),
    { detail: 'Day 2 has 0', met: false }
  ],
  [
    'a destination without an activity',
    { kind: 'destination_activities' },
    facts({
      activities: [activity(1)],
      destinations: [destination(lisbon, 0), destination(porto, 1)]
    }),
    { detail: '1 without an activity', met: false }
  ],
  [
    'every destination has an activity',
    { kind: 'destination_activities' },
    facts({
      activities: [activity(1), activity(2, { destinationId: porto })],
      destinations: [destination(lisbon, 0), destination(porto, 1)]
    }),
    { detail: null, met: true }
  ],
  [
    'no destinations for activities',
    { kind: 'destination_activities' },
    facts(),
    { detail: 'No destinations yet', met: false }
  ],
  [
    'activity without a time',
    { field: 'start_time', kind: 'activities_detailed' },
    facts({ activities: [activity(1, { startTime: '09:00' }), activity(2)] }),
    { detail: '1 without a start time', met: false }
  ],
  [
    'no activities to fill in',
    { field: 'cost', kind: 'activities_detailed' },
    facts(),
    { detail: 'No activities yet', met: false }
  ],
  [
    'overlapping activities',
    { kind: 'no_time_conflicts' },
    facts({
      activities: [
        activity(2, { endTime: '11:00', startTime: '09:00' }),
        activity(2, { startTime: '10:00' })
      ]
    }),
    { detail: 'Overlap on day 2', met: false }
  ],
  [
    'back-to-back activities',
    { kind: 'no_time_conflicts' },
    facts({
      activities: [
        activity(2, { endTime: '10:00', startTime: '09:00' }),
        activity(2, { startTime: '10:00' })
      ]
    }),
    { detail: null, met: true }
  ],
  // Stays
  [
    'nights without stays',
    { kind: 'nights_covered' },
    facts({ days: 3 }),
    { detail: 'No stays yet', met: false }
  ],
  [
    'a night uncovered',
    { kind: 'nights_covered' },
    facts({ days: 4, stays: [stay(1, 2), stay(3, 4)] }),
    { detail: 'No stay on night 2', met: false }
  ],
  [
    'every night covered',
    { kind: 'nights_covered' },
    facts({ days: 3, stays: [stay(1, 3)] }),
    { detail: null, met: true }
  ],
  [
    'stay without an address',
    { field: 'address', kind: 'stays_detailed' },
    facts({ stays: [{ ...stay(1, 2), address: 'Rua 1' }, stay(2, 3)] }),
    { detail: '1 without an address', met: false }
  ],
  // Getting around
  [
    'wrong mode there',
    { boundary: 'arrival', kind: 'boundary_transfer', mode: 'flight' },
    facts({
      transfers: { activity: [], boundary: [{ ...transfer, boundary: 'arrival' }], destination: [] }
    }),
    { detail: 'No arrival yet', met: false }
  ],
  [
    'there and back planned',
    { boundary: 'both', kind: 'boundary_transfer' },
    facts({
      transfers: {
        activity: [],
        boundary: [
          { ...transfer, boundary: 'arrival' },
          { ...transfer, boundary: 'departure' }
        ],
        destination: []
      }
    }),
    { detail: null, met: true }
  ],
  [
    'a leg without a transfer',
    { kind: 'legs_covered' },
    facts({ destinations: [destination(lisbon, 0), destination(porto, 1)] }),
    { detail: '1 legs without a transfer', met: false }
  ],
  [
    'every leg covered',
    { kind: 'legs_covered' },
    facts({
      destinations: [destination(lisbon, 0), destination(porto, 1)],
      transfers: {
        activity: [],
        boundary: [],
        destination: [{ ...transfer, fromDestinationId: lisbon, toDestinationId: porto }]
      }
    }),
    { detail: null, met: true }
  ],
  // Travelers and packing
  [
    'not enough going',
    { count: 3, kind: 'travelers_going' },
    facts({ travelers: [{ status: 'going' }, { status: 'going' }, { status: 'maybe' }] }),
    { detail: '2 going so far', met: false }
  ],
  [
    'enough going',
    { count: 2, kind: 'travelers_going' },
    facts({ travelers: [{ status: 'going' }, { status: 'going' }] }),
    { detail: null, met: true }
  ],
  [
    'no packing list',
    { kind: 'packing_listed' },
    facts(),
    { detail: 'No packing list yet', met: false }
  ],
  [
    'packing list started',
    { kind: 'packing_listed' },
    facts({ packing: [{ brought: 0, quantity: 1 }] }),
    { detail: null, met: true }
  ],
  [
    'nothing to pack',
    { kind: 'packing_packed' },
    facts(),
    { detail: 'No packing list yet', met: false }
  ],
  [
    'an item nobody is bringing enough of',
    { kind: 'packing_packed' },
    facts({
      packing: [
        { brought: 2, quantity: 2 },
        { brought: 1, quantity: 3 }
      ]
    }),
    { detail: '1 still need someone to bring them', met: false }
  ],
  [
    'every group item covered, over-coverage included',
    { kind: 'packing_packed' },
    facts({
      packing: [
        { brought: 2, quantity: 2 },
        { brought: 4, quantity: 3 }
      ]
    }),
    { detail: null, met: true }
  ]
])('%s', (_, clause, tripFacts, expected) => {
  expect(check(clause, tripFacts)).toMatchObject(expected);
});

test.each<[RuleClause, string]>([
  [{ count: 1, kind: 'daily_activities' }, 'Every day has at least 1 activity'],
  [
    { count: 2, kind: 'daily_activities', titleIncludes: 'dinner' },
    'Every day has at least 2 activities matching “dinner”'
  ],
  [
    { boundary: 'both', kind: 'boundary_transfer', mode: 'train' },
    'Getting there and back are planned by train'
  ],
  [{ count: 1, kind: 'travelers_going' }, 'At least 1 traveler is going'],
  [{ kind: 'destination_named', text: 'Porto' }, 'The route includes “Porto”']
])('label: %j', (clause, label) => {
  expect(clauseLabel(clause)).toBe(label);
});

test('all, any, none, and groups compose into one sentence and one answer', () => {
  const rule: IssueRule = {
    items: [
      everyDay,
      {
        clauses: [{ kind: 'nights_covered' }, { kind: 'destination_named', text: 'Porto' }],
        kind: 'group',
        match: 'any'
      }
    ],
    match: 'all'
  };
  expect(ruleLabel(rule)).toBe(
    'Every day has at least 2 activities and (every night has a place to stay or the route includes “Porto”)'
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
  expect(ruleLabel(none)).toMatch(/^None of: every day has/u);
  expect(presentRule(none, facts()).met).toBe(true);
  expect(presentRule(none, facts({ activities: busy, days: 3 })).met).toBe(false);
});

test('a rule names only the trip lists its clauses read', () => {
  expect([...ruleNeeds(single(everyDay))]).toEqual(['activities']);
  expect(ruleNeeds(single({ kind: 'within_budget' }))).toEqual(
    new Set(['activities', 'stays', 'transfers', 'travelers'])
  );
  expect(ruleNeeds(single({ kind: 'has_dates' })).size).toBe(0);
});

test('normalizing trims text and rejects rules a person must fix', () => {
  expect(
    normalizeRule(single({ count: 1, kind: 'daily_activities', titleIncludes: '  tour  ' }))
  ).toEqual(single({ count: 1, kind: 'daily_activities', titleIncludes: 'tour' }));
  expect(
    normalizeRule(single({ count: 1, kind: 'daily_activities', titleIncludes: '   ' }))
  ).toEqual(single({ count: 1, kind: 'daily_activities' }));
  expect(() => normalizeRule({ items: [], match: 'all' })).toThrow('Add at least one condition');
  expect(() => normalizeRule(single({ count: 1.5, kind: 'daily_activities' }))).toThrow(
    'whole number'
  );
  expect(() => normalizeRule(single({ count: 0, kind: 'travelers_going' }))).toThrow(
    'whole number'
  );
  expect(() => normalizeRule(single({ kind: 'destination_named', text: ' ' }))).toThrow(
    'Place must contain'
  );
  expect(() =>
    normalizeRule({ items: [{ clauses: [], kind: 'group', match: 'any' }], match: 'all' })
  ).toThrow('Groups need at least one condition');
});

/** Every value the builder can write for a field: each choice, a number, text, or unset. */
function fieldSamples(field: ClauseField): Array<number | string | undefined> {
  switch (field.type) {
    case 'number': {
      return [2];
    }
    case 'text': {
      return field.optional ? ['dinner', undefined] : ['Lisbon'];
    }
    case 'choice': {
      return [...Object.keys(field.options), ...(field.any ? [undefined] : [])];
    }
  }
}

test.each(Object.keys(clauseKinds) as Array<ClauseKind>)(
  '%s builder fields only write clauses the validator accepts',
  (kind) => {
    const base: Record<string, unknown> = createClause(kind);
    for (const field of clauseFields(kind)) {
      for (const sample of fieldSamples(field)) {
        const clause = { ...base, [field.key]: sample };
        if (sample === undefined) Reflect.deleteProperty(clause, field.key);
        expect(validate(RuleValidators.ruleClause, clause), `${field.key}=${sample}`).toBe(true);
      }
    }
  }
);

test('every kind file is in the registry, once', () => {
  const files = import.meta.glob<Record<string, { kind?: unknown }>>('./kinds/*/*.ts', {
    eager: true
  });
  const defined = Object.values(files).flatMap((exports) =>
    Object.values(exports).flatMap(({ kind }) => (typeof kind === 'string' ? [kind] : []))
  );
  const registered = clauseKindList.map(({ kind }) => kind);
  expect(new Set(registered).size).toBe(registered.length);
  expect(registered.toSorted()).toEqual(defined.toSorted());
});
