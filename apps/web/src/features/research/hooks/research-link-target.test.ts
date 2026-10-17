import { expect, test } from 'vite-plus/test';
import type { ResearchLinkTarget } from '@/types/research';
import { fromBackendTarget, toBackendTarget } from './research-link-target';

test.each<ResearchLinkTarget>([
  { id: 'a', kind: 'issue' },
  { id: 'a', kind: 'idea' },
  { id: 'a', kind: 'destination' },
  { id: 'a', kind: 'activity' },
  { id: 'a', kind: 'stay' }
])('round-trips a $kind target', (target) => {
  expect(fromBackendTarget(toBackendTarget(target))).toEqual(target);
});

test('maps itinerary kinds under tripTarget', () => {
  expect(toBackendTarget({ id: 's1', kind: 'stay' })).toEqual({
    kind: 'tripTarget',
    target: { id: 's1', type: 'stay' }
  });
});
