import { expect, test } from 'vitest';
import { parseIdeaCloneSearch } from './idea-clone-search';

test('parseIdeaCloneSearch keeps only add-destination search state', () => {
  expect(parseIdeaCloneSearch({})).toEqual({});
  expect(parseIdeaCloneSearch({ addDestination: true })).toEqual({ addDestination: true });
  expect(parseIdeaCloneSearch({ addDestination: false })).toEqual({});
  expect(parseIdeaCloneSearch({ view: 'compare' })).toEqual({});
});
