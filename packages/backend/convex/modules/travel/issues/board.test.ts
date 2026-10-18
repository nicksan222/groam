import { expect, test } from 'vite-plus/test';
import type { Doc, Id } from '#convex-generated/dataModel';
import {
  bottomRank,
  compareByRank,
  insertionIndex,
  laneIn,
  RANK_STEP
} from '#convex/modules/travel/issues/board';

type Row = Doc<'tripIssues'>;

function row(id: string, fields: { created?: number; rank?: number; status?: Row['status'] } = {}) {
  return {
    _creationTime: fields.created ?? 0,
    _id: id as Id<'tripIssues'>,
    boardRank: fields.rank ?? 0,
    status: fields.status ?? 'open'
  } as Row;
}

test('compareByRank orders by rank, then creation time', () => {
  const sorted = [
    row('c', { created: 3, rank: 2 }),
    row('b', { created: 2, rank: 2 }),
    row('a', { created: 9, rank: 1 })
  ].toSorted(compareByRank);
  expect(sorted.map((entry) => entry._id)).toEqual(['a', 'b', 'c']);
});

test('laneIn filters by status and sorts', () => {
  const issues = [
    row('x', { rank: 20 }),
    row('y', { rank: 10, status: 'closed' }),
    row('z', { rank: 5 })
  ];
  expect(laneIn(issues, 'open').map((entry) => entry._id)).toEqual(['z', 'x']);
  expect(laneIn(issues, 'closed').map((entry) => entry._id)).toEqual(['y']);
});

test('bottomRank goes one step below the last card, or starts a lane', () => {
  expect(bottomRank([])).toBe(RANK_STEP);
  expect(bottomRank([row('a', { rank: 5 }), row('b', { rank: 40 })])).toBe(40 + RANK_STEP);
});

test('insertionIndex prefers above, then below, then the bottom', () => {
  const lane = [row('a'), row('b'), row('c')];
  const id = (value: string) => value as Id<'tripIssues'>;
  expect(insertionIndex(lane, { above: id('a') })).toBe(1);
  expect(insertionIndex(lane, { below: id('c') })).toBe(2);
  expect(insertionIndex(lane, { above: id('b'), below: id('a') })).toBe(2);
  expect(insertionIndex(lane, { above: id('gone'), below: id('b') })).toBe(1);
  expect(insertionIndex(lane, { above: id('gone') })).toBe(3);
  expect(insertionIndex(lane, {})).toBe(3);
  expect(insertionIndex([], {})).toBe(0);
});
