import { useMemo } from 'react';
import {
  ALL_ACTIVITY_TYPES,
  ALL_ACTIVITY_USERS,
  activityPeople,
  activityTypeLabels,
  activityTypes,
  filterTripActivity
} from '@/features/trips/hooks/trip-activity-history-filter';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useTripActivityFilterState } from '@/lib/stores/trip-activity-filter-store';

export { ALL_ACTIVITY_TYPES, ALL_ACTIVITY_USERS, activityTypeLabels };

export function useTripActivityFilters(activity: TripDetail['activity']) {
  const { activityType, clearFilters, query, setActivityType, setQuery, setUserId, userId } =
    useTripActivityFilterState();
  const people = useMemo(() => activityPeople(activity), [activity]);
  const availableTypes = useMemo(() => activityTypes(activity), [activity]);
  const visibleActivity = useMemo(
    () =>
      filterTripActivity(activity, {
        activityType,
        query: '',
        userId
      }),
    [activity, activityType, userId]
  );
  const selectedPerson = people.find((person) => person.userId === userId);
  const hasExtraFilters = userId !== ALL_ACTIVITY_USERS || activityType !== ALL_ACTIVITY_TYPES;
  const empty =
    query.trim() !== '' || hasExtraFilters
      ? 'No matching activity.'
      : 'No activity on this trip yet.';
  const eventCountLabel = activity.length === 1 ? '1 event' : `${activity.length} events`;

  return {
    activityType,
    availableTypes,
    clearFilters,
    empty,
    eventCountLabel,
    hasExtraFilters,
    people,
    query,
    selectedPerson,
    setActivityType,
    setQuery,
    setUserId,
    userId,
    visibleActivity
  };
}
