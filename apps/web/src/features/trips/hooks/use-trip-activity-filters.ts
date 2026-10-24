import { listSearchPersonSlugs, listSearchSlug, parseListSearch } from '@groam/ui/components/list';
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

export function useTripActivityFilters(activity: TripDetail['activity']) {
  const { activityType, clearFilters, query, setActivityType, setQuery, setUserId, userId } =
    useTripActivityFilterState();
  const people = useMemo(() => activityPeople(activity), [activity]);
  const availableTypes = useMemo(() => activityTypes(activity), [activity]);
  const personSlugs = useMemo(
    () =>
      listSearchPersonSlugs(
        people.map(({ name, userId: key }) => ({ key, name })),
        []
      ),
    [people]
  );
  const facets = useMemo(
    () => [
      {
        description: 'Who made the change',
        key: 'person',
        values: [...personSlugs].map(([value, userId]) => ({
          description: people.find((person) => person.userId === userId)?.name,
          value
        }))
      },
      {
        description: 'What changed',
        key: 'action',
        values: availableTypes.map((type) => ({
          description: activityTypeLabels[type],
          value: listSearchSlug(activityTypeLabels[type])
        }))
      }
    ],
    [availableTypes, people, personSlugs]
  );
  const parsed = useMemo(() => parseListSearch(query, ['person', 'action']), [query]);
  const visibleActivity = useMemo(
    () =>
      filterTripActivity(activity, {
        activityType,
        query: parsed.text,
        userId
      }).filter((item) => {
        const peopleFilter = parsed.filters.person;
        if (
          peopleFilter &&
          !peopleFilter.some((value) => personSlugs.get(value) === item.actorUserId)
        )
          return false;
        const actions = parsed.filters.action;
        return !actions || actions.includes(listSearchSlug(activityTypeLabels[item.type]));
      }),
    [activity, activityType, parsed, personSlugs, userId]
  );
  const selectedPerson = people.find((person) => person.userId === userId);
  const hasExtraFilters = userId !== ALL_ACTIVITY_USERS || activityType !== ALL_ACTIVITY_TYPES;
  const empty =
    query.trim() !== '' || hasExtraFilters
      ? 'No matching activity.'
      : 'No activity on this trip yet.';

  return {
    activityType,
    availableTypes,
    clearFilters,
    empty,
    facets,
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
