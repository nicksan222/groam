const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const absoluteDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

export function chatTimestamp(timestamp: number, now = Date.now()): string {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (timestamp >= startOfToday.getTime()) return timeFormatter.format(timestamp);
  if (timestamp >= startOfYesterday.getTime()) return 'Yesterday';

  const days = Math.round((timestamp - now) / 86_400_000);
  if (Math.abs(days) < 7) return relativeFormatter.format(days, 'day');
  return absoluteDateFormatter.format(timestamp);
}
