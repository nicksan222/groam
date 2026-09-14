import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
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
  test('starts with all people and actions visible', () => {
    const { result } = renderHook(() => useTripActivityFilters(activity));
    expect(result.current.visibleActivity).toHaveLength(2);
    expect(result.current.hasExtraFilters).toBe(false);
    expect(result.current.eventCountLabel).toBe('2 events');
    expect(result.current.people).toEqual([
      { name: 'Ada', userId: 'user-1' },
      { name: 'Ben', userId: 'user-2' }
    ]);
  });

  test('filters by person and clears extras', () => {
    const { result } = renderHook(() => useTripActivityFilters(activity));

    act(() => {
      result.current.setUserId('user-2');
    });
    expect(result.current.visibleActivity.map((item) => item.id)).toEqual(['a2']);
    expect(result.current.hasExtraFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.visibleActivity).toHaveLength(2);
    expect(result.current.hasExtraFilters).toBe(false);
  });
});
