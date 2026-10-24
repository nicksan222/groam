import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { useTripActivityFilters } from './use-trip-activity-filters';
import type { TripDetail } from './use-trips';

const activity: TripDetail['activity'] = [
  {
    actorName: 'Ada',
    actorUserId: 'user-1',
    createdAt: 1,
    id: 'a1' as Id<'tripAuditEvents'>,
    message: 'added Lisbon',
    type: 'destination_added'
  },
  {
    actorName: 'Ben',
    actorUserId: 'user-2',
    createdAt: 2,
    id: 'a2' as Id<'tripAuditEvents'>,
    message: 'updated stay',
    type: 'stay_updated'
  }
];

describe('useTripActivityFilters', () => {
  test('starts with all people and actions visible', async () => {
    const { result } = await renderHook(() => useTripActivityFilters(activity));
    expect(result.current.visibleActivity).toHaveLength(2);
    expect(result.current.hasExtraFilters).toBe(false);
    expect(result.current.people).toEqual([
      { name: 'Ada', userId: 'user-1' },
      { name: 'Ben', userId: 'user-2' }
    ]);
  });

  test('filters by person and clears extras', async () => {
    const { result } = await renderHook(() => useTripActivityFilters(activity));

    await act(() => {
      result.current.setUserId('user-2');
    });
    expect(result.current.visibleActivity.map((item) => item.id)).toEqual(['a2']);
    expect(result.current.hasExtraFilters).toBe(true);

    await act(() => {
      result.current.clearFilters();
    });
    expect(result.current.visibleActivity).toHaveLength(2);
    expect(result.current.hasExtraFilters).toBe(false);
  });
});

test('combines repeated person values with action and free text', async () => {
  const { result } = await renderHook(() => useTripActivityFilters(activity));
  await act(() => result.current.setQuery('person:ada person:ben action:stay-changed updated'));
  expect(result.current.visibleActivity.map((item) => item.id)).toEqual(['a2']);
  await act(() => result.current.setQuery('action:unknown'));
  expect(result.current.visibleActivity).toHaveLength(0);
  expect(result.current.empty).toBe('No matching activity.');
});

test('gives people with duplicate names distinct stable filter values', async () => {
  const duplicates = activity.map((item) => ({ ...item, actorName: 'Sam' }));
  const { result } = await renderHook(() => useTripActivityFilters(duplicates));
  expect(
    result.current.facets.find((facet) => facet.key === 'person')?.values.map(({ value }) => value)
  ).toEqual(['sam', 'sam-2']);
  await act(() => result.current.setQuery('person:sam-2'));
  expect(result.current.visibleActivity.map((item) => item.id)).toEqual(['a2']);
});
