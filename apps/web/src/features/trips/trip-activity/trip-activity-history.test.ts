import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
import { filterTripActivity } from '@/features/trips/hooks/trip-activity-history-filter';
import type { TripDetail } from '@/features/trips/hooks/use-trips';

const activity = [
  {
    actorName: 'Alex Traveler',
    actorUserId: 'user-alex-1',
    createdAt: 3,
    id: 'activity-3' as Id<'tripAuditEvents'>,
    message: 'Alex Traveler updated the itinerary activity Museum visit',
    type: 'itinerary_activity_updated'
  },
  {
    actorName: 'Sam Planner',
    actorUserId: 'user-sam',
    createdAt: 2,
    id: 'activity-2' as Id<'tripAuditEvents'>,
    message: 'Sam Planner applied the route update',
    type: 'proposed_version_merged'
  },
  {
    actorName: 'Alex Traveler',
    actorUserId: 'user-alex-2',
    createdAt: 1,
    id: 'activity-1' as Id<'tripAuditEvents'>,
    message: 'Alex Traveler created the trip in Idea & Group',
    type: 'trip_created'
  }
] satisfies TripDetail['activity'];

const allFilters = {
  activityType: 'all-activity-types',
  query: '',
  userId: 'all-activity-users'
} as const;

describe('filterTripActivity', () => {
  test('filters people by stable user id when names are identical', () => {
    expect(
      filterTripActivity(activity, { ...allFilters, userId: 'user-alex-2' }).map(({ id }) => id)
    ).toEqual(['activity-1']);
  });

  test('filters by action type', () => {
    expect(
      filterTripActivity(activity, {
        ...allFilters,
        activityType: 'proposed_version_merged'
      }).map(({ id }) => id)
    ).toEqual(['activity-2']);
  });

  test('searches messages, people, and friendly action labels case-insensitively', () => {
    expect(
      filterTripActivity(activity, { ...allFilters, query: 'MUSEUM' }).map(({ id }) => id)
    ).toEqual(['activity-3']);
    expect(
      filterTripActivity(activity, { ...allFilters, query: 'sam planner' }).map(({ id }) => id)
    ).toEqual(['activity-2']);
    expect(
      filterTripActivity(activity, { ...allFilters, query: 'trip created' }).map(({ id }) => id)
    ).toEqual(['activity-1']);
  });

  test('combines active filters', () => {
    expect(
      filterTripActivity(activity, {
        activityType: 'itinerary_activity_updated',
        query: 'museum',
        userId: 'user-alex-1'
      })
    ).toHaveLength(1);
    expect(
      filterTripActivity(activity, {
        activityType: 'trip_created',
        query: 'museum',
        userId: 'user-alex-1'
      })
    ).toEqual([]);
  });
});
