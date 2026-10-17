import { expect, test } from 'vite-plus/test';
import type { Id } from '#convex-generated/dataModel';
import { presentCondition } from '#convex/modules/travel/issues/condition';
import {
  emptyRuleFacts,
  presentRule,
  type RuleFacts
} from '#convex/modules/travel/issues/rules/index';
import { STARTER_ISSUES } from '#convex/modules/travel/issues/starters';

const known = { name: 'Lisbon', status: 'known' as const };
const lisbon = 'destination-lisbon' as Id<'tripDestinations'>;
const porto = 'destination-porto' as Id<'tripDestinations'>;

/** Rule facts with only what a case sets; checks read nothing else. */
const facts = (
  trip: Partial<RuleFacts['trip']> = {},
  lists: Partial<Omit<RuleFacts, 'trip'>> = {}
): RuleFacts => ({
  ...emptyRuleFacts({ destination: { status: 'undecided' }, ...trip }),
  ...lists
});
const destination = (_id: Id<'tripDestinations'>) =>
  ({ _id, name: 'Somewhere', position: 0 }) as RuleFacts['destinations'][number];
const activityIn = (destinationId: Id<'tripDestinations'>) =>
  ({ destinationId, schedule: { day: 1 }, title: 'Walk' }) as RuleFacts['activities'][number];
const stay = (checkInDay: number, checkOutDay: number) =>
  ({ schedule: { checkInDay, checkOutDay } }) as RuleFacts['stays'][number];

/** The starter decision named by its title, so the cases read like the board. */
const starter = (title: string) => {
  const found = STARTER_ISSUES.find((entry) => entry.title === title);
  if (!found) throw new Error(`No starter ${title}`);
  return found.rule;
};

test.each([
  ['Choose where to go', 'is undecided', facts(), false],
  ['Choose where to go', 'is known', facts({ destination: known }), true],
  ['Agree on the travel dates', 'has only date notes', facts(), false],
  ['Agree on the travel dates', 'has a start date', facts({ startDate: '2027-06-01' }), true],
  ['Decide how many days', 'is missing', facts(), false],
  ['Decide how many days', 'is empty', facts({ duration: {} }), false],
  ['Decide how many days', 'has total days', facts({ duration: { totalDays: 5 } }), true],
  ['Decide how many days', 'has ideal days', facts({ duration: { idealDays: 5 } }), true],
  ['Decide how many days', 'has minimum days', facts({ duration: { minimumDays: 3 } }), true],
  ['Set a group budget', 'has no budget', facts(), false],
  ['Set a group budget', 'has a budget', facts({ budget: { amount: 0 } }), true],
  ['Write the packing list', 'has an empty packing list', facts(), false],
  [
    'Write the packing list',
    'has a packing item',
    facts({}, { packing: [{ packed: false }] }),
    true
  ],
  ['Plan something in every destination', 'has no destinations', facts(), false],
  [
    'Plan something in every destination',
    'has a destination without activities',
    facts({}, { destinations: [destination(lisbon)] }),
    false
  ],
  [
    'Plan something in every destination',
    'has one of two destinations planned',
    facts(
      {},
      {
        activities: [activityIn(lisbon)],
        destinations: [destination(lisbon), destination(porto)]
      }
    ),
    false
  ],
  [
    'Plan something in every destination',
    'has every destination planned',
    facts(
      {},
      {
        activities: [activityIn(lisbon), activityIn(porto)],
        destinations: [destination(lisbon), destination(porto)]
      }
    ),
    true
  ]
] as const)('%s when the trip %s', (title, _state, tripFacts, expected) => {
  expect(presentRule(starter(title), tripFacts).met).toBe(expected);
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
])('Book places to stay: %s', (_name, days, stays, expected) => {
  const duration = days === undefined ? undefined : { totalDays: days };
  expect(presentRule(starter('Book places to stay'), facts({ duration }, { stays })).met).toBe(
    expected
  );
});

test('presents starter rules as locked rules and manual conditions without met', () => {
  const dates = {
    kind: 'rule' as const,
    rule: starter('Agree on the travel dates'),
    starter: true
  };
  expect(presentCondition(undefined, facts())).toBeNull();
  expect(presentCondition(dates, facts())).toMatchObject({
    kind: 'rule',
    label: 'The trip has travel dates',
    met: false,
    refusal: 'This closes itself once the trip has travel dates. Start an idea that gets it there.',
    starter: true
  });
  expect(presentCondition(dates, facts({ startDate: '2027-06-01' }))).toMatchObject({
    met: true,
    refusal:
      'Settled automatically: The trip has travel dates. Change the trip through an idea to reopen it.'
  });
  expect(presentCondition({ kind: 'manual', text: 'Everyone voted' }, facts())).toEqual({
    kind: 'manual',
    label: 'Everyone voted',
    met: null
  });
});
