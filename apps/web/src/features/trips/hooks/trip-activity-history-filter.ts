import type { ActivityType, TripActivityFilters, TripActivityItem } from '@/types/trips';
import type { TripDetail } from './use-trips';

export const ALL_ACTIVITY_TYPES = 'all-activity-types';
export const ALL_ACTIVITY_USERS = 'all-activity-users';

export type { ActivityType, TripActivityFilters, TripActivityItem };

/** What each kind of event is called in the action filter, in plain words. */
export const activityTypeLabels: Record<ActivityType, string> = {
  activity_transfer_removed: 'Travel between activities removed',
  activity_transfer_updated: 'Travel between activities changed',
  boundary_transfer_removed: 'Arrival or departure removed',
  boundary_transfer_updated: 'Arrival or departure changed',
  cover_updated: 'Cover changed',
  destination_added: 'Destination added',
  destination_removed: 'Destination removed',
  destination_transfer_removed: 'Travel between destinations removed',
  destination_transfer_updated: 'Travel between destinations changed',
  destination_updated: 'Destination changed',
  details_updated: 'Trip details changed',
  itinerary_activity_added: 'Activity added',
  itinerary_activity_removed: 'Activity removed',
  itinerary_activity_updated: 'Activity changed',
  stay_added: 'Stay added',
  stay_removed: 'Stay removed',
  stay_updated: 'Stay changed',
  member_role_updated: 'Role changed',
  proposed_version_created: 'Idea started',
  proposed_version_merged: 'Idea applied',
  trip_archived: 'Trip archived',
  trip_created: 'Trip created',
  trip_restored: 'Trip restored'
};

/** The event as the viewer reads it: their own actions start with "You", not their name. */
export function activityMessage(item: TripActivityItem, viewerUserId: string | undefined) {
  if (item.actorUserId !== viewerUserId || !item.message.startsWith(item.actorName)) {
    return item.message;
  }
  return `You${item.message.slice(item.actorName.length)}`;
}

const dayFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
const dayWithYearFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

/** "Today", "Yesterday", or the date, for the heading above a day's events. */
export function activityDayLabel(at: number, now = Date.now()) {
  const day = (time: number) => new Date(time).setHours(0, 0, 0, 0);
  const daysAgo = Math.round((day(now) - day(at)) / 86_400_000);
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  const sameYear = new Date(at).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? dayFormatter : dayWithYearFormatter).format(at);
}

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
