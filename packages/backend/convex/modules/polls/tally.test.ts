import { expect, test } from 'vite-plus/test';
import { pollSummary, ruleLabel, ruleMet, tallyPoll } from '#convex/modules/polls/tally';

const options = [
  { id: 'o1', label: 'Sushi' },
  { id: 'o2', label: 'Tapas' }
];
const people = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    name: `P${index + 1}`,
    userId: `u${index + 1}`
  }));

test('zero eligible voters never meet allVoted, percent quorum, or majority', () => {
  const tally = tallyPoll(options, [], []);
  expect(ruleMet({ kind: 'allVoted' }, tally, false)).toBe(false);
  expect(ruleMet({ kind: 'quorum', percent: 50 }, tally, false)).toBe(false);
  expect(ruleMet({ kind: 'optionVotes', majority: true }, tally, false)).toBe(false);
});

test('votes from people who are no longer eligible do not count', () => {
  const tally = tallyPoll(
    options,
    [
      { optionIds: ['o1'], userId: 'gone' },
      { optionIds: ['o1'], userId: 'u1' }
    ],
    people(2)
  );
  expect(tally.votedCount).toBe(1);
  expect(tally.tallies).toEqual([
    { count: 1, id: 'o1', label: 'Sushi' },
    { count: 0, id: 'o2', label: 'Tapas' }
  ]);
});

test('multi-select majority counts each option against all eligible voters', () => {
  const tally = tallyPoll(
    options,
    [
      { optionIds: ['o1', 'o2'], userId: 'u1' },
      { optionIds: ['o1'], userId: 'u2' },
      { optionIds: ['o2'], userId: 'u3' }
    ],
    people(4)
  );
  expect(ruleMet({ kind: 'optionVotes', majority: true }, tally, false)).toBe(false);
  const more = tallyPoll(
    options,
    [
      { optionIds: ['o1'], userId: 'u4' },
      { optionIds: ['o1', 'o2'], userId: 'u1' },
      { optionIds: ['o1'], userId: 'u2' }
    ],
    people(4)
  );
  expect(ruleMet({ kind: 'optionVotes', majority: true }, more, false)).toBe(true);
});

test('quorum, min, and closed rules', () => {
  const tally = tallyPoll(
    options,
    [
      { optionIds: ['o1'], userId: 'u1' },
      { optionIds: ['o1'], userId: 'u2' }
    ],
    people(5)
  );
  expect(ruleMet({ count: 2, kind: 'quorum' }, tally, false)).toBe(true);
  expect(ruleMet({ kind: 'quorum', percent: 50 }, tally, false)).toBe(false);
  expect(ruleMet({ kind: 'optionVotes', min: 2 }, tally, false)).toBe(true);
  expect(ruleMet({ kind: 'closed' }, tally, false)).toBe(false);
  expect(ruleMet({ kind: 'closed' }, tally, true)).toBe(true);
});

test('summary reads like the spec example', () => {
  const tally = tallyPoll(
    options,
    [
      ...['u1', 'u2', 'u3', 'u4'].map((userId) => ({ optionIds: ['o1'], userId })),
      { optionIds: ['o2'], userId: 'u5' }
    ],
    people(6)
  );
  expect(
    pollSummary('Dinner Friday', tally, ruleLabel({ kind: 'optionVotes', majority: true }))
  ).toBe("majority for 'Dinner Friday' — Sushi 4, Tapas 1; 5 of 6 voted");
});

test('every rule has a readable label', () => {
  expect(ruleLabel({ kind: 'allVoted' })).toBe('everyone voted');
  expect(ruleLabel({ count: 3, kind: 'quorum' })).toBe('3 votes');
  expect(ruleLabel({ kind: 'quorum', percent: 60 })).toBe('60% voted');
  expect(ruleLabel({ kind: 'optionVotes', min: 2 })).toBe('an option reached 2 votes');
  expect(ruleLabel({ kind: 'closed' })).toBe('poll closed');
});

test('an option minimum is unmet below the threshold and empty votes never count', () => {
  const tally = tallyPoll(
    options,
    [
      { optionIds: ['o1'], userId: 'u1' },
      { optionIds: [], userId: 'u2' }
    ],
    people(3)
  );
  expect(tally.votedCount).toBe(1);
  expect(tally.voted).toEqual([{ name: 'P1', userId: 'u1' }]);
  expect(ruleMet({ kind: 'optionVotes', min: 2 }, tally, false)).toBe(false);
  expect(ruleMet({ kind: 'quorum', percent: 30 }, tally, false)).toBe(true);
  expect(ruleMet({ kind: 'allVoted' }, tally, false)).toBe(false);
});
