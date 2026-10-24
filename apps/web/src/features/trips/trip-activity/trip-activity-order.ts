import type { ActivityDays, ActivityOrderIssue } from '@/types/trips';

export type { ActivityDays, ActivityOrderIssue };

export function activityDaysNeedReordering(activities: readonly ActivityDays[]): boolean {
  let previousDay: number | null = null;
  for (const activity of activities) {
    if (previousDay !== null && activity.dayNumber < previousDay) return true;
    previousDay = activity.dayNumber;
  }
  return false;
}

export function activityOrderIssue(
  activity: ActivityDays,
  nextActivity: ActivityDays
): ActivityOrderIssue | null {
  if (nextActivity.dayNumber < activity.dayNumber) return 'out_of_order';
  if (activity.endDayNumber > nextActivity.dayNumber) return 'overlap';
  return null;
}

export function activityReorderClearsTravel<Identifier>(
  activities: readonly (ActivityDays & {
    id: Identifier;
    transferToNext: null | { toActivityId: Identifier };
  })[]
): boolean {
  const ordered = activities.toSorted((left, right) => left.dayNumber - right.dayNumber);
  return ordered.some((activity, index) => {
    const transfer = activity.transferToNext;
    return transfer !== null && transfer.toActivityId !== ordered[index + 1]?.id;
  });
}
