import { expect, test } from 'vite-plus/test';
import type { Id } from '#convex-generated/dataModel';
import {
  conditionMet,
  presentCondition,
  type ConditionFacts
} from '#convex/modules/travel/issues/condition';
import { emptyRuleFacts } from '#convex/modules/travel/issues/rules/index';

const undecided = { status: 'undecided' as const };
const known = { name: 'Lisbon', status: 'known' as const };
const stay = (checkInDay: number, checkOutDay: number) => ({
  schedule: { checkInDay, checkOutDay }
});
const facts = (
  trip: Partial<ConditionFacts['trip']> = {},
  stays: ConditionFacts['stays'] = [],
  lists: Partial<Omit<ConditionFacts, 'stays' | 'trip'>> = {}
): ConditionFacts => ({
  activities: [],
  destinations: [],
  packing: [],
  ...lists,
  stays,
  trip: { destination: undecided, ...trip }
});
const lisbon = 'destination-lisbon' as Id<'tripDestinations'>;
const porto = 'destination-porto' as Id<'tripDestinations'>;

test.each([
  ['destination', 'is undecided', facts(), false],
  ['destination', 'is known', facts({ destination: known }), true],
  ['dates', 'has only date notes', facts(), false],
  ['dates', 'has a start date', facts({ startDate: '2027-06-01' }), true],
  ['duration', 'is missing', facts(), false],
  ['duration', 'is empty', facts({ duration: {} }), false],
  ['duration', 'has total days', facts({ duration: { totalDays: 5 } }), true],
  ['duration', 'has ideal days', facts({ duration: { idealDays: 5 } }), true],
  ['duration', 'has minimum days', facts({ duration: { minimumDays: 3 } }), true],
  ['budget', 'has no budget', facts(), false],
  ['budget', 'has a budget', facts({ budget: { amount: 0 } }), true],
  ['packing', 'has an empty packing list', facts(), false],
  ['packing', 'has a packing item', facts({}, [], { packing: [{ packed: false }] }), true],
  ['activities', 'has no destinations', facts(), false],
  [
    'activities',
    'has a destination without activities',
    facts({}, [], { destinations: [{ _id: lisbon }] }),
    false
  ],
  [
    'activities',
    'has one of two destinations planned',
    facts({}, [], {
      activities: [{ destinationId: lisbon }],
      destinations: [{ _id: lisbon }, { _id: porto }]
    }),
    false
  ],
  [
    'activities',
    'has every destination planned',
    facts({}, [], {
      activities: [{ destinationId: lisbon }, { destinationId: porto }],
      destinations: [{ _id: lisbon }, { _id: porto }]
    }),
    true
  ]
] as const)('%s check when the trip %s', (check, _state, tripFacts, expected) => {
  expect(conditionMet(check, tripFacts)).toBe(expected);
});

test.each([
  ['no length', undefined, [stay(1, 3)], false],
  ['no stays', 4, [], false],
  ['one stay for the whole trip', 4, [stay(1, 4)], true],
  ['stays that chain', 4, [stay(1, 2), stay(2, 4)], true],
  ['a gap on night 2', 4, [stay(1, 2), stay(3, 4)], false],
  ['the last night missing', 4, [stay(1, 3)], false],
  ['the first night missing', 4, [stay(2, 4)], false],
  ['overlapping stays', 5, [stay(1, 3), stay(2, 5)], true],
  ['a one-day trip with a stay', 1, [stay(1, 1)], true],
  ['a one-day trip without one', 1, [], false]
])('stays: %s', (_name, days, stays, expected) => {
  const duration = days === undefined ? undefined : { totalDays: days };
  expect(conditionMet('stays', facts({ duration }, stays))).toBe(expected);
});

test('presents auto conditions with a label and manual ones without met', () => {
  expect(presentCondition(undefined, emptyRuleFacts(facts().trip))).toBeNull();
  expect(presentCondition({ check: 'dates', kind: 'auto' }, emptyRuleFacts(facts().trip))).toEqual({
    check: 'dates',
    kind: 'auto',
    label: 'The trip has travel dates',
    met: false,
    refusal: 'This closes itself once the trip has travel dates. Start an idea that adds them.'
  });
  expect(
    presentCondition(
      { check: 'dates', kind: 'auto' },
      emptyRuleFacts(facts({ startDate: '2027-06-01' }).trip)
    )
  ).toMatchObject({
    met: true,
    refusal:
      'Settled automatically: The trip has travel dates. Change the trip through an idea to reopen it.'
  });
  expect(
    presentCondition({ kind: 'manual', text: 'Everyone voted' }, emptyRuleFacts(facts().trip))
  ).toEqual({
    kind: 'manual',
    label: 'Everyone voted',
    met: null
  });
});
