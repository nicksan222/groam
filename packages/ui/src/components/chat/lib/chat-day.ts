const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Whether two instants fall on the same local calendar day. */
export function isSameChatDay(left: number, right: number): boolean {
  return startOfDay(left) === startOfDay(right);
}

/** The label of a day separator: Today, Yesterday, a weekday this week, or a date. */
export function chatDayLabel(time: number, now: number = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const date = new Date(time);
  if (days > 1 && days < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    ...(sameYear ? {} : { year: 'numeric' })
  });
}
