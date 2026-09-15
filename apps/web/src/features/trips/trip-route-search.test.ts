import { expect, test } from 'vitest';
import { parseTripRouteSearch } from './trip-route-search';

test('preserves addressable trip workflow state', () => {
  expect(
    parseTripRouteSearch({
      addDestination: true,
      issue: 'jh7a2b4c6d8e0f1g3h5j7k9m',
      proposal: 'mn9k7j5h3g1f0e8d6c4b2a1z'
    })
  ).toEqual({
    addDestination: true,
    issue: 'jh7a2b4c6d8e0f1g3h5j7k9m',
    proposal: 'mn9k7j5h3g1f0e8d6c4b2a1z'
  });
});

test('discards malformed and empty workflow state', () => {
  expect(
    parseTripRouteSearch({
      addDestination: 'true',
      commentTarget: 42,
      issue: '',
      proposal: null
    })
  ).toEqual({});
});
