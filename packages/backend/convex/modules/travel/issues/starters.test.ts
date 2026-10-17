import { expect, test } from 'vite-plus/test';
import type { Doc } from '#convex-generated/dataModel';
import {
  emptyRuleFacts,
  normalizeRule,
  presentRule
} from '#convex/modules/travel/issues/rules/index';
import { STARTER_ISSUES } from '#convex/modules/travel/issues/starters';

const trip = { destination: { status: 'undecided' as const } } as Doc<'trips'>;

test('titles are unique and mandatory starters come first', () => {
  const titles = STARTER_ISSUES.map((starter) => starter.title);
  expect(new Set(titles).size).toBe(titles.length);
  const flags = STARTER_ISSUES.map((starter) => starter.mandatory);
  expect(flags).toEqual(flags.toSorted((left, right) => Number(right) - Number(left)));
  expect(flags).toContain(true);
  expect(flags).toContain(false);
});

test.each(STARTER_ISSUES.map((starter) => [starter.title, starter] as const))(
  '%s uses one normalized clause and starts unmet',
  (_title, starter) => {
    expect(starter.rule.match).toBe('all');
    expect(starter.rule.items).toHaveLength(1);
    expect(normalizeRule(starter.rule)).toEqual(starter.rule);
    expect(starter.body(trip).length).toBeGreaterThan(0);
    expect(presentRule(starter.rule, emptyRuleFacts(trip)).met).toBe(false);
  }
);

test('the dates body quotes the trimmed date notes', () => {
  const dates = STARTER_ISSUES.find((starter) => starter.title === 'Agree on the travel dates');
  expect(dates?.body({ ...trip, dateNotes: '  late May ' })).toContain('So far: “late May”.');
  expect(dates?.body({ ...trip, dateNotes: '  ' })).not.toContain('So far');
});
