import { expect, test } from 'vite-plus/test';
import { currentTripSection } from './current-trip-section';

test.each([
  [{ section: 'packing' }, 'packing'],
  [{ section: 'plan' }, 'plan'],
  [{ section: 'overview' }, null],
  [{ section: 'calendar' }, 'calendar'],
  [{ section: 'decide' }, null],
  [{ proposalId: 'prop', tripId: 'abc' }, 'ideas'],
  [{ issueId: 'iss' }, 'issues'],
  [{ researchId: 'res', tripId: 'abc' }, 'research'],
  [{ section: 'nonsense' }, null],
  [{}, null]
])('params %j resolve to section %s', (params, expected) => {
  expect(currentTripSection(params)).toBe(expected);
});
