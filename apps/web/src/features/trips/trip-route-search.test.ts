import { expect, test } from 'vite-plus/test';
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

test('accepts a positive integer day as number or string and rejects the rest', () => {
  expect(parseTripRouteSearch({ day: 3 })).toEqual({ day: 3 });
  expect(parseTripRouteSearch({ day: '4' })).toEqual({ day: 4 });
  expect(parseTripRouteSearch({ day: 0 })).toEqual({});
  expect(parseTripRouteSearch({ day: 1.5 })).toEqual({});
  expect(parseTripRouteSearch({ day: 'x' })).toEqual({});
});
