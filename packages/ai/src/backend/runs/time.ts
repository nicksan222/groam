const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const absoluteDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export function agentRunTime(timestamp: number, now = Date.now()): string {
  const deltaMs = timestamp - now;
  const minutes = Math.round(deltaMs / MINUTE_MS);
  if (Math.abs(minutes) < 1) return 'Just now';
  if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, 'minute');
  const hours = Math.round(deltaMs / HOUR_MS);
  if (Math.abs(hours) < 24) return relativeFormatter.format(hours, 'hour');
  const days = Math.round(deltaMs / DAY_MS);
  if (Math.abs(days) < 7) return relativeFormatter.format(days, 'day');
  return absoluteDateFormatter.format(timestamp);
}

export function agentRunDuration(startedAt: number, completedAt: number): string {
  const seconds = Math.max(0, Math.round((completedAt - startedAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
  const hours = Math.floor(minutes / 60);
  const leftoverMinutes = minutes % 60;
  return leftoverMinutes === 0 ? `${hours}h` : `${hours}h ${leftoverMinutes}m`;
}
