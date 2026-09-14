import { expect, test } from 'vitest';
import { selectOrderedActions } from './select-ordered-actions';
import type { ActionEntry } from './state';

function entry(id: string, insertionIndex: number, position?: number): ActionEntry {
  return {
    id,
    insertionIndex,
    props: position === undefined ? { text: id } : { text: id, position }
  };
}

test('selectOrderedActions preserves insertion order when positions are unset', () => {
  const actions = [entry('b', 1), entry('a', 0), entry('c', 2)];
  expect(selectOrderedActions(actions).map((action) => action.text)).toEqual(['a', 'b', 'c']);
});

test('selectOrderedActions sorts by explicit position when provided', () => {
  const actions = [entry('third', 0, 30), entry('first', 1, 10), entry('second', 2, 20)];
  expect(selectOrderedActions(actions).map((action) => action.text)).toEqual([
    'first',
    'second',
    'third'
  ]);
});

test('selectOrderedActions prefers positioned actions before insertion-ordered ones', () => {
  const actions = [entry('late', 2), entry('pinned', 0, 0), entry('middle', 1)];
  expect(selectOrderedActions(actions).map((action) => action.text)).toEqual([
    'pinned',
    'middle',
    'late'
  ]);
});

test('selectOrderedActions does not mutate the source array', () => {
  const actions = [entry('b', 1), entry('a', 0)];
  const copy = actions.slice();
  selectOrderedActions(actions);
  expect(actions).toEqual(copy);
});
