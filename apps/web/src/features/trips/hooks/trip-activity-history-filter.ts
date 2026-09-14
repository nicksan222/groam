import type { ActivityType, TripActivityFilters, TripActivityItem } from '@/types/trips';
import type { TripDetail } from './use-trips';

export const ALL_ACTIVITY_TYPES = 'all-activity-types';
export const ALL_ACTIVITY_USERS = 'all-activity-users';

export type { ActivityType, TripActivityFilters, TripActivityItem };

export const activityTypeLabels: Record<ActivityType, string> = {
  activity_transfer_removed: 'Activity travel removed',
  activity_transfer_updated: 'Activity travel updated',
  boundary_transfer_removed: 'Boundary travel removed',
  boundary_transfer_updated: 'Boundary travel updated',
  cover_updated: 'Cover updated',
  destination_added: 'Destination added',
  destination_removed: 'Destination removed',
  destination_transfer_removed: 'Destination travel removed',
  destination_transfer_updated: 'Destination travel updated',
  destination_updated: 'Destination updated',
  details_updated: 'Trip details updated',
  itinerary_activity_added: 'Itinerary activity added',
  itinerary_activity_removed: 'Itinerary activity removed',
  itinerary_activity_updated: 'Itinerary activity updated',
  stay_added: 'Stay added',
  stay_removed: 'Stay removed',
  stay_updated: 'Stay updated',
  member_role_updated: 'Member role updated',
  proposed_version_created: 'Proposed version created',
  proposed_version_merged: 'Idea applied',
  trip_archived: 'Trip archived',
  trip_created: 'Trip created',
  trip_restored: 'Trip restored'
};

export function filterTripActivity(activity: TripDetail['activity'], filters: TripActivityFilters) {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase();

  return activity.filter((item) => {
    if (filters.userId !== ALL_ACTIVITY_USERS && item.actorUserId !== filters.userId) return false;
    if (filters.activityType !== ALL_ACTIVITY_TYPES && item.type !== filters.activityType) {
      return false;
    }
    if (normalizedQuery === '') return true;

    return `${item.actorName} ${item.message} ${activityTypeLabels[item.type]}`
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}

export function activityPeople(activity: TripDetail['activity']) {
  const people = new Map<string, string>();
  for (const item of activity) {
    if (!people.has(item.actorUserId)) people.set(item.actorUserId, item.actorName);
  }
  return [...people]
    .map(([userId, name]) => ({ name, userId }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function activityTypes(activity: TripDetail['activity']) {
  const types = new Set<ActivityType>();
  for (const item of activity) types.add(item.type);
  return [...types].sort((left, right) =>
    activityTypeLabels[left].localeCompare(activityTypeLabels[right])
  );
}
